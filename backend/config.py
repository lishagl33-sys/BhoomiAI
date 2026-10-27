import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent

# Storage folders
UPLOAD_DIR = BASE_DIR / "uploads"
PROCESSED_DIR = BASE_DIR / "processed"
SAMPLES_DIR = BASE_DIR / "samples"
REPORTS_DIR = BASE_DIR / "reports"
TEMPLATES_DIR = BASE_DIR / "templates"

for dir_path in [UPLOAD_DIR, PROCESSED_DIR, SAMPLES_DIR, REPORTS_DIR, TEMPLATES_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# Database URL: SQLite default with clean relational schema
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'landnova.db'}")

# CORS settings
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:3000",
    "*"
]

# File Upload Settings
MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}

# Supported Districts (Karnataka Focus)
SUPPORTED_KARNATAKA_DISTRICTS = ["Davanagere", "Tumakuru", "Shivamogga", "Mysuru"]

# Verification Thresholds & Tolerances
AREA_MATCH_TOLERANCE_PERCENT = 0.5         # Within 0.5% considered exact area match
AREA_MISMATCH_TOLERANCE_PERCENT = 2.5      # Greater than 2.5% flagged as Mismatch Detected
NAME_EXACT_MATCH_THRESHOLD = 85.0          # Fuzzy score >= 85 is verified match
NAME_POSSIBLE_MATCH_THRESHOLD = 70.0       # Fuzzy score 70-84 is Possible Match / Needs Review
CONFIDENCE_WARNING_THRESHOLD = 0.70        # Below 70% OCR confidence flags manual review
GEOFENCE_MAX_DISTANCE_METERS = 50.0        # 50m radius for field inspector geofencing

# Supported Indic Languages & Scripts
SUPPORTED_LANGUAGES = {
    "en": {"name": "English", "script": "Latin"},
    "kn": {"name": "Kannada", "script": "ಕನ್ನಡ"},
    "mr": {"name": "Marathi", "script": "मराठी (देवनागरी)"},
    "hi": {"name": "Hindi", "script": "हिन्दी (देवनागरी)"},
    "te": {"name": "Telugu", "script": "తెలుగు"},
    "ta": {"name": "Tamil", "script": "தமிழ்"}
}

# Platform Branding & Disclaimer
APP_NAME = "BhoomiAI"
APP_SUBTITLE = "Autonomous Land Record Digitization, Cadastral GIS & Validation System"
APP_VERSION = "3.0.0"
PROTOTYPE_DISCLAIMER = (
    "BhoomiAI is an intelligent land-record assistance and verification prototype. "
    "It does not claim legal ownership certification, official government integration, "
    "or complete district coverage unless authorized government data has been formally obtained."
)
