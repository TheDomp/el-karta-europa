import os
import requests
import pandas as pd
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

class EntsoeClient:
    BASE_URL = "https://web-api.transparency.entsoe.eu/api"
    
    # Map for Swedish Zones to EIC Codes
    ZONES = {
        'SE1': '10Y1001A1001A44P',
        'SE2': '10Y1001A1001A45N',
        'SE3': '10Y1001A1001A46L',
        'SE4': '10Y1001A1001A47J'
    }

    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv('VITE_ENTSOE_API_KEY')
        if not self.api_key:
            raise ValueError("API Key is missing. Set VITE_ENTSOE_API_KEY in .env")

    def _get_period_str(self, date_obj):
        """Format date for ENTSO-E API (YYYYMMDDHHMM)"""
        start = date_obj.strftime("%Y%m%d0000")
        end = (date_obj + timedelta(days=1)).strftime("%Y%m%d0000")
        return start, end

    def fetch_day_ahead_prices(self, zone_code, date=None):
        """
        Fetch Day-ahead Prices (DocumentType: A44)
        Returns a DataFrame with timestamp and price.
        """
        if date is None:
            date = datetime.now()
            
        start_str, end_str = self._get_period_str(date)
        
        params = {
            'securityToken': self.api_key,
            'documentType': 'A44',
            'in_Domain': zone_code,
            'out_Domain': zone_code,
            'periodStart': start_str,
            'periodEnd': end_str
        }

        response = requests.get(self.BASE_URL, params=params)
        
        if response.status_code != 200:
            print(f"Error fetching data for {zone_code}: {response.text}")
            return None

        return self._parse_xml_timeseries(response.content, value_tag='price.amount')

    def fetch_generation_forecast(self, zone_code, date=None):
        """
        Fetch Aggregated Generation per Type (DocumentType: A75, ProcessType: A01)
        """
        if date is None:
            date = datetime.now()

        start_str, end_str = self._get_period_str(date)

        params = {
            'securityToken': self.api_key,
            'documentType': 'A75',
            'processType': 'A01',  # Day Ahead
            'in_Domain': zone_code,
            'periodStart': start_str,
            'periodEnd': end_str
        }
        
        response = requests.get(self.BASE_URL, params=params)
        if response.status_code != 200:
            return None
            
        # XML Parsing for generation is more complex due to multiple PSR types.
        # This is a simplified placeholder structure.
        return self._parse_xml_timeseries(response.content, value_tag='quantity')

    def _parse_xml_timeseries(self, xml_content, value_tag):
        """
        Helper to parse generic ENTSO-E TimeSeries XML into a Pandas DataFrame
        """
        try:
            root = ET.fromstring(xml_content)
            ns = {'ns': 'urn:iec62325.351:tc57wg16:451-3:publicationdocument:7:0'}
            
            # Remove namespace for easier parsing in simple logic
            # (In production, handle namespaces properly)
            xml_str = xml_content.decode('utf-8')
            # Rudimentary namespace stripping for demo ease
            import re
            xml_str = re.sub(r' xmlns="[^"]+"', '', xml_str, count=1)
            root = ET.fromstring(xml_str)

            data = []
            
            # Iterate Timeseries
            # Structure: TimeSeries -> Period -> Point -> (position, price.amount)
            for ts in root.findall('.//TimeSeries'):
                start_str = ts.find('.//period.timeInterval/start').text
                # start_dt = datetime.strptime(start_str, "%Y-%m-%dT%H:%M%Z") # Timezone handling simplified
                
                start_dt = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) # Fallback/Simple

                for point in ts.findall('.//Point'):
                    position = int(point.find('position').text)
                    val_node = point.find(value_tag)
                    if val_node is not None:
                        val = float(val_node.text)
                        # Construct approx time
                        time = start_dt + timedelta(hours=position-1)
                        data.append({'time': time, 'value': val})

            return pd.DataFrame(data)
            
        except Exception as e:
            print(f"XML Parsing Error: {e}")
            return pd.DataFrame()
