from ultralytics import YOLO

model = YOLO("yolo11n.pt")

vehicle_counts = []

results = model.track(
    source="ml/videos/traffic1.mp4",
    stream=True,
    persist=True,
    show=False
)

for result in results:
    
    if result.boxes.id is None:
        vehicle_counts.append(0)
        continue
    
    classes = result.boxes.cls.int().cpu().tolist()
    
    vehicle_count = sum(
        1 for class_id in classes
        if class_id in [2,3,5,7]
    )
    
    vehicle_counts.append(vehicle_count)
    
average_vehicles = sum(vehicle_counts) / len(vehicle_counts)
peak_vehicles = max(vehicle_counts)

if average_vehicles <=5:
    congestion = "LOW"
elif average_vehicles <=10:
    congestion = "MEDIUM"
else:
    congestion ="HIGH"
    
print("\n==== TrafficIQ Density Analysis ====")
print(f"Average Vehicles/Frame: {average_vehicles:.2f}")
print(f"Peak Vehicles in Frame: {peak_vehicles}")
print(f"Congestion Level: {congestion}")
print("========================================================")