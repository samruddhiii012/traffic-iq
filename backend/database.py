import sqlite3

DATABASE_NAME = "traffic.db"

def create_database():
    connection = sqlite3.connect(DATABASE_NAME)
    
    cursor = connection.cursor()
    
    cursor.execute("""
                    CREATE TABLE IF NOT EXISTS traffic_data (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                        cars INTEGER,
                        motorcycles INTEGER,
                        buses INTEGER,
                        trucks INTEGER,
                        total_vehicles INTEGER,
                        average_vehicles INTEGER,
                        peak_vehicles INTEGER,
                        congestion TEXT
                    )
        """)
    
    connection.commit()
    connection.close()
    
if __name__ == "__main__":
    create_database()
    print("TrafficIQ database created successfully!")