
import sqlite3
import json
import os
import shutil

db_path = "/Users/nicodemus/Library/Application Support/Antigravity/User/globalStorage/state.vscdb"
backup_path = db_path + ".bak"
api_key = "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"

# Backup
if not os.path.exists(backup_path):
    shutil.copy2(db_path, backup_path)
    print(f"Backed up DB to {backup_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    key = "saoudrizwan.claude-dev"
    cursor.execute("SELECT value FROM ItemTable WHERE key=?", (key,))
    row = cursor.fetchone()

    if row:
        data = json.loads(row[0])
        print("Current config found.")
        
        # Modify configuration
        data["apiProvider"] = "openrouter" # Legacy/Global fallback
        data["openRouterApiKey"] = api_key
        
        # Act Mode
        data["actModeApiProvider"] = "openrouter"
        data["actModeOpenRouterModelId"] = "zhipu/glm-4.7"
        
        # Plan Mode
        data["planModeApiProvider"] = "openrouter" 
        data["planModeOpenRouterModelId"] = "zhipu/glm-4.7"
        
        # Ensure OpenAI header doesn't conflict
        if "openAiHeaders" not in data:
            data["openAiHeaders"] = {}

        new_value = json.dumps(data)
        
        cursor.execute("UPDATE ItemTable SET value=? WHERE key=?", (new_value, key))
        conn.commit()
        print("Configuration updated successfully in DB.")
        
    else:
        print("Key not found in DB.")

    conn.close()

except Exception as e:
    print(f"Error: {e}")
