import pandas as pd
from datetime import datetime

class GridAnalyzer:
    
    @staticmethod
    def get_cheapest_hours(df, n=5):
        """
        Identifies the N cheapest hours in the dataframe.
        Expects df to have 'time' and 'value' columns.
        """
        if df.empty:
            return []
            
        sorted_df = df.sort_values(by='value', ascending=True)
        cheapest = sorted_df.head(n)
        
        result = []
        for _, row in cheapest.iterrows():
            result.append({
                'time': row['time'].strftime("%H:%M"),
                'price': row['value']
            })
            
        # Sort by time for display? or price? Let's keep price order (cheapest first)
        return result

    @staticmethod
    def check_alerts(df, price_threshold=100.0, generation_drop_threshold=0.2):
        """
        Simple monitoring logic.
        """
        alerts = []
        
        # Check High Prices
        high_prices = df[df['value'] > price_threshold]
        if not high_prices.empty:
            max_p = high_prices['value'].max()
            alerts.append(f"⚠️ HIGH PRICE ALERT: {max_p} €/MWh detected!")

        return alerts
