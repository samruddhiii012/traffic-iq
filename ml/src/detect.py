from ultralytics import YOLO
import sqlite3

model = YOLO("yolo11n.pt")

connection = sqlite3.connect("traffic.db")
cursor = connection.cursor()

vehicle_ids = {
    "car": set(),
    "motorcycle": set(),
    "bus": set(),
    "truck": set()
}

vehicle_counts_per_frame = []

results = model.track(
    source="ml/videos/traffic1.mp4",
    stream=True,
    persist=True,
    save=True,
    show=False,
    project="ml/output",
    name="traffic",
    exist_ok=True
)

for result in results:
    
    if result.boxes.id is None:
        vehicle_counts_per_frame.append(0)
        continue
    
    track_ids = result.boxes.id.int().cpu().tolist()
    classes = result.boxes.cls.int().cpu().tolist()
    
    frame_vehicle_count = 0
    
    for track_id, class_id in zip(track_ids, classes):
        
        if class_id == 2:
            vehicle_ids["car"].add(track_id)
            frame_vehicle_count +=1
        
        elif class_id == 3:
            vehicle_ids["motorcycle"].add(track_id)
            frame_vehicle_count +=1
            
        elif class_id == 5:
            vehicle_ids["bus"].add(track_id)
            frame_vehicle_count +=1
            
        elif class_id == 7:
            vehicle_ids["truck"].add(track_id)
            frame_vehicle_count +=1
            
    vehicle_counts_per_frame.append(frame_vehicle_count)
            
            
print("\n==== TrafficIQ Vehicle Count ====")

print("Cars:", len(vehicle_ids["car"]))
print("Motorcycles:", len(vehicle_ids["motorcycle"]))
print("Buses:", len(vehicle_ids["bus"]))
print("Trucks:", len(vehicle_ids["truck"]))

total = sum(len(ids) for ids in vehicle_ids.values())

average_vehicles = sum(vehicle_counts_per_frame) / len(vehicle_counts_per_frame)

peak_vehicles = max(vehicle_counts_per_frame)

if average_vehicles <=5:
    congestion = "LOW"
    
elif average_vehicles <=10:
    congestion = "MEDIUM"
    
else: 
    congestion = "HIGH"
    
print("Total Vehicles:", total)
print("Avreage Vehicles/Frame:", round(average_vehicles, 2))
print("Peak Vehicles in Frame:", peak_vehicles)
print("Congestion Level:", congestion)

cursor.execute("""
                INSERT INTO traffic_data
                (cars, motorcycles, buses, trucks, total_vehicles,
                average_vehicles, peak_vehicles, congestion)
                VALUES (?,?,?,?,?,?,?,?)
                """, (
                    len(vehicle_ids["car"]),
                    len(vehicle_ids["motorcycle"]),
                    len(vehicle_ids["bus"]),
                    len(vehicle_ids["truck"]),
                    total,
                    average_vehicles,
                    peak_vehicles,
                    congestion
                ))

connection.commit()
connection.close()

print("Traffic data saved to database!")
print("=============================================")
        