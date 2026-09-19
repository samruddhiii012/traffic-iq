from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException,
    Form,
    Depends,
)
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from datetime import datetime, timedelta, timezone

from fastapi.security import (
    HTTPBearer,
    HTTPAuthorizationCredentials,
)

import jwt
import bcrypt
import os

import sqlite3
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import json

from math import radians, sin, cos, sqrt, atan2

from pydantic import BaseModel, Field

from traffic_processor import (
    UPLOAD_DIR,
    PROCESSED_DIR,
    process_image,
    process_video,
)


# =========================================================
# APP
# =========================================================

app = FastAPI(title="TrafficIQ API")


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# DATABASE
# =========================================================

DATABASE_NAME = os.getenv(
    "DATABASE_PATH",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "traffic.db")
)


def get_db_connection():
    connection = sqlite3.connect(
        DATABASE_NAME,
        timeout=30,
    )

    connection.execute(
        "PRAGMA foreign_keys = ON"
    )

    # -----------------------------------------------------
    # ENSURE TRAFFIC DATA TABLE EXISTS
    # -----------------------------------------------------

    connection.execute("""
        CREATE TABLE IF NOT EXISTS traffic_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            cars INTEGER NOT NULL DEFAULT 0,
            motorcycles INTEGER NOT NULL DEFAULT 0,
            buses INTEGER NOT NULL DEFAULT 0,
            trucks INTEGER NOT NULL DEFAULT 0,
            total_vehicles INTEGER NOT NULL DEFAULT 0,
            average_vehicles REAL NOT NULL DEFAULT 0,
            peak_vehicles INTEGER NOT NULL DEFAULT 0,
            congestion TEXT NOT NULL DEFAULT 'LOW',
            location TEXT,
            location_source TEXT,
            latitude REAL,
            longitude REAL,
            user_id INTEGER
        )
    """)

    # -----------------------------------------------------
    # MIGRATION FOR OLD DATABASE
    # -----------------------------------------------------

    columns = connection.execute(
        "PRAGMA table_info(traffic_data)"
    ).fetchall()

    column_names = {
        column[1]
        for column in columns
    }

    if "user_id" not in column_names:
        connection.execute("""
            ALTER TABLE traffic_data
            ADD COLUMN user_id INTEGER
        """)

    connection.commit()

    return connection


# =========================================================
# USERS TABLE
# =========================================================

def create_users_table():

    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    connection.commit()
    connection.close()


# =========================================================
# TRAFFIC DATA TABLE
# =========================================================

def create_traffic_data_table():

    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS traffic_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            cars INTEGER NOT NULL DEFAULT 0,
            motorcycles INTEGER NOT NULL DEFAULT 0,
            buses INTEGER NOT NULL DEFAULT 0,
            trucks INTEGER NOT NULL DEFAULT 0,
            total_vehicles INTEGER NOT NULL DEFAULT 0,
            average_vehicles REAL NOT NULL DEFAULT 0,
            peak_vehicles INTEGER NOT NULL DEFAULT 0,
            congestion TEXT NOT NULL DEFAULT 'LOW',
            location TEXT,
            location_source TEXT,
            latitude REAL,
            longitude REAL,
            user_id INTEGER
        )
    """)

    # -----------------------------------------------------
    # Existing database migration:
    # Add user_id if an older traffic_data table exists.
    # -----------------------------------------------------

    cursor.execute(
        "PRAGMA table_info(traffic_data)"
    )

    columns = {
        row[1]
        for row in cursor.fetchall()
    }

    if "user_id" not in columns:

        cursor.execute("""
            ALTER TABLE traffic_data
            ADD COLUMN user_id INTEGER
        """)

    connection.commit()
    connection.close()


# =========================================================
# COMMUNITY TABLES
# =========================================================

def create_community_tables():

    connection = get_db_connection()
    cursor = connection.cursor()

    # -----------------------------------------------------
    # TRAFFIC REPORTS
    # -----------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS traffic_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            category TEXT NOT NULL,
            description TEXT NOT NULL,
            location TEXT NOT NULL,
            latitude REAL,
            longitude REAL,
            suggested_route TEXT,
            severity TEXT NOT NULL DEFAULT 'MEDIUM',
            status TEXT NOT NULL DEFAULT 'ACTIVE',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # -----------------------------------------------------
    # REPORT CONFIRMATIONS
    # -----------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS report_confirmations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(report_id, user_id)
        )
    """)

    # -----------------------------------------------------
    # REPORT COMMENTS
    # -----------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS report_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            comment TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    connection.commit()
    connection.close()


# =========================================================
# INITIALIZE DATABASE TABLES
# =========================================================

try:
    create_users_table()
    create_traffic_data_table()
    create_community_tables()
    print("✅ Database tables initialized successfully")
except Exception as e:
    print(f"❌ Database initialization failed: {e}")

# =========================================================
# JWT SETTINGS
# =========================================================

JWT_SECRET_KEY = (
    "trafficiq-super-secret-key-change-later"
)

JWT_ALGORITHM = "HS256"

JWT_EXPIRATION_MINUTES = 21600


# =========================================================
# AUTHENTICATION
# =========================================================

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        security
    )
):

    token = credentials.credentials

    try:

        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )

        user_id = payload.get("sub")
        email = payload.get("email")
        name = payload.get("name")

        if not user_id or not email:

            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token.",
            )

        return {
            "id": int(user_id),
            "email": email,
            "name": name,
        }

    except jwt.ExpiredSignatureError:

        raise HTTPException(
            status_code=401,
            detail="Authentication token has expired.",
        )

    except jwt.InvalidTokenError:

        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token.",
        )


# =========================================================
# HOME
# =========================================================

@app.get("/")
def home():

    return {
        "project": "TrafficIQ",
        "status": "Backend is running.",
    }


# =========================================================
# AUTH TEST
# =========================================================

@app.get("/auth/me")
def auth_me(
    current_user: dict = Depends(
        get_current_user
    ),
):

    return {
        "message": "Authentication successful.",
        "user": current_user,
    }


# =========================================================
# SIGNUP MODEL
# =========================================================

class SignupRequest(BaseModel):

    name: str
    email: str
    password: str


# =========================================================
# SIGNUP
# =========================================================

@app.post("/signup")
def signup(
    user: SignupRequest
):

    name = user.name.strip()
    email = user.email.strip().lower()
    password = user.password

    # -----------------------------------------------------
    # VALIDATION
    # -----------------------------------------------------

    if not name:

        raise HTTPException(
            status_code=400,
            detail="Name is required.",
        )

    if not email:

        raise HTTPException(
            status_code=400,
            detail="Email is required.",
        )

    if len(password) < 6:

        raise HTTPException(
            status_code=400,
            detail=(
                "Password must be at least 6 characters."
            ),
        )

    # -----------------------------------------------------
    # BCRYPT PASSWORD LIMIT
    # -----------------------------------------------------

    password_bytes = password.encode(
        "utf-8"
    )

    if len(password_bytes) > 72:

        raise HTTPException(
            status_code=400,
            detail=(
                "Password must be 72 bytes or fewer."
            ),
        )

    # -----------------------------------------------------
    # DATABASE
    # -----------------------------------------------------

    connection = get_db_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT id
            FROM users
            WHERE email = ?
            """,
            (email,),
        )

        existing_user = cursor.fetchone()

        if existing_user:

            raise HTTPException(
                status_code=400,
                detail=(
                    "An account with this email "
                    "already exists."
                ),
            )

        # -------------------------------------------------
        # HASH PASSWORD
        # -------------------------------------------------

        password_hash = bcrypt.hashpw(
            password_bytes,
            bcrypt.gensalt(),
        ).decode("utf-8")

        # -------------------------------------------------
        # CREATE USER
        # -------------------------------------------------

        cursor.execute(
            """
            INSERT INTO users
            (
                name,
                email,
                password_hash
            )
            VALUES (?, ?, ?)
            """,
            (
                name,
                email,
                password_hash,
            ),
        )

        user_id = cursor.lastrowid

        connection.commit()

        return {
            "message": (
                "Account created successfully."
            ),
            "user": {
                "id": user_id,
                "name": name,
                "email": email,
            },
        }

    except HTTPException:

        connection.rollback()
        raise

    except sqlite3.IntegrityError:

        connection.rollback()

        raise HTTPException(
            status_code=400,
            detail=(
                "An account with this email "
                "already exists."
            ),
        )

    except Exception as error:

        connection.rollback()

        print(
            "Signup error:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to create account."
            ),
        )

    finally:

        connection.close()


# =========================================================
# LOGIN MODEL
# =========================================================

class LoginRequest(BaseModel):

    email: str
    password: str


# =========================================================
# LOGIN
# =========================================================

@app.post("/login")
def login(
    user: LoginRequest
):

    email = user.email.strip().lower()
    password = user.password

    # -----------------------------------------------------
    # VALIDATION
    # -----------------------------------------------------

    if not email:

        raise HTTPException(
            status_code=400,
            detail="Email is required.",
        )

    if not password:

        raise HTTPException(
            status_code=400,
            detail="Password is required.",
        )

    password_bytes = password.encode(
        "utf-8"
    )

    if len(password_bytes) > 72:

        raise HTTPException(
            status_code=400,
            detail=(
                "Password must be 72 bytes or fewer."
            ),
        )

    # -----------------------------------------------------
    # FIND USER
    # -----------------------------------------------------

    connection = get_db_connection()
    cursor = connection.cursor()

    try:

        cursor.execute("""
            SELECT
                id,
                name,
                email,
                password_hash
            FROM users
            WHERE email = ?
        """, (email,))

        db_user = cursor.fetchone()

    finally:

        connection.close()

    if db_user is None:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    user_id, name, db_email, password_hash = db_user

    # -----------------------------------------------------
    # VERIFY PASSWORD
    # -----------------------------------------------------

    try:

        password_valid = bcrypt.checkpw(
            password_bytes,
            password_hash.encode("utf-8"),
        )

    except Exception as error:

        print(
            "Password verification error:",
            error,
        )

        password_valid = False

    if not password_valid:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    # -----------------------------------------------------
    # CREATE JWT
    # -----------------------------------------------------

    token_expiration = (
        datetime.now(timezone.utc)
        + timedelta(
            minutes=JWT_EXPIRATION_MINUTES
        )
    )

    token_payload = {
        "sub": str(user_id),
        "email": db_email,
        "name": name,
        "exp": token_expiration,
    }

    access_token = jwt.encode(
        token_payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )

    return {
        "message": "Login successful.",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "name": name,
            "email": db_email,
        },
    }


# =========================================================
# COMMUNITY MODELS
# =========================================================

class TrafficReportRequest(BaseModel):

    category: str

    description: str = Field(
        min_length=5,
        max_length=500,
    )

    location: str = Field(
        min_length=2,
        max_length=200,
    )

    latitude: float | None = None
    longitude: float | None = None

    suggested_route: str | None = Field(
        default=None,
        max_length=300,
    )

    severity: str = "MEDIUM"


class TrafficCommentRequest(BaseModel):

    comment: str = Field(
        min_length=1,
        max_length=300,
    )


# =========================================================
# COMMUNITY VALIDATION
# =========================================================

ALLOWED_REPORT_CATEGORIES = {
    "Heavy Traffic",
    "Road Blocked",
    "Accident / Crash",
    "Signal Issue",
    "Traffic Diversion",
    "Lane Closure",
    "Vehicle Breakdown",
    "Route Suggestion",
}

ALLOWED_SEVERITY = {
    "LOW",
    "MEDIUM",
    "HIGH",
}


# =========================================================
# COMMUNITY - VIEW REPORTS
# =========================================================

@app.get("/community/reports")
def get_community_reports():

    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            r.id,
            r.category,
            r.description,
            r.location,
            r.latitude,
            r.longitude,
            r.suggested_route,
            r.severity,
            r.status,
            r.created_at,
            u.name,
            (
                SELECT COUNT(*)
                FROM report_confirmations rc
                WHERE rc.report_id = r.id
            ) AS confirmations,
            (
                SELECT COUNT(*)
                FROM report_comments c
                WHERE c.report_id = r.id
            ) AS comments
        FROM traffic_reports r
        JOIN users u
            ON u.id = r.user_id
        ORDER BY r.id DESC
        LIMIT 50
    """)

    rows = cursor.fetchall()
    connection.close()

    reports = []

    for data in rows:

        reports.append({
            "id": data[0],
            "category": data[1],
            "description": data[2],
            "location": data[3],
            "latitude": data[4],
            "longitude": data[5],
            "suggested_route": data[6],
            "severity": data[7],
            "status": data[8],
            "created_at": data[9],
            "reported_by": data[10],
            "confirmations": data[11],
            "comments": data[12],
        })

    return {
        "count": len(reports),
        "reports": reports,
    }


# =========================================================
# COMMUNITY - CREATE REPORT
# =========================================================

@app.post("/community/reports")
def create_community_report(
    report: TrafficReportRequest,
    current_user: dict = Depends(
        get_current_user
    ),
):

    category = report.category.strip()
    severity = report.severity.strip().upper()

    if category not in ALLOWED_REPORT_CATEGORIES:

        raise HTTPException(
            status_code=400,
            detail="Invalid traffic report category.",
        )

    if severity not in ALLOWED_SEVERITY:

        raise HTTPException(
            status_code=400,
            detail="Invalid report severity.",
        )

    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO traffic_reports
        (
            user_id,
            category,
            description,
            location,
            latitude,
            longitude,
            suggested_route,
            severity,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        current_user["id"],
        category,
        report.description.strip(),
        report.location.strip(),
        report.latitude,
        report.longitude,
        (
            report.suggested_route.strip()
            if report.suggested_route
            else None
        ),
        severity,
        "ACTIVE",
    ))

    connection.commit()

    report_id = cursor.lastrowid

    connection.close()

    return {
        "message": (
            "Traffic report created successfully."
        ),
        "report_id": report_id,
    }


# =========================================================
# COMMUNITY - CONFIRM REPORT
# =========================================================

@app.post(
    "/community/reports/{report_id}/confirm"
)
def confirm_report(
    report_id: int,
    current_user: dict = Depends(
        get_current_user
    ),
):

    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT id
        FROM traffic_reports
        WHERE id = ?
        """,
        (report_id,),
    )

    report_exists = cursor.fetchone()

    if report_exists is None:

        connection.close()

        raise HTTPException(
            status_code=404,
            detail="Traffic report not found.",
        )

    try:

        cursor.execute("""
            INSERT INTO report_confirmations
            (
                report_id,
                user_id
            )
            VALUES (?, ?)
        """, (
            report_id,
            current_user["id"],
        ))

        connection.commit()

        message = "Report confirmed."

    except sqlite3.IntegrityError:

        message = (
            "You have already confirmed this report."
        )

    connection.close()

    return {
        "message": message,
    }


# =========================================================
# COMMUNITY - GET COMMENTS
# =========================================================

@app.get(
    "/community/reports/{report_id}/comments"
)
def get_report_comments(
    report_id: int
):

    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT
            c.id,
            c.comment,
            c.created_at,
            u.name
        FROM report_comments c
        JOIN users u
            ON u.id = c.user_id
        WHERE c.report_id = ?
        ORDER BY c.id ASC
        """,
        (report_id,),
    )

    rows = cursor.fetchall()

    connection.close()

    comments = []

    for data in rows:

        comments.append({
            "id": data[0],
            "comment": data[1],
            "created_at": data[2],
            "user": data[3],
        })

    return {
        "count": len(comments),
        "comments": comments,
    }


# =========================================================
# COMMUNITY - ADD COMMENT
# =========================================================

@app.post(
    "/community/reports/{report_id}/comments"
)
def add_report_comment(
    report_id: int,
    comment_data: TrafficCommentRequest,
    current_user: dict = Depends(
        get_current_user
    ),
):

    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT id
        FROM traffic_reports
        WHERE id = ?
        """,
        (report_id,),
    )

    report_exists = cursor.fetchone()

    if report_exists is None:

        connection.close()

        raise HTTPException(
            status_code=404,
            detail="Traffic report not found.",
        )

    cursor.execute("""
        INSERT INTO report_comments
        (
            report_id,
            user_id,
            comment
        )
        VALUES (?, ?, ?)
    """, (
        report_id,
        current_user["id"],
        comment_data.comment.strip(),
    ))

    connection.commit()

    comment_id = cursor.lastrowid

    connection.close()

    return {
        "message": "Comment added successfully.",
        "comment_id": comment_id,
    }


# =========================================================
# COMMUNITY - RESOLVE REPORT
# =========================================================

@app.post(
    "/community/reports/{report_id}/resolve"
)
def resolve_report(
    report_id: int,
    current_user: dict = Depends(
        get_current_user
    ),
):

    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT user_id
        FROM traffic_reports
        WHERE id = ?
    """, (report_id,))

    report = cursor.fetchone()

    if report is None:

        connection.close()

        raise HTTPException(
            status_code=404,
            detail="Traffic report not found.",
        )

    if report[0] != current_user["id"]:

        connection.close()

        raise HTTPException(
            status_code=403,
            detail=(
                "Only the report creator can "
                "resolve this report."
            ),
        )

    cursor.execute("""
        UPDATE traffic_reports
        SET status = 'RESOLVED'
        WHERE id = ?
    """, (report_id,))

    connection.commit()
    connection.close()

    return {
        "message": (
            "Traffic report marked as resolved."
        ),
    }


# =========================================================
# REVERSE GEOCODING
# =========================================================

def reverse_geocode(
    latitude: float,
    longitude: float,
):

    try:

        params = urlencode({
            "lat": latitude,
            "lon": longitude,
            "format": "jsonv2",
            "addressdetails": 1,
            "zoom": 14,
            "accept-language": "en",
        })

        url = (
            "https://nominatim.openstreetmap.org/reverse?"
            + params
        )

        request = Request(
            url,
            headers={
                "User-Agent": "TrafficIQ/1.0",
            },
        )

        with urlopen(
            request,
            timeout=10,
        ) as response:

            data = json.loads(
                response.read().decode("utf-8")
            )

        address = data.get(
            "address",
            {}
        )

        neighbourhood = (
            address.get("neighbourhood")
            or address.get("suburb")
            or address.get("town")
            or address.get("village")
        )

        city = (
            address.get("city")
            or address.get("municipality")
            or address.get("county")
        )

        state = address.get("state")

        parts = [
            neighbourhood,
            city,
            state,
        ]

        location_name = ", ".join(
            part
            for part in parts
            if part
        )

        return (
            location_name
            or data.get("display_name")
        )

    except Exception as error:

        print(
            "Reverse geocoding error:",
            error,
        )

        return None


# =========================================================
# LATEST TRAFFIC DATA
# =========================================================

@app.get("/traffic")
def traffic_data():

    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT *
        FROM traffic_data
        ORDER BY id DESC
        LIMIT 1
    """)

    data = cursor.fetchone()

    connection.close()

    if data is None:

        return {
            "message": (
                "No traffic data available"
            )
        }

    return {
        "id": data[0],
        "timestamp": data[1],
        "cars": data[2],
        "motorcycles": data[3],
        "buses": data[4],
        "trucks": data[5],
        "total_vehicles": data[6],
        "average_vehicles": data[7],
        "peak_vehicles": data[8],
        "congestion": data[9],
        "location": (
            data[10]
            if len(data) > 10
            else None
        ),
        "location_source": (
            data[11]
            if len(data) > 11
            else None
        ),
        "latitude": (
            data[12]
            if len(data) > 12
            else None
        ),
        "longitude": (
            data[13]
            if len(data) > 13
            else None
        ),
    }


# =========================================================
# TRAFFIC HISTORY
# =========================================================

@app.get("/traffic/history")
def traffic_history():

    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT *
        FROM traffic_data
        ORDER BY id DESC
        LIMIT 500
    """)

    rows = cursor.fetchall()

    connection.close()

    history = []

    for data in rows:

        history.append({
            "id": data[0],
            "timestamp": data[1],
            "cars": data[2],
            "motorcycles": data[3],
            "buses": data[4],
            "trucks": data[5],
            "total_vehicles": data[6],
            "average_vehicles": data[7],
            "peak_vehicles": data[8],
            "congestion": data[9],
            "location": (
                data[10]
                if len(data) > 10
                else None
            ),
            "location_source": (
                data[11]
                if len(data) > 11
                else None
            ),
            "latitude": (
                data[12]
                if len(data) > 12
                else None
            ),
            "longitude": (
                data[13]
                if len(data) > 13
                else None
            ),
        })

    return {
        "count": len(history),
        "history": history,
    }


# =========================================================
# MY TRAFFIC HISTORY
# =========================================================

@app.get("/my-history")
def my_history(
    current_user: dict = Depends(
        get_current_user
    ),
):

    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            id,
            timestamp,
            cars,
            motorcycles,
            buses,
            trucks,
            total_vehicles,
            average_vehicles,
            peak_vehicles,
            congestion,
            location,
            location_source,
            latitude,
            longitude
        FROM traffic_data
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT 20
    """, (
        current_user["id"],
    ))

    rows = cursor.fetchall()

    connection.close()

    history = []

    for data in rows:

        history.append({
            "id": data[0],
            "timestamp": data[1],
            "cars": data[2],
            "motorcycles": data[3],
            "buses": data[4],
            "trucks": data[5],
            "total_vehicles": data[6],
            "average_vehicles": data[7],
            "peak_vehicles": data[8],
            "congestion": data[9],
            "location": data[10],
            "location_source": data[11],
            "latitude": data[12],
            "longitude": data[13],
        })

    return {
        "count": len(history),
        "history": history,
    }


# =========================================================
# TRAFFIC NEAR ME
# =========================================================

@app.get("/traffic/near-me")
def traffic_near_me(
    latitude: float,
    longitude: float,
):

    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            id,
            timestamp,
            cars,
            motorcycles,
            buses,
            trucks,
            total_vehicles,
            average_vehicles,
            peak_vehicles,
            congestion,
            location,
            location_source,
            latitude,
            longitude
        FROM traffic_data
        WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL
        ORDER BY id DESC
        LIMIT 50
    """)

    rows = cursor.fetchall()

    connection.close()

    if not rows:

        return {
            "found": False,
            "message": (
                "No location-based traffic "
                "data available."
            ),
        }

    def calculate_distance(
        lat1,
        lon1,
        lat2,
        lon2,
    ):

        earth_radius_km = 6371

        lat1 = radians(lat1)
        lon1 = radians(lon1)
        lat2 = radians(lat2)
        lon2 = radians(lon2)

        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = (
            sin(dlat / 2) ** 2
            + cos(lat1)
            * cos(lat2)
            * sin(dlon / 2) ** 2
        )

        c = 2 * atan2(
            sqrt(a),
            sqrt(1 - a),
        )

        return earth_radius_km * c

    nearest_record = None
    nearest_distance = None

    for data in rows:

        record_latitude = data[12]
        record_longitude = data[13]

        distance = calculate_distance(
            latitude,
            longitude,
            record_latitude,
            record_longitude,
        )

        if (
            nearest_distance is None
            or distance < nearest_distance
        ):

            nearest_distance = distance
            nearest_record = data

    if nearest_record is None:

        return {
            "found": False,
            "message": (
                "No nearby traffic data found."
            ),
        }

    return {
        "found": True,
        "distance_km": round(
            nearest_distance,
            2,
        ),
        "traffic": {
            "id": nearest_record[0],
            "timestamp": nearest_record[1],
            "cars": nearest_record[2],
            "motorcycles": nearest_record[3],
            "buses": nearest_record[4],
            "trucks": nearest_record[5],
            "total_vehicles": nearest_record[6],
            "average_vehicles": nearest_record[7],
            "peak_vehicles": nearest_record[8],
            "congestion": nearest_record[9],
            "location": nearest_record[10],
            "location_source": nearest_record[11],
            "latitude": nearest_record[12],
            "longitude": nearest_record[13],
        },
    }


# =========================================================
# REVERSE GEOCODE ENDPOINT
# =========================================================

@app.get("/reverse-geocode")
def reverse_geocode_endpoint(
    latitude: float,
    longitude: float,
):

    location_name = reverse_geocode(
        latitude,
        longitude,
    )

    if not location_name:

        raise HTTPException(
            status_code=404,
            detail=(
                "Unable to determine location name."
            ),
        )

    return {
        "latitude": latitude,
        "longitude": longitude,
        "location": location_name,
    }


# =========================================================
# OLD DEFAULT VIDEO ENDPOINT
# =========================================================

@app.get("/video")
def traffic_video():

    video_path = Path(
        "runs/detect/ml/output/traffic/traffic1.mp4"
    )

    if not video_path.exists():

        raise HTTPException(
            status_code=404,
            detail=(
                "Default traffic video not found."
            ),
        )

    return FileResponse(
        video_path,
        media_type="video/mp4",
        headers={
            "Content-Disposition": "inline",
        },
    )


# =========================================================
# SERVE PROCESSED YOLO MEDIA
# =========================================================

@app.get("/processed/{file_path:path}")
def processed_media(
    file_path: str
):

    requested_path = (
        PROCESSED_DIR / file_path
    ).resolve()

    processed_root = (
        PROCESSED_DIR.resolve()
    )

    if not requested_path.is_relative_to(
        processed_root
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid media path.",
        )

    if not requested_path.exists():

        raise HTTPException(
            status_code=404,
            detail=(
                "Processed media not found."
            ),
        )

    extension = (
        requested_path.suffix.lower()
    )

    # -----------------------------------------------------
    # IMAGE
    # -----------------------------------------------------

    if extension in {
        ".jpg",
        ".jpeg",
        ".png",
    }:

        media_type = (
            "image/png"
            if extension == ".png"
            else "image/jpeg"
        )

    # -----------------------------------------------------
    # VIDEO
    # -----------------------------------------------------

    elif extension == ".mp4":

        media_type = "video/mp4"

    elif extension in {
        ".avi",
        ".mov",
        ".mkv",
    }:

        media_type = "video"

    else:

        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported processed media."
            ),
        )

    return FileResponse(
        requested_path,
        media_type=media_type,
        headers={
            "Content-Disposition": "inline",
        },
    )


# =========================================================
# UPLOAD + YOLO + LOCATION
# =========================================================

@app.post("/upload-video")
async def upload_video(
    file: UploadFile = File(...),
    location: str = Form(""),
    location_source: str = Form(""),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
    current_user: dict = Depends(
        get_current_user
    ),
):

    # -----------------------------------------------------
    # ALLOWED FILE TYPES
    # -----------------------------------------------------

    allowed_extensions = {
        ".mp4",
        ".avi",
        ".mov",
        ".jpg",
        ".jpeg",
        ".png",
    }

    original_name = Path(
        file.filename
    ).name

    extension = Path(
        original_name
    ).suffix.lower()

    if extension not in allowed_extensions:

        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file type. "
                "Upload a traffic photo or video."
            ),
        )

    # -----------------------------------------------------
    # CHECK LOCATION METHOD
    # -----------------------------------------------------

    if not location_source:

        raise HTTPException(
            status_code=400,
            detail=(
                "Please select a location method."
            ),
        )

    # -----------------------------------------------------
    # EXIF GPS
    # -----------------------------------------------------

    if location_source == "EXIF GPS":

        if extension not in {
            ".jpg",
            ".jpeg",
            ".png",
        }:

            raise HTTPException(
                status_code=400,
                detail=(
                    "EXIF GPS is available only "
                    "for photos."
                ),
            )

    # -----------------------------------------------------
    # OTHER LOCATION METHODS
    # -----------------------------------------------------

    else:

        if not location.strip():

            raise HTTPException(
                status_code=400,
                detail=(
                    "Please provide an "
                    "analysis location."
                ),
            )

    # -----------------------------------------------------
    # SAVE UPLOAD
    # -----------------------------------------------------

    file_path = (
        UPLOAD_DIR / original_name
    )

    with open(
        file_path,
        "wb",
    ) as buffer:

        while True:

            chunk = await file.read(
                1024 * 1024
            )

            if not chunk:
                break

            buffer.write(chunk)

    # -----------------------------------------------------
    # PROCESS
    # -----------------------------------------------------

    if extension in {
        ".jpg",
        ".jpeg",
        ".png",
    }:

        result = process_image(
            file_path
        )

    else:

        result = process_video(
            file_path
        )

    # -----------------------------------------------------
    # NO VEHICLES
    # -----------------------------------------------------

    if result is None:

        raise HTTPException(
            status_code=400,
            detail=(
                "No traffic vehicles detected. "
                "Please upload an image or video "
                "containing cars, motorcycles, "
                "buses, or trucks."
            ),
        )

    # -----------------------------------------------------
    # EXIF GPS RESULT
    # -----------------------------------------------------

    if location_source == "EXIF GPS":

        if not result.get(
            "has_exif_gps",
            False,
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    "No GPS information was found "
                    "in this photo. Please choose "
                    "Enter Manually or Use Current "
                    "Location."
                ),
            )

        latitude = result.get(
            "latitude"
        )

        longitude = result.get(
            "longitude"
        )

        if (
            latitude is None
            or longitude is None
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    "EXIF GPS coordinates "
                    "could not be read."
                ),
            )

        readable_location = reverse_geocode(
            latitude,
            longitude,
        )

        if readable_location:

            location = readable_location

        else:

            location = (
                f"{latitude:.6f}, "
                f"{longitude:.6f}"
            )

    # -----------------------------------------------------
    # CURRENT LOCATION
    # -----------------------------------------------------

    elif location_source == "Current Location":

        if (
            latitude is None
            or longitude is None
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    "Current location coordinates "
                    "are missing."
                ),
            )

        readable_location = reverse_geocode(
            latitude,
            longitude,
        )

        if readable_location:

            location = readable_location

    # -----------------------------------------------------
    # MANUAL / VISUAL ESTIMATE
    # -----------------------------------------------------

    else:

        location = location.strip()

    # -----------------------------------------------------
    # SAVE TRAFFIC RESULT
    # -----------------------------------------------------

    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO traffic_data
        (
            cars,
            motorcycles,
            buses,
            trucks,
            total_vehicles,
            average_vehicles,
            peak_vehicles,
            congestion,
            location,
            location_source,
            latitude,
            longitude,
            user_id
        )
        VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?
        )
    """, (
        result["cars"],
        result["motorcycles"],
        result["buses"],
        result["trucks"],
        result["total_vehicles"],
        result["average_vehicles"],
        result["peak_vehicles"],
        result["congestion"],
        location,
        location_source,
        latitude,
        longitude,
        current_user["id"],
    ))

    connection.commit()
    connection.close()

    # -----------------------------------------------------
    # OUTPUT URL
    # -----------------------------------------------------

    relative_path = (
        result["output_path"].relative_to(
            PROCESSED_DIR
        )
    )

    output_url = (
        f"/processed/"
        f"{relative_path.as_posix()}"
    )

    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return {
        "message": (
            "Traffic media processed successfully."
        ),
        "filename": original_name,

        "cars": result["cars"],
        "motorcycles": result["motorcycles"],
        "buses": result["buses"],
        "trucks": result["trucks"],

        "total_vehicles": result["total_vehicles"],
        "average_vehicles": result["average_vehicles"],
        "peak_vehicles": result["peak_vehicles"],
        "congestion": result["congestion"],

        "media_type": result["media_type"],
        "output_url": output_url,

        "location": location,
        "location_source": location_source,
        "latitude": latitude,
        "longitude": longitude,
    }