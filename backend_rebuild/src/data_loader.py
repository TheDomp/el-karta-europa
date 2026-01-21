import os
import requests
import pandas as pd
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

class EntsoeLoader:
    BASE_URL = "https://web-api.transparency.entsoe.eu/api"
    
    # EIC Codes for Swedish Zones
    ZONES = {
        'SE1': '10Y1001A1001A44P',
        'SE2': '10Y1001A1001A45N',
        'SE3': '10Y1001A1001A46L',
        'SE4': '10Y1001A1001A47J'
    }

    def __init__(self):
        self.api_key = os.getenv('VITE_ENTSOE_API_KEY')
        if not self.api_key:
            raise ValueError("❌ API Key missing. Set VITE_ENTSOE_API_KEY in .env")

    def map_xml_to_df(self, xml_content):
        """Parses ENTSO-E XML TimeSeries into a DataFrame."""
        try:
            root = ET.fromstring(xml_content)
            # Namespace cleanup usually needed, simple generic parse here
            points = []
            
            for period in root.findall(".//{*}Period"):
                # Extract Start Time
                start_str = period.find(".//{*}timeInterval/{*}start").text
                start_dt = datetime.strptime(start_str, "%Y-%m-%dT%H:%M%Z")
                resolution = period.find(".//{*}resolution").text # PT60M usually
                
                for point in period.findall(".//{*}Point"):
                    pos = int(point.find(".//{*}position").text)
                    price_node = point.find(".//{*}price.amount")
                    
                    if price_node is not None:
                        val = float(price_node.text)
                        # Add hour offset based on position
                        time = start_dt + timedelta(hours=pos-1)
                        points.append({'timestamp': time, 'price': val})
            
            return pd.DataFrame(points)
        except Exception as e:
            print(f"XML Parse Error: {e}")
            return pd.DataFrame()

    def fetch_day_ahead_prices(self, zone):
        """Fetches Day-ahead Prices for a specific zone. Falls back to mock data on connection failure."""
        now = datetime.now()
        start = now.strftime("%Y%m%d0000")
        end = (now + timedelta(days=1)).strftime("%Y%m%d0000")
        
        params = {
            'securityToken': self.api_key,
            'documentType': 'A44',
            'in_Domain': self.ZONES[zone],
            'out_Domain': self.ZONES[zone],
            'periodStart': start,
            'periodEnd': end
        }
        
        try:
            response = requests.get(self.BASE_URL, params=params, timeout=10)
            if response.status_code == 200:
                return self.map_xml_to_df(response.content)
            else:
                print(f"⚠️ API Error {response.status_code}: {response.text}")
                return self._generate_mock_data(now)
        except Exception as e:
            print(f"⚠️ Connection failed ({e}). Using Mock Data for demonstration.")
            return self._generate_mock_data(now)

    def _generate_mock_data(self, date_obj):
        """Generates realistic mock pricing data for demo purposes."""
        data = []
        base_price = 45.0
        import random
        start_of_day = date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
        
        for i in range(24):
            time = start_of_day + timedelta(hours=i)
            # Create a simplified price curve (higher in morning/evening)
            hour_factor = 1.5 if 7 <= i <= 9 or 17 <= i <= 19 else 1.0
            price = base_price * hour_factor + random.uniform(-5, 5)
            data.append({'timestamp': time, 'price': round(price, 2)})
            
        return pd.DataFrame(data)
