import pandas as pd
import sqlite3
import os

class DatabaseManager:
    DB_PATH = "backend_rebuild/db/grid_history.db"

    def __init__(self):
        self._init_db()

    def _init_db(self):
        """Initialize SQLite database with required tables."""
        conn = sqlite3.connect(self.DB_PATH)
        c = conn.cursor()
        
        # Table: Historical Prices
        c.execute('''
            CREATE TABLE IF NOT EXISTS prices (
                zone TEXT,
                timestamp DATETIME,
                price REAL,
                PRIMARY KEY (zone, timestamp)
            )
        ''')
        
        # Table: Alerts (Market Monitoring)
        c.execute('''
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                zone TEXT,
                message TEXT,
                level TEXT
            )
        ''')
        
        conn.commit()
        conn.close()

    def save_prices(self, zone, df):
        """Saves a DataFrame of prices to the database."""
        if df.empty: return
        
        conn = sqlite3.connect(self.DB_PATH)
        # Ensure correct column names for mapping
        df['zone'] = zone
        df = df[['zone', 'timestamp', 'price']] # Reorder if needed
        
        try:
            df.to_sql('prices', conn, if_exists='append', index=False)
            print(f"💾 Saved {len(df)} rows for {zone} to DB.")
        except sqlite3.IntegrityError:
            print(f"⚠️ Data for {zone} already exists, skipping duplicates.")
        except Exception as e:
            print(f"DB Error: {e}")
        finally:
            conn.close()

    def log_alert(self, zone, message, level="WARNING"):
        conn = sqlite3.connect(self.DB_PATH)
        c = conn.cursor()
        c.execute("INSERT INTO alerts (zone, message, level) VALUES (?, ?, ?)", (zone, message, level))
        conn.commit()
        conn.close()
        print(f"🚨 ALERT LOGGED: {message}")
