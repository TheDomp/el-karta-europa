import sys
import os
import pandas as pd

# Ensure src is in path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.data_loader import EntsoeLoader
from src.database import DatabaseManager
from src.analysis import SmartGridAnalyzer
from src.map_visualization import EllevioMapGenerator

def main():
    print("\n--- ⚡️ STARTING GRIDWATCH BACKEND (Ellevio Style) ⚡️ ---\n")

    # 1. Init Components
    try:
        loader = EntsoeLoader()
        db = DatabaseManager()
        map_gen = EllevioMapGenerator("src/assets/data/zones.json") # Pointing to existing asset
        print("✅ System initialized.")
    except Exception as e:
        print(f"❌ Init failed: {e}")
        return

    # 2. Process Zones
    zones = ['SE1', 'SE2', 'SE3', 'SE4']
    current_prices = {}

    for zone in zones:
        print(f"\n📡 Bearbetar zon {zone}...")
        
        # A. Fetch Data
        df = loader.fetch_day_ahead_prices(zone)
        
        if df is not None and not df.empty:
            # B. Save History
            db.save_prices(zone, df)
            
            # C. Capture current price (simplified: average or first for demo map)
            avg_price = df['price'].mean()
            current_prices[zone] = avg_price
            
            # D. Smart Analysis
            cheapest = SmartGridAnalyzer.find_cheapest_hours(df)
            print(f"   📉 Billigaste timmarna imorgon ({zone}):")
            for _, row in cheapest.iterrows():
                print(f"      🕒 {row['timestamp'].strftime('%H:%M')} - {row['price']:.2f} €")
                
            # E. Alerts
            alerts = SmartGridAnalyzer.check_market_alerts(df, zone, db)
            if alerts:
                 print(f"   🚨 {alerts[0]}")
        else:
            print("   ⚠️ Ingen data mottagen.")
            current_prices[zone] = 0 # Fallback

    # 3. Generate Map
    print("\n🗺️ Genererar interaktiv karta...")
    m = map_gen.generate_map(current_prices)
    
    if m:
        output_file = "elpriser_karta.html"
        m.save(output_file)
        print(f"✅ Karta sparad som '{output_file}'. Öppna denna i din webbläsare.")

if __name__ == "__main__":
    main()
