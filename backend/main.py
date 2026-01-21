import sys
import os
import map_setup # Setup paths

from src.energy_client import EntsoeClient
from src.visualizer import EnergyVisualizer
from src.analyzer import GridAnalyzer

def main():
    print("--- ⚡️ GridWatch Automation Backend ⚡️ ---")
    
    # 1. Initialize Client
    try:
        client = EntsoeClient()
        print("✅ Client initialized with API Key.")
    except Exception as e:
        print(f"❌ {e}")
        return

    # 2. Fetch Data (Example: SE3 Stockholm)
    zone = 'SE3'
    print(f"\n📡 Fetching data for {zone}...")
    df_prices = client.fetch_day_ahead_prices(client.ZONES[zone])
    
    if df_prices is not None and not df_prices.empty:
        curr_price = df_prices.iloc[-1]['value']  # Mock 'current', ideally find current hour
        print(f"   Current Price Estimation: {curr_price} €/MWh")
        
        # 3. Analyze: Find Cheapest Hours
        cheapest = GridAnalyzer.get_cheapest_hours(df_prices)
        print("\n📉 Smart Control - Cheapest Hours:")
        for h in cheapest:
            print(f"   🕒 {h['time']} : {h['price']} €")

        # 4. Monitor: Check Alerts
        alerts = GridAnalyzer.check_alerts(df_prices, price_threshold=80.0) # Lower threshold for demo
        if alerts:
            print("\n🚨 ALERTS:")
            for a in alerts:
                print(f"   {a}")
                
        # 5. Visualize: Generate Map (Mocking multi-zone data for map)
        # In a real loop, we would fetch SE1-SE4
        print("\n🗺️ Generating Price Map...")
        
        # Mocking values for the other zones for visualization demo
        mock_map_data = {
            'SE1': 42.5,
            'SE2': 42.5, 
            'SE3': curr_price,
            'SE4': curr_price + 10.0
        }
        
        viz = EnergyVisualizer('src/assets/data/zones.json')
        m = viz.create_price_map(mock_map_data)
        out_path = "backend/notebooks/price_map.html"
        m.save(out_path)
        print(f"✅ Map saved to: {out_path}")
        
    else:
        print("⚠️ No data received.")

if __name__ == "__main__":
    main()
