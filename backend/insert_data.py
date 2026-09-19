import sqlite3

connection = sqlite3.connect("traffic.db")
cursor = connection.cursor()

cursor.execute("""
                INSERT INTO traffic_data
                (cars, motorcycles, buses, trucks, total_vehicles,
                average_vehicles, peak_vehicles, congestion)
                VALUES (?,?,?,?,?,?,?,?)
                """, (14, 1, 2, 1, 18, 9.59, 12, "MEDIUM"))

connection.commit()
connection.close()

print("Traffic data inserted successfully!")
