import pandas as pd

class SmartGridAnalyzer:
    
    @staticmethod
    def find_cheapest_hours(df, n=5):
        """Returns the N cheapest hours from the dataset."""
        if df.empty: return []
        return df.sort_values(by='price').head(n)

    @staticmethod
    def check_market_alerts(df, zone, db_logger=None, price_threshold=100.0):
        """Checks for high prices and logs alerts."""
        if df.empty: return []
        
        alerts = []
        high_price_hours = df[df['price'] > price_threshold]
        
        if not high_price_hours.empty:
            max_price = high_price_hours['price'].max()
            msg = f"Högprisvarning i {zone}: {max_price} €/MWh"
            alerts.append(msg)
            
            if db_logger:
                db_logger.log_alert(zone, msg, "HIGH_PRICE")
        
        return alerts
