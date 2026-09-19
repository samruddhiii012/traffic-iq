from pathlib import Path

from PIL import Image
from ultralytics import YOLO

# =========================================================
# PROJECT DIRECTORIES
# =========================================================


BASE_DIR = Path(__file__).resolve().parent.parent

UPLOAD_DIR = BASE_DIR / "uploads"
PROCESSED_DIR = BASE_DIR / "processed"

UPLOAD_DIR.mkdir(exist_ok=True)
PROCESSED_DIR.mkdir(exist_ok=True)

# =========================================================
# YOLO MODEL
# =========================================================

model = YOLO(str(BASE_DIR / "yolo11n.pt"))

# =========================================================
# VEHICLE CLASSES
# =========================================================


VEHICLE_CLASSES = {
    2: "cars",
    3: "motorcycles",
    5: "buses",
    7: "trucks",
}

# =========================================================
# CONGESTION
# =========================================================


def get_congestion(value):
    if value <= 5:
        return "LOW"
    
    elif value <= 10:
        return "MEDIUM"
    
    return "HIGH"

# =========================================================
# EXIF GPS HELPERS
# =========================================================

def convert_to_degrees(value):
    """
    Convert EXIF GPS coordinates from
    degrees/minutes/seconds to decimal degrees.
    """
    
    degrees = float(value[0])
    minutes = float(value[1])
    seconds = float(value[2])
    
    return degrees + (minutes / 60) + (seconds / 3600)

def get_exif_gps(image_path: Path):
    """
    Read GPS coordinates from image EXIF metadata.
    
    Returns:
        {
            "latitude": float,
            "longitude": float
        }
        
    or None if GPS information is unavailable.
    """
    
    try:
        image = Image.open(image_path)
        
        exif = image.getexif()
        
        if not exif:
            return None
        
        gps_info = exif.get(34853)
        
        if not gps_info:
            return None
        
        latitude = gps_info.get(2)
        latitude_ref = gps_info.get(1)
        
        longitude = gps_info.get(4)
        longitude_ref = gps_info.get(3)
        
        if not latitude or not longitude:
            return None
        
        latitude_decimal = convert_to_degrees(latitude)
        longitude_decimal = convert_to_degrees(longitude)
        
        if latitude_ref == "S":
            latitude_decimal = -latitude_decimal
            
        if longitude_ref == "W":
            longitude_decimal = -longitude_decimal
            
        return {
            "latitude": latitude_decimal,
            "longitude": longitude_decimal,
        }
        
    except Exception as error:
        print("EXIF GPS error:", error)
        return None
    
# =========================================================
# IMAGE PROCESSING
# =========================================================
    

def process_image(input_path: Path):
    
    output_dir = PROCESSED_DIR / input_path.stem
    
    results = model.predict(
        source=str(input_path),
        save=True,
        project=str(PROCESSED_DIR),
        name=input_path.stem,
        exist_ok=True,
        verbose=False,
    )
    
    result = results[0]
    
    counts = {
        "cars": 0,
        "motorcycles": 0,
        "buses": 0,
        "trucks": 0,
    }
    
    # -----------------------------------------------------
    # COUNT VEHICLES
    # -----------------------------------------------------
    
    if result.boxes is not None and result.boxes.cls is not None:
        
        classes = result.boxes.cls.int().cpu().tolist()
        
        for class_id in classes:
            
            if class_id in VEHICLE_CLASSES:
                counts[VEHICLE_CLASSES[class_id]] += 1
                
    total = sum(counts.values())
    
    # No traffic vehicles
    if total == 0:
        return None

    
    # -----------------------------------------------------
    # FIND PROCESSED IMAGE
    # -----------------------------------------------------
    
    processed_image = None
    
    if output_dir.exists():
    
        for output_file in output_dir.iterdir():
        
            if output_file.suffix.lower() in {
                ".jpg",
                ".jpeg",
                ".png",
            }:
        
                processed_image = output_file
                break
    
    if processed_image is None:
        return None
    
    # -----------------------------------------------------
    # EXIF GPS
    # -----------------------------------------------------
    
    gps = get_exif_gps(input_path)
    
    latitude = None
    longitude = None
    
    if gps:
        
        latitude = gps["latitude"]
        longitude = gps["logitude"]
        
    # -----------------------------------------------------
    # RETURN RESULT
    # -----------------------------------------------------
    
    return {
        **counts,
        "total_vehicles": total,
        "average_vehicles": float(total),
        "peak_vehicles": total,
        "congestion": get_congestion(total),
        "output_path": processed_image,
        "media_type": "image",
        "latitude": latitude,
        "longitude": longitude,
        "has_exif_gps": gps is not None,
    }
    
# =========================================================
# VIDEO PROCESSING
# =========================================================
    

def process_video(input_path: Path):
    vehicle_ids = {
        "cars": set(),
        "motorcycles": set(),
        "buses": set(),
        "trucks": set(),
    }
    
    vehicle_counts_per_frame = []
    
    output_dir = PROCESSED_DIR / input_path.stem
    
    results = model.track(
        source=str(input_path),
        stream=True,
        persist=True,
        save=True,
        project=str(PROCESSED_DIR),
        name=input_path.stem,
        exist_ok=True,
        show=False,
        verbose=False,
    )
    
    # -----------------------------------------------------
    # PROCESS EACH FRAME
    # -----------------------------------------------------
    
    for result in results:
        
        frame_count = 0
        
        if result.boxes is None or result.boxes.id is None:
            vehicle_counts_per_frame.append(0)
            continue
        
        track_ids = result.boxes.id.int().cpu().tolist()
        classes = result.boxes.cls.int().cpu().tolist()
        
        for track_id, class_id in zip(track_ids, classes):
            
            if class_id == 2:
                vehicle_ids["cars"].add(track_id)
                frame_count += 1
                
            elif class_id == 3:
                vehicle_ids["motorcycles"].add(track_id)
                frame_count += 1
                
            elif class_id == 5:
                vehicle_ids["buses"].add(track_id)
                frame_count += 1
                
            elif class_id == 7:
                vehicle_ids["trucks"].add(track_id)
                frame_count += 1
                
        
        vehicle_counts_per_frame.append(frame_count)
        
    # -----------------------------------------------------
    # FINAL VEHICLE COUNTS
    # -----------------------------------------------------   
    counts = {
        "cars": len(vehicle_ids["cars"]),
        "motorcycles": len(vehicle_ids["motorcycles"]),
        "buses": len(vehicle_ids["buses"]),
        "trucks": len(vehicle_ids["trucks"]),
    }
    
    total = sum(counts.values())
    
    # No traffic vehicles
    if total == 0:
        return None
    
    # -----------------------------------------------------
    # AVERAGE + PEAK
    # -----------------------------------------------------
    
    average = (
        sum(vehicle_counts_per_frame) / len(vehicle_counts_per_frame)
        if vehicle_counts_per_frame
        else 0
    )
    
    peak = (max(vehicle_counts_per_frame) if vehicle_counts_per_frame else 0
    )
    
    # -----------------------------------------------------
    # FIND PROCESSED VIDEO
    # -----------------------------------------------------
    
    processed_video =None
    
    if output_dir.exists():
    
        for output_file in output_dir.iterdir():
        
            if output_file.suffix.lower() in {
                ".mp4",
                ".avi",
                ".mov",
                ".mkv",
            }:
                processed_video = output_file
                break
        
    if processed_video is None:
        return None
    
    # -----------------------------------------------------
    # RETURN RESULT
    # -----------------------------------------------------
    return {
        **counts,
        "total_vehicles": total,
        "average_vehicles": average,
        "peak_vehicles": peak,
        "congestion": get_congestion(average),
        "output_path": processed_video,
        "media_type": "video",
        "latitude": None,
        "longitude": None,
        "has_exif_gps": False,
    }

def get_congestion(value):
    if value <= 5:
        return "LOW"
    elif value <= 10:
        return "MEDIUM"
    return "HIGH"
