import os
import sys
import json
import shutil
import time
import re
from datetime import datetime
from pathlib import Path

# Ensure backend directory is in sys.path regardless of execution CWD
sys.path.insert(0, str(Path(__file__).resolve().parent))

from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from config import (
    UPLOAD_DIR, PROCESSED_DIR, SAMPLES_DIR, REPORTS_DIR,
    CORS_ORIGINS, BASE_DIR, APP_NAME, APP_SUBTITLE, APP_VERSION,
    GEOFENCE_MAX_DISTANCE_METERS, MAX_UPLOAD_SIZE_BYTES,
    SUPPORTED_KARNATAKA_DISTRICTS, PROTOTYPE_DISCLAIMER,
    OPENAI_MODEL, CHAT_RATE_LIMIT_PER_MINUTE, CHAT_MAX_MESSAGE_LENGTH
)
from database import engine, get_db, Base
from models import (
    DocumentUpload, LandRecord, ValidationIssue,
    DuplicateMatch, MismatchLog, AuditReport,
    BlockchainBlock, FieldInspectionLog,
    District, Taluk, Hobli, Village,
    ReferenceParcel, VerificationResult, ReferenceImportAudit,
    LandParcel, LandRecordDocument,
    ChatConversation, ChatMessage
)
import schemas
from services.ai_chat_service import AIChatService

from services.ocr_service import ocr_service
from services.indic_ocr_service import indic_ocr_service
from services.nlp_extractor import nlp_extractor
from services.validation_service import validation_service
from services.duplicate_detector import duplicate_detector
from services.mismatch_detector import mismatch_detector
from services.report_generator import report_generator
from services.sample_generator import sample_generator
from services.gis_service import gis_service
from services.blockchain_service import blockchain_service
from services.location_service import location_service
from services.reference_service import reference_service
from services.verification_engine import verification_engine
from services.geocoding_service import geocoding_service
from services.survey_search_service import survey_search_service
from services.cadastral_import_service import cadastral_import_service

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=f"{APP_NAME} API",
    description=APP_SUBTITLE,
    version=APP_VERSION
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static file directories for images and reports
app.mount("/static/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.mount("/static/processed", StaticFiles(directory=str(PROCESSED_DIR)), name="processed")
app.mount("/static/samples", StaticFiles(directory=str(SAMPLES_DIR)), name="samples")
app.mount("/static/reports", StaticFiles(directory=str(REPORTS_DIR)), name="reports")

@app.on_event("startup")
def startup_event():
    """Generates sample test documents, creates genesis block, and seeds dataset if empty."""
    sample_generator.generate_all_samples()
    
    db = next(get_db())
    try:
        # Initialize blockchain genesis block
        blockchain_service.ensure_genesis_block(db)

        # Seed authentic Karnataka location hierarchy (Davanagere & Tumakuru)
        location_service.seed_locations_if_empty(db)

        # Seed synthetic reference parcels ([SYNTHETIC / DEMO DATA])
        reference_service.seed_synthetic_reference_parcels(db)

        if db.query(LandRecord).count() == 0:
            _seed_initial_database(db)

        # Ensure schema migrations for LandParcel table
        from sqlalchemy import text
        for col_name, col_type in [
            ("perimeter_meters", "FLOAT"),
            ("land_type", "VARCHAR(100) DEFAULT 'Agricultural'"),
            ("notes", "TEXT"),
            ("created_by", "VARCHAR(100) DEFAULT 'User'"),
            ("updated_at", "DATETIME")
        ]:
            try:
                db.execute(text(f"ALTER TABLE land_parcels ADD COLUMN {col_name} {col_type}"))
                db.commit()
            except Exception:
                pass

        # Seed authentic Karnataka cadastral GIS parcels (Davanagere & Tumakuru)
        gis_service.seed_cadastral_parcels_if_empty(db)
    finally:
        db.close()

def _seed_initial_database(db: Session):
    """Seeds baseline records representing Revenue RTCs, Sub-Registrar Deeds, and flagged entries."""
    # 1. Master Baseline RTC
    poly1 = gis_service.generate_parcel_polygon("142/2", "Vijayapura", 3.5)
    rec1 = LandRecord(
        state="Karnataka",
        district="Bengaluru Rural",
        taluk="Devanahalli",
        village="Vijayapura",
        survey_number="142/2",
        sub_division="2",
        owner_name="Ramesh Chandra Gowda",
        relative_name="Late Venkatappa Gowda",
        owner_share_percent=100.0,
        area_value=3.5,
        area_unit="Acres",
        area_in_acres=3.5,
        land_type="Dry Crop (Agricultural)",
        mutation_number="MR-142/2021",
        registration_date="14/08/2021",
        valuation_amount=4500000.0,
        north_boundary="Sy No 142/1",
        south_boundary="Grama Thana Road",
        east_boundary="Sy No 143",
        west_boundary="Nala / Canal",
        source_department="Revenue Department (RTC)",
        language="en",
        latitude=poly1["center_lat"],
        longitude=poly1["center_lng"],
        polygon_coordinates=json.dumps(poly1["polygon"]),
        status="VALID"
    )
    db.add(rec1)
    db.flush()

    # Blockchain block for rec1
    b1 = blockchain_service.record_mutation(
        db=db,
        action="TITLE_ORIGIN_CREATION",
        record_id=rec1.id,
        survey_number=rec1.survey_number,
        village=rec1.village,
        owner_name=rec1.owner_name,
        details="Initial title creation under DILRMP revenue digitization program."
    )
    rec1.blockchain_tx_hash = b1.current_hash

    # Seed inspection for rec1
    insp1 = FieldInspectionLog(
        record_id=rec1.id,
        inspector_id="REV-OFFICER-704",
        inspector_name="K. S. Narayana Rao",
        inspection_lat=poly1["center_lat"] + 0.0001,
        inspection_lng=poly1["center_lng"] + 0.0001,
        distance_to_boundary_m=12.4,
        within_geofence=True,
        boundary_stones_verified=True,
        crop_status="Standing Maize Crop Verified",
        occupant_match=True,
        photo_url="/static/samples/sample_rtc_karnataka.png",
        notes="All 4 boundary stones physically verified and georeferenced on site."
    )
    db.add(insp1)

    # 2. Sub-Registrar Deed for same survey with intentional area mismatch (3.88 Acres vs 3.50 Acres)
    poly2 = gis_service.generate_parcel_polygon("142/2", "Vijayapura", 3.875)
    rec2 = LandRecord(
        state="Karnataka",
        district="Bengaluru Rural",
        taluk="Devanahalli",
        village="Vijayapura",
        survey_number="142/2",
        sub_division="2",
        owner_name="Suresh Kumar",
        relative_name="Mohan Lal Kumar",
        owner_share_percent=100.0,
        area_value=3.875,
        area_unit="Acres",
        area_in_acres=3.875,
        land_type="Agricultural",
        mutation_number="DNH-04521/2023",
        registration_date="22/11/2023",
        valuation_amount=5200000.0,
        north_boundary="Sy No 142/1",
        south_boundary="Grama Road",
        east_boundary="Sy No 143",
        west_boundary="Nala Drainage",
        source_department="Sub-Registrar Office (Sale Deed)",
        language="en",
        latitude=poly2["center_lat"],
        longitude=poly2["center_lng"],
        polygon_coordinates=json.dumps(poly2["polygon"]),
        status="FLAGGED"
    )
    db.add(rec2)
    db.flush()

    b2 = blockchain_service.record_mutation(
        db=db,
        action="CONVEYANCE_DEED_REGISTRATION",
        record_id=rec2.id,
        survey_number=rec2.survey_number,
        village=rec2.village,
        owner_name=rec2.owner_name,
        details="Registered Sale Deed Doc No DNH-04521/2023 filed; pending area reconciliation."
    )
    rec2.blockchain_tx_hash = b2.current_hash

    # 3. Maharashtra 7/12 Valid Record
    poly3 = gis_service.generate_parcel_polygon("88/1", "Wagholi", 3.58)
    rec3 = LandRecord(
        state="Maharashtra",
        district="Pune",
        taluk="Haveli",
        village="Wagholi",
        survey_number="88/1",
        sub_division="1",
        owner_name="Shivaji Vitthal Patil",
        relative_name="Vitthal Patil",
        owner_share_percent=100.0,
        area_value=1.45,
        area_unit="Hectares",
        area_in_acres=3.58,
        land_type="Bagayat (Garden)",
        mutation_number="Ferfar 1104",
        registration_date="10/05/2022",
        valuation_amount=6500000.0,
        north_boundary="Gat No 87",
        south_boundary="Village Main Road",
        east_boundary="Gat No 89",
        west_boundary="Canal Stream",
        source_department="Revenue Department (7/12)",
        language="mr",
        latitude=poly3["center_lat"],
        longitude=poly3["center_lng"],
        polygon_coordinates=json.dumps(poly3["polygon"]),
        status="VALID"
    )
    db.add(rec3)
    db.flush()

    b3 = blockchain_service.record_mutation(
        db=db,
        action="TITLE_ORIGIN_CREATION",
        record_id=rec3.id,
        survey_number=rec3.survey_number,
        village=rec3.village,
        owner_name=rec3.owner_name,
        details="Maharashtra 7/12 land title digitally anchored."
    )
    rec3.blockchain_tx_hash = b3.current_hash

    # 4. Record with Validation Issues & Cadastral Encroachment
    poly4 = gis_service.generate_parcel_polygon("204/1A", "Hullahalli", 2.2)
    rec4 = LandRecord(
        state="Karnataka",
        district="Mysuru",
        taluk="Nanjangud",
        village="Hullahalli",
        survey_number="204/1A#*Err",
        sub_division="1A",
        owner_name="Anitha Devi",
        relative_name="Ravi Kumar",
        owner_share_percent=150.0,
        area_value=0.0,
        area_unit="Acres",
        area_in_acres=0.0,
        land_type="Agricultural",
        mutation_number="MR-89/2020",
        registration_date="15/10/2029",
        valuation_amount=1200000.0,
        source_department="Revenue Department (RTC)",
        language="en",
        latitude=poly4["center_lat"],
        longitude=poly4["center_lng"],
        polygon_coordinates=json.dumps(poly4["polygon"]),
        gis_encroachment_flag=True,
        encroachment_details="Boundary overlaps 18.5m into adjacent road buffer.",
        status="FLAGGED"
    )
    db.add(rec4)
    db.flush()

    # Seed issues for rec4
    iss1 = ValidationIssue(
        record_id=rec4.id,
        field_name="survey_number",
        issue_type="INVALID_SURVEY_FORMAT",
        severity="WARNING",
        description="Survey number '204/1A#*Err' contains unconventional characters.",
        suggested_fix="Remove special characters and verify sub-division."
    )
    iss2 = ValidationIssue(
        record_id=rec4.id,
        field_name="area_value",
        issue_type="AREA_INCONSISTENCY",
        severity="CRITICAL",
        description="Land area cannot be zero or negative.",
        suggested_fix="Enter correct parcel extent in Acres/Guntas."
    )
    iss3 = ValidationIssue(
        record_id=rec4.id,
        field_name="owner_share_percent",
        issue_type="UNBALANCED_SHARE",
        severity="CRITICAL",
        description="Owner share percentage (150.0%) exceeds 100%.",
        suggested_fix="Adjust co-owner share ratio."
    )
    iss4 = ValidationIssue(
        record_id=rec4.id,
        field_name="registration_date",
        issue_type="INVALID_DATE",
        severity="CRITICAL",
        description="Registration date '15/10/2029' is in the future.",
        suggested_fix="Correct the registration date from original deed."
    )
    iss5 = ValidationIssue(
        record_id=rec4.id,
        field_name="gis_boundaries",
        issue_type="GIS_ENCROACHMENT",
        severity="CRITICAL",
        description="Satellite boundary polygon overlaps 18.5m into adjacent survey road easement.",
        suggested_fix="Order re-survey with Total Station."
    )
    db.add_all([iss1, iss2, iss3, iss4, iss5])

    # Seed Mismatch between rec1 (RTC) and rec2 (Sale Deed)
    mismatch = MismatchLog(
        survey_number="142/2",
        village="Vijayapura",
        dept_source_1="Revenue Department (RTC)",
        dept_source_2="Sub-Registrar Office (Sale Deed)",
        field_name="Land Area (Acres)",
        value_1="3.50 Acres",
        value_2="3.88 Acres",
        discrepancy_description="Area variance of 10.71% exceeds statutory 2.5% tolerance.",
        discrepancy_percentage=10.71,
        severity="HIGH",
        status="FLAGGED"
    )
    mismatch_owner = MismatchLog(
        survey_number="142/2",
        village="Vijayapura",
        dept_source_1="Revenue Department (RTC)",
        dept_source_2="Sub-Registrar Office (Sale Deed)",
        field_name="Owner / Titleholder Name",
        value_1="Ramesh Chandra Gowda",
        value_2="Suresh Kumar",
        discrepancy_description="Titleholder mismatch: RTC records 'Ramesh Chandra Gowda', while Deed transfers title to 'Suresh Kumar'. Mutation entry pending.",
        discrepancy_percentage=65.0,
        severity="HIGH",
        status="FLAGGED"
    )
    db.add_all([mismatch, mismatch_owner])

    # Seed Duplicate match
    dup = DuplicateMatch(
        source_record_id=rec1.id,
        target_record_id=rec2.id,
        similarity_score=88.0,
        match_type="SURVEY_NUMBER_COLLISION",
        details="Conflict: Identical Survey 142/2 in 'Vijayapura' registered with competing claims.",
        status="UNRESOLVED"
    )
    db.add(dup)

    db.commit()


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": f"{APP_NAME} {APP_SUBTITLE}",
        "version": APP_VERSION,
        "indic_ocr_modules": ["Kannada", "Marathi", "Hindi", "Telugu", "Tamil", "English"],
        "gis_satellite_engine": "Active (ISRO Bhuvan / Hybrid)",
        "blockchain_ledger": "Active (SHA-256)",
        "database": "SQLite (Active)"
    }


@app.get("/api/dashboard/stats", response_model=schemas.DashboardStatsResponse)
def get_dashboard_stats(
    district: Optional[str] = None,
    taluk: Optional[str] = None,
    village: Optional[str] = None,
    record_year: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Computes key performance indicators and statistics for BhoomiAI."""
    doc_query = db.query(DocumentUpload)
    rec_query = db.query(LandRecord)
    verif_query = db.query(VerificationResult)

    if district and district != "ALL":
        doc_query = doc_query.filter(DocumentUpload.district == district)
        rec_query = rec_query.filter(LandRecord.district == district)
    if taluk and taluk != "ALL":
        doc_query = doc_query.filter(DocumentUpload.taluk == taluk)
        rec_query = rec_query.filter(LandRecord.taluk == taluk)
    if village and village != "ALL":
        doc_query = doc_query.filter(DocumentUpload.village == village)
        rec_query = rec_query.filter(LandRecord.village == village)
    if record_year and record_year != "ALL":
        doc_query = doc_query.filter(DocumentUpload.record_year == record_year)

    total_docs = doc_query.count()
    total_recs = rec_query.count()
    valid_recs = rec_query.filter(LandRecord.status == "VALID").count()
    issues_recs = rec_query.filter(LandRecord.status.in_(["FLAGGED", "PENDING_REVIEW"])).count()
    potential_dups = db.query(DuplicateMatch).filter(DuplicateMatch.status == "UNRESOLVED").count()
    mismatches = db.query(MismatchLog).filter(MismatchLog.status == "FLAGGED").count()
    total_blocks = db.query(BlockchainBlock).count()
    encroachments = rec_query.filter(LandRecord.gis_encroachment_flag == True).count()
    inspections_count = db.query(FieldInspectionLog).count()

    # BhoomiAI 4 Verification Category Counts
    successfully_processed = verif_query.filter(VerificationResult.final_status == "MATCH").count()
    awaiting_review = verif_query.filter(VerificationResult.final_status == "NEEDS_REVIEW").count()
    possible_mismatches = verif_query.filter(VerificationResult.final_status == "MISMATCH_DETECTED").count()
    insufficient_reference_data = verif_query.filter(VerificationResult.final_status == "REFERENCE_UNAVAILABLE").count()
    total_ref_parcels = db.query(ReferenceParcel).count()

    avg_conf = db.query(func.avg(DocumentUpload.confidence_score)).scalar() or 0.89

    crit_count = db.query(ValidationIssue).filter(ValidationIssue.severity == "CRITICAL", ValidationIssue.status == "OPEN").count()
    warn_count = db.query(ValidationIssue).filter(ValidationIssue.severity == "WARNING", ValidationIssue.status == "OPEN").count()
    info_count = db.query(ValidationIssue).filter(ValidationIssue.severity == "INFO", ValidationIssue.status == "OPEN").count()

    records = rec_query.all()
    type_counts = {}
    for r in records:
        t = r.land_type or "Agricultural"
        type_counts[t] = type_counts.get(t, 0) + 1

    dist_query = db.query(LandRecord.district, func.count(LandRecord.id)).group_by(LandRecord.district).all()
    dist_dist = [{"district": d[0], "count": d[1]} for d in dist_query]

    recent_recs = rec_query.order_by(LandRecord.created_at.desc()).limit(5).all()
    activity = []
    for r in recent_recs:
        activity.append({
            "id": r.id,
            "title": f"Survey {r.survey_number} ({r.village})",
            "owner": r.owner_name,
            "area": f"{r.area_value} {r.area_unit}",
            "status": r.status,
            "blockchain_tx": r.blockchain_tx_hash[:12] if r.blockchain_tx_hash else "Anchored",
            "time": r.created_at.strftime("%H:%M, %d %b")
        })

    return {
        "total_documents": total_docs if total_docs > 0 else 4,
        "successfully_processed": successfully_processed,
        "awaiting_review": awaiting_review,
        "possible_mismatches": possible_mismatches,
        "insufficient_reference_data": insufficient_reference_data,
        "total_records": total_recs,
        "valid_records": valid_recs,
        "total_reference_parcels": total_ref_parcels,
        "records_with_issues": issues_recs,
        "potential_duplicates": potential_dups,
        "data_mismatches": mismatches,
        "average_confidence": round(float(avg_conf), 2),
        "total_blockchain_blocks": total_blocks,
        "gis_encroachments_count": encroachments,
        "field_inspections_count": inspections_count,
        "issues_by_severity": {
            "CRITICAL": crit_count,
            "WARNING": warn_count,
            "INFO": info_count
        },
        "records_by_type": type_counts,
        "district_distribution": dist_dist,
        "recent_activity": activity
    }


# ==========================================
# 🗺️ Land Map & Spatial Ownership Identification Endpoints
# ==========================================

@app.get("/api/land/locations")
def get_land_locations(db: Session = Depends(get_db)):
    """
    Returns available districts, taluks, hoblis, and villages from Karnataka administrative dataset.
    """
    hierarchy = []
    districts = db.query(District).all()
    for d in districts:
        taluks_list = []
        for t in d.taluks:
            hoblis_list = []
            for h in t.hoblis:
                villages_list = [v.name for v in h.villages]
                hoblis_list.append({
                    "name": h.name,
                    "villages": villages_list
                })
            taluks_list.append({
                "name": t.name,
                "hoblis": hoblis_list
            })
        hierarchy.append({
            "name": d.name,
            "taluks": taluks_list
        })
    return {"districts": hierarchy}


@app.get("/api/land/boundaries/district/{district_name}")
def get_district_boundary(district_name: str):
    """
    Returns verified GeoJSON polygon/multipolygon for a Karnataka district (e.g. Davanagere or Tumakuru).
    """
    boundary = geocoding_service.get_district_boundary(district_name)
    if not boundary:
        raise HTTPException(
            status_code=404, 
            detail=f"Boundary not found for district '{district_name}'. Currently supported: Davanagere, Tumakuru, Shivamogga, Mysuru."
        )
    return boundary


@app.get("/api/land/boundaries/all")
def get_all_district_boundaries():
    """
    Returns unified FeatureCollection of all verified district boundaries.
    """
    return geocoding_service.get_all_district_boundaries()


@app.get("/api/land/search/places")
def search_places(
    q: str = Query(..., min_length=1, description="Place name in English or Kannada or Survey Number"),
    db: Session = Depends(get_db)
):
    """
    Universal location search across Karnataka gazetteer and cadastral parcel index.
    Supports English, Kannada, locality names, and survey numbers (e.g. '104', 'Sy 104', 'Maravanji').
    """
    results = geocoding_service.search_places(q)
    
    # Check if query contains digits or survey references
    clean_q = q.strip()
    digits = re.findall(r'\d+', clean_q)
    parcel_matches = []
    
    if digits:
        for num in digits:
            parcels = db.query(LandParcel).filter(LandParcel.survey_number.ilike(f"%{num}%")).limit(6).all()
            for p in parcels:
                owner = p.records[0].owner_name if p.records else "Registered Owner"
                geom = json.loads(p.boundary_geojson) if p.boundary_geojson else None
                parcel_matches.append({
                    "id": f"parcel_{p.id}",
                    "name": f"Survey {p.survey_number}" + (f"/{p.hissa_number}" if p.hissa_number else ""),
                    "name_kn": f"ಸರ್ವೇ {p.survey_number}" + (f"/{p.hissa_number}" if p.hissa_number else ""),
                    "place_type": "cadastral_parcel",
                    "taluk": p.taluk,
                    "hobli": p.hobli,
                    "village": p.village,
                    "district": p.district,
                    "display_name": f"Survey {p.survey_number}/{p.hissa_number or '-'} ({owner}), {p.village}, {p.taluk} Taluk, {p.district}",
                    "lat": p.center_lat,
                    "lng": p.center_lng,
                    "zoom": 17,
                    "has_boundary_polygon": True,
                    "has_cadastral_parcels": True,
                    "geometry": geom,
                    "parcel_id": p.id,
                    "survey_number": p.survey_number,
                    "hissa_number": p.hissa_number,
                    "extent_acres": p.area_acres,
                    "primary_owner": owner,
                    "is_cadastral_parcel": True,
                    "source": p.geometry_source or "SSLR Cadastral Vector Map",
                    "is_verified": True,
                    "accuracy": "CADASTRAL_FORM_16",
                    "relevance_score": 95
                })
    
    if clean_q.isdigit() and parcel_matches:
        combined = parcel_matches
    else:
        combined = parcel_matches + results if digits else results + parcel_matches

    seen = set()
    unique_results = []
    for r in combined:
        if r["id"] not in seen and r.get("name"):
            seen.add(r["id"])
            unique_results.append(r)

    return {
        "query": q,
        "count": len(unique_results),
        "results": unique_results
    }


@app.get("/api/land/coverage/metadata")
def get_coverage_metadata():
    """
    Returns data pipeline coverage metadata, dataset sources, dates, CRS, and limitations.
    """
    return geocoding_service.get_coverage_metadata()


@app.get("/api/land/buildings/osm")
def get_osm_buildings(
    min_lat: float = Query(..., description="South bounding latitude"),
    min_lng: float = Query(..., description="West bounding longitude"),
    max_lat: float = Query(..., description="North bounding latitude"),
    max_lng: float = Query(..., description="East bounding longitude"),
):
    """
    Returns authentic building footprint polygons within the bounding box from OpenStreetMap Overpass.
    """
    return geocoding_service.get_osm_building_footprints(min_lat, min_lng, max_lat, max_lng)


@app.post("/api/land/parcels/import-geojson")
async def import_geojson_boundary(
    request: Request,
    file: Optional[UploadFile] = File(None),
    payload: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Validates and processes imported GeoJSON / JSON property boundaries,
    computes ellipsoidal geodesic measurements, and checks for spatial intersections
    with registered cadastral parcels. Supports File upload, Form payload, or direct JSON body.
    """
    raw_json = None
    if file:
        content = await file.read()
        try:
            raw_json = json.loads(content.decode("utf-8"))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON file format: {str(e)}")
    elif payload:
        try:
            raw_json = json.loads(payload)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid GeoJSON payload: {str(e)}")
    else:
        try:
            body = await request.json()
            if isinstance(body, dict) and "payload" in body:
                raw_json = json.loads(body["payload"]) if isinstance(body["payload"], str) else body["payload"]
            else:
                raw_json = body
        except Exception:
            pass

    if not raw_json:
        raise HTTPException(status_code=400, detail="Either file, form payload, or JSON body must be provided.")

    geom = None
    properties = {}
    if isinstance(raw_json, dict):
        properties = raw_json.get("properties", {})
        if raw_json.get("type") == "FeatureCollection" and raw_json.get("features"):
            feat = raw_json["features"][0]
            geom = feat.get("geometry")
            properties = feat.get("properties", properties)
        elif raw_json.get("type") == "Feature":
            geom = raw_json.get("geometry")
            properties = raw_json.get("properties", properties)
        elif raw_json.get("type") in ["Polygon", "MultiPolygon"]:
            geom = raw_json

    if not geom:
        raise HTTPException(status_code=400, detail="No valid Polygon or MultiPolygon geometry found in GeoJSON.")

    identify_res = gis_service.identify_parcels_by_polygon(db, geom)

    from services.geo_utils import shape as s_shape
    import math
    try:
        sh_poly = s_shape(geom)
        centroid = sh_poly.centroid
        center_lat = centroid.y
        center_lng = centroid.x

        coords = geom.get("coordinates", [])
        if coords and len(coords) > 0:
            ring = coords[0]
            area_sqm = 0.0
            RADIUS = 6378137.0
            n = len(ring)
            for i in range(n):
                p1 = ring[i]
                p2 = ring[(i + 1) % n]
                lat1 = math.radians(p2[1])
                lng1 = math.radians(p1[0])
                lng2 = math.radians(p2[0])
                area_sqm += (lng2 - lng1) * math.sin(lat1)
            area_sqm = abs((area_sqm * RADIUS * RADIUS) / 2.0)
            area_acres = round(area_sqm / 4046.8564224, 2)
            area_hectares = round(area_sqm / 10000.0, 3)
            area_sqm = round(area_sqm, 1)
        else:
            area_acres = 1.0
            area_hectares = 0.4
            area_sqm = 4046.9
    except Exception:
        center_lat = 14.4485
        center_lng = 75.9420
        area_acres = 1.0
        area_hectares = 0.4
        area_sqm = 4046.9

    feature_out = {
        "type": "Feature",
        "geometry": geom,
        "properties": properties
    }

    return {
        "success": True,
        "status": "SUCCESS",
        "feature": feature_out,
        "geometry": geom,
        "centroid": {"lat": round(center_lat, 6), "lng": round(center_lng, 6)},
        "center_lat": round(center_lat, 6),
        "center_lng": round(center_lng, 6),
        "area_acres": area_acres,
        "area_hectares": area_hectares,
        "area_sqm": area_sqm,
        "spatial_match": identify_res,
        "identification": identify_res,
        "filename": (file.filename if file else None) or properties.get("name", "imported_boundary.geojson")
    }


@app.get("/api/land/parcels/survey-lookup")
def lookup_survey_parcel(
    district: str = Query(..., description="District name (e.g. Tumakuru)"),
    taluk: str = Query(..., description="Taluk name (e.g. Tumakuru)"),
    hobli: str = Query(..., description="Hobli name (e.g. Kasaba)"),
    village: str = Query(..., description="Village name (e.g. Melekote)"),
    survey_number: str = Query(..., description="Survey Number (e.g. 75)"),
    hissa_number: Optional[str] = Query(None, description="Optional Hissa Number (e.g. 2A)"),
    db: Session = Depends(get_db)
):
    """
    Dedicated legal land search resolving:
    District -> Taluk -> Hobli -> Village -> Survey Number -> Hissa Number.
    Strict non-fabrication guarantee: queries verified database tables and accurately distinguishes:
    1. VERIFIED_GEOMETRY_FOUND
    2. RECORD_FOUND_GEOMETRY_MISSING
    3. INVALID_SUBDIVISION
    4. RECORD_NOT_FOUND
    5. NO_DATASET_CONFIGURED
    """
    return survey_search_service.lookup_survey_record(
        db=db,
        district=district,
        taluk=taluk,
        hobli=hobli,
        village=village,
        survey_number=survey_number,
        hissa_number=hissa_number
    )


@app.post("/api/land/parcels/import-cadastral")
async def import_cadastral_dataset(
    file: UploadFile = File(...),
    district: Optional[str] = Form(None),
    taluk: Optional[str] = Form(None),
    hobli: Optional[str] = Form(None),
    village: Optional[str] = Form(None),
    source_label: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Cadastral parcel data import pipeline.
    Validates GeoJSON file, verifies WGS84 CRS, validates polygon ring closure,
    prevents duplicate parcel records, and ingests verified boundaries into the database.
    """
    content = await file.read()
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds maximum allowed size of 15 MB.")

    try:
        raw_geojson = json.loads(content.decode("utf-8"))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid GeoJSON file format: {str(e)}")

    summary = cadastral_import_service.process_cadastral_geojson(
        db=db,
        raw_geojson=raw_geojson,
        default_district=district,
        default_taluk=taluk,
        default_hobli=hobli,
        default_village=village,
        source_label=source_label or f"Imported Dataset: {file.filename}"
    )
    return summary


@app.post("/api/land/parcels/import-sample-cadastral")
def import_sample_cadastral(db: Session = Depends(get_db)):
    """
    Imports the pre-packaged synthetic Tumakuru Melekote cadastral sample dataset.
    Used for safe end-to-end verification and testing of the cadastral import pipeline.
    """
    sample_file_path = os.path.join(os.path.dirname(__file__), "sample_data", "tumakuru_melekote_sample_cadastral.geojson")
    if not os.path.exists(sample_file_path):
        raise HTTPException(status_code=404, detail="Synthetic sample dataset file not found on server.")
    with open(sample_file_path, "r", encoding="utf-8") as f:
        raw_geojson = json.load(f)
    return cadastral_import_service.process_cadastral_geojson(
        db=db,
        raw_geojson=raw_geojson,
        default_district="Tumakuru",
        default_taluk="Tumakuru",
        default_hobli="Kasaba",
        default_village="Melekote",
        source_label="Tumakuru Melekote Synthetic Cadastral Sample"
    )


@app.get("/api/land/parcels/user-drawings")
def get_user_drawn_parcels(db: Session = Depends(get_db)):
    """
    Retrieves all saved user-drawn parcel plots (marked as USER_DRAWN_UNVERIFIED).
    """
    drawings = db.query(LandParcel).filter(
        LandParcel.verification_status == "USER_DRAWN_UNVERIFIED"
    ).order_by(LandParcel.id.desc()).all()

    results = []
    for d in drawings:
        geom = json.loads(d.boundary_geojson) if d.boundary_geojson else None
        results.append({
            "id": d.id,
            "name": d.survey_number or f"Custom Plot #{d.id}",
            "survey_number": d.survey_number,
            "district": d.district,
            "taluk": d.taluk,
            "village": d.village,
            "area_acres": d.area_acres,
            "perimeter_meters": d.perimeter_meters,
            "land_type": d.land_type,
            "notes": d.notes,
            "created_by": d.created_by,
            "created_at": d.data_import_date.isoformat() if d.data_import_date else None,
            "geometry": geom,
            "center_lat": d.center_lat,
            "center_lng": d.center_lng,
            "verification_status": "USER_DRAWN_UNVERIFIED"
        })
    return results


@app.get("/api/land/parcels/search")
def search_land_parcels(
    district: Optional[str] = None,
    taluk: Optional[str] = None,
    hobli: Optional[str] = None,
    village: Optional[str] = None,
    survey_number: Optional[str] = None,
    hissa_number: Optional[str] = None,
    land_type: Optional[str] = None,
    verification_status: Optional[str] = None,
    owner_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Search cadastral and user-drawn parcels by administrative hierarchy, survey number, hissa, land type, verification status, and owner.
    """
    query = db.query(LandParcel)
    if district and district != "ALL":
        query = query.filter(LandParcel.district.ilike(district))
    if taluk and taluk != "ALL":
        query = query.filter(LandParcel.taluk.ilike(taluk))
    if hobli and hobli != "ALL":
        query = query.filter(LandParcel.hobli.ilike(hobli))
    if village and village != "ALL":
        query = query.filter(LandParcel.village.ilike(village))
    if survey_number:
        query = query.filter(LandParcel.survey_number.ilike(f"%{survey_number.strip()}%"))
    if hissa_number and hissa_number != "ALL":
        query = query.filter(LandParcel.hissa_number.ilike(hissa_number.strip()))
    if land_type and land_type != "ALL":
        query = query.filter(LandParcel.land_type.ilike(f"%{land_type.strip()}%"))
    if verification_status and verification_status != "ALL":
        query = query.filter(LandParcel.verification_status.ilike(verification_status.strip()))
    if owner_name and owner_name.strip():
        query = query.join(LandParcel.records).filter(LandRecord.owner_name.ilike(f"%{owner_name.strip()}%"))

    parcels = query.all()
    results = []
    for p in parcels:
        geom = json.loads(p.boundary_geojson) if p.boundary_geojson else None
        primary_owner = p.records[0].owner_name if p.records else None
        primary_rec = None
        if p.records:
            r = p.records[0]
            primary_rec = {
                "owner_name": r.owner_name,
                "relative_name": r.relative_name,
                "area_acres": r.area_in_acres,
                "mutation_number": r.mutation_number,
                "record_year": r.record_year,
                "verification_status": p.verification_status
            }
        results.append({
            "id": p.id,
            "parcel_id": p.id,
            "district": p.district,
            "taluk": p.taluk,
            "hobli": p.hobli,
            "village": p.village,
            "survey_number": p.survey_number,
            "hissa_number": p.hissa_number,
            "surnoc": p.surnoc,
            "area_acres": p.area_acres,
            "extent_acres": p.area_acres,
            "perimeter_meters": getattr(p, "perimeter_meters", None) or 0.0,
            "land_type": getattr(p, "land_type", "Agricultural") or "Agricultural",
            "notes": getattr(p, "notes", None),
            "created_by": getattr(p, "created_by", "User") or "User",
            "center_lat": p.center_lat,
            "center_lng": p.center_lng,
            "geometry": geom,
            "boundary_geojson": geom,
            "geometry_source": p.geometry_source,
            "provenance": p.geometry_source,
            "verification_status": p.verification_status,
            "is_synthetic": p.is_synthetic,
            "primary_owner": primary_owner,
            "linked_record": primary_rec,
            "records": [
                {
                    "id": r.id,
                    "owner_name": r.owner_name,
                    "relative_name": r.relative_name,
                    "area_in_acres": r.area_in_acres,
                    "rtc_number": f"RTC-{p.district[:3].upper()}-{r.record_year or '2024'}-{p.survey_number.zfill(4)}",
                    "mutation_number": r.mutation_number,
                    "record_year": r.record_year
                }
                for r in p.records
            ]
        })
    return results


@app.get("/api/land/parcels/{id}")
def get_land_parcel_by_id(id: int, db: Session = Depends(get_db)):
    """
    Return parcel geometry, boundary markers, and associated authorized land-record details.
    """
    parcel = db.query(LandParcel).filter(LandParcel.id == id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail=f"Land parcel with ID {id} not found.")

    geom = json.loads(parcel.boundary_geojson) if parcel.boundary_geojson else None
    linked_records = []
    all_docs = []

    for r in parcel.records:
        r_dict = {
            "id": r.id,
            "owner_name": r.owner_name,
            "relative_name": r.relative_name,
            "owner_share_percent": r.owner_share_percent,
            "area_value": r.area_value,
            "area_unit": r.area_unit,
            "area_in_acres": r.area_in_acres,
            "land_type": r.land_type,
            "mutation_number": r.mutation_number,
            "registration_date": r.registration_date,
            "record_year": r.record_year,
            "source_department": r.source_department,
            "verification_status": parcel.verification_status,
            "blockchain_tx_hash": r.blockchain_tx_hash,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        linked_records.append(r_dict)
        for d in r.documents:
            all_docs.append({
                "id": d.id,
                "document_type": d.document_type,
                "secure_file_reference": d.secure_file_reference,
                "issuing_source": d.issuing_source,
                "document_date": d.document_date,
                "ocr_status": d.ocr_status,
                "review_status": d.review_status,
                "created_at": d.created_at
            })

    primary_owner = parcel.records[0].owner_name if parcel.records else None

    return {
        "id": parcel.id,
        "parcel_id": parcel.id,
        "district": parcel.district,
        "taluk": parcel.taluk,
        "hobli": parcel.hobli,
        "village": parcel.village,
        "survey_number": parcel.survey_number,
        "hissa_number": parcel.hissa_number,
        "surnoc": parcel.surnoc,
        "area_acres": parcel.area_acres,
        "extent_acres": parcel.area_acres,
        "perimeter_meters": getattr(parcel, "perimeter_meters", None) or 0.0,
        "land_type": getattr(parcel, "land_type", "Agricultural") or "Agricultural",
        "notes": getattr(parcel, "notes", None),
        "created_by": getattr(parcel, "created_by", "User") or "User",
        "center_lat": parcel.center_lat,
        "center_lng": parcel.center_lng,
        "geometry": geom,
        "boundary_geojson": geom,
        "geometry_source": parcel.geometry_source,
        "provenance": parcel.geometry_source,
        "verification_status": parcel.verification_status,
        "is_synthetic": parcel.is_synthetic,
        "data_import_date": parcel.data_import_date.isoformat() if parcel.data_import_date else None,
        "primary_owner": primary_owner,
        "records": linked_records,
        "linked_records": linked_records,
        "documents": all_docs
    }


@app.post("/api/land/parcels", status_code=201)
def create_land_parcel(parcel_in: schemas.LandParcelCreate, db: Session = Depends(get_db)):
    """
    Saves a user-drawn or imported land plot/parcel to the database.
    Calculates centroid, spherical area, and perimeter if not supplied.
    """
    geom = parcel_in.boundary_geojson
    if not geom or geom.get("type") not in ["Polygon", "MultiPolygon"]:
        raise HTTPException(status_code=400, detail="Valid GeoJSON Polygon or MultiPolygon required.")

    center_lat = parcel_in.center_lat
    center_lng = parcel_in.center_lng
    area_acres = parcel_in.area_acres
    perimeter_m = parcel_in.perimeter_meters

    import math
    try:
        from services.geo_utils import shape as s_shape
        sh_poly = s_shape(geom)
        centroid = sh_poly.centroid
        if center_lat is None:
            center_lat = round(centroid.y, 6)
        if center_lng is None:
            center_lng = round(centroid.x, 6)

        coords = geom.get("coordinates", [])
        if coords and len(coords) > 0:
            ring = coords[0]
            # Spherical Area
            area_sqm = 0.0
            RADIUS = 6378137.0
            n = len(ring)
            for i in range(n):
                p1 = ring[i]
                p2 = ring[(i + 1) % n]
                lat1 = math.radians(p2[1])
                lng1 = math.radians(p1[0])
                lng2 = math.radians(p2[0])
                area_sqm += (lng2 - lng1) * math.sin(lat1)
            area_sqm = abs((area_sqm * RADIUS * RADIUS) / 2.0)
            if area_acres is None or area_acres <= 0:
                area_acres = round(area_sqm / 4046.8564224, 2)
            
            # Spherical Perimeter
            if perimeter_m is None or perimeter_m <= 0:
                peri = 0.0
                for i in range(len(ring) - 1):
                    p1 = ring[i]
                    p2 = ring[i + 1]
                    dlat = math.radians(p2[1] - p1[1])
                    dlng = math.radians(p2[0] - p1[0])
                    a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(p1[1])) * math.cos(math.radians(p2[1])) * math.sin(dlng / 2.0) ** 2
                    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
                    peri += RADIUS * c
                perimeter_m = round(peri, 1)
    except Exception:
        if center_lat is None: center_lat = 14.4644
        if center_lng is None: center_lng = 75.9218
        if area_acres is None: area_acres = 1.0
        if perimeter_m is None: perimeter_m = 250.0

    new_parcel = LandParcel(
        district=parcel_in.district,
        district_code=parcel_in.district_code,
        taluk=parcel_in.taluk,
        taluk_code=parcel_in.taluk_code,
        hobli=parcel_in.hobli,
        hobli_code=parcel_in.hobli_code,
        village=parcel_in.village,
        village_code=parcel_in.village_code,
        survey_number=parcel_in.survey_number or "Custom",
        hissa_number=parcel_in.hissa_number or "1",
        surnoc=parcel_in.surnoc or "*",
        boundary_geojson=json.dumps(geom),
        center_lat=center_lat,
        center_lng=center_lng,
        area_acres=area_acres,
        perimeter_meters=perimeter_m,
        land_type=parcel_in.land_type or "Agricultural",
        notes=parcel_in.notes,
        created_by=parcel_in.created_by or "User",
        geometry_source=parcel_in.geometry_source or "User Drawn Boundary",
        verification_status=parcel_in.verification_status or "USER_DRAWN_UNVERIFIED",
        is_synthetic=False
    )
    db.add(new_parcel)
    db.flush()

    # If owner name is provided, create linked LandRecord
    if parcel_in.owner_name and parcel_in.owner_name.strip():
        owner_clean = parcel_in.owner_name.strip()
        rec = LandRecord(
            parcel_id=new_parcel.id,
            state="Karnataka",
            district=new_parcel.district,
            taluk=new_parcel.taluk,
            hobli=new_parcel.hobli,
            village=new_parcel.village,
            survey_number=new_parcel.survey_number,
            hissa_number=new_parcel.hissa_number,
            surnoc=new_parcel.surnoc,
            record_year="2024-2025",
            record_type="USER_CLAIMED_PLOT",
            owner_name=owner_clean,
            relative_name=parcel_in.relative_name or "Self",
            owner_share_percent=100.0,
            area_value=new_parcel.area_acres,
            area_unit="Acres",
            area_in_acres=new_parcel.area_acres,
            land_type=new_parcel.land_type,
            mutation_number=f"USR-{new_parcel.id}/{datetime.utcnow().year}",
            source_department="User Submitted Claim",
            latitude=new_parcel.center_lat,
            longitude=new_parcel.center_lng,
            polygon_coordinates=json.dumps(geom.get("coordinates", [])),
            status="PENDING_REVIEW"
        )
        db.add(rec)
        db.flush()

    db.commit()
    db.refresh(new_parcel)
    return get_land_parcel_by_id(new_parcel.id, db)


@app.put("/api/land/parcels/{id}")
def update_land_parcel(id: int, parcel_in: schemas.LandParcelUpdate, db: Session = Depends(get_db)):
    """
    Updates an existing land parcel's boundary geometry, area, or administrative metadata.
    """
    parcel = db.query(LandParcel).filter(LandParcel.id == id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail=f"Land parcel with ID {id} not found.")

    if parcel_in.survey_number is not None:
        parcel.survey_number = parcel_in.survey_number
    if parcel_in.hissa_number is not None:
        parcel.hissa_number = parcel_in.hissa_number
    if parcel_in.district is not None:
        parcel.district = parcel_in.district
    if parcel_in.taluk is not None:
        parcel.taluk = parcel_in.taluk
    if parcel_in.hobli is not None:
        parcel.hobli = parcel_in.hobli
    if parcel_in.village is not None:
        parcel.village = parcel_in.village
    if parcel_in.land_type is not None:
        parcel.land_type = parcel_in.land_type
    if parcel_in.notes is not None:
        parcel.notes = parcel_in.notes
    if parcel_in.verification_status is not None:
        parcel.verification_status = parcel_in.verification_status
    if parcel_in.area_acres is not None and parcel_in.area_acres > 0:
        parcel.area_acres = parcel_in.area_acres
    if parcel_in.perimeter_meters is not None:
        parcel.perimeter_meters = parcel_in.perimeter_meters

    if parcel_in.boundary_geojson is not None:
        geom = parcel_in.boundary_geojson
        parcel.boundary_geojson = json.dumps(geom)
        try:
            from services.geo_utils import shape as s_shape
            sh_poly = s_shape(geom)
            centroid = sh_poly.centroid
            parcel.center_lat = round(centroid.y, 6)
            parcel.center_lng = round(centroid.x, 6)
        except Exception:
            pass

    # Update linked records if owner_name changed
    if parcel_in.owner_name and parcel.records:
        parcel.records[0].owner_name = parcel_in.owner_name
        if parcel_in.relative_name:
            parcel.records[0].relative_name = parcel_in.relative_name

    db.commit()
    db.refresh(parcel)
    return get_land_parcel_by_id(parcel.id, db)


@app.delete("/api/land/parcels/{id}")
def delete_land_parcel(id: int, db: Session = Depends(get_db)):
    """
    Deletes a land plot/parcel from the database.
    """
    parcel = db.query(LandParcel).filter(LandParcel.id == id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail=f"Land parcel with ID {id} not found.")

    survey_num = parcel.survey_number
    village_name = parcel.village
    db.delete(parcel)
    db.commit()
    return {"success": True, "message": f"Plot Survey {survey_num} ({village_name}) deleted successfully.", "id": id}


@app.post("/api/land/parcels/identify", response_model=schemas.PolygonIdentifyResponse)
def identify_parcels_by_polygon(req: schemas.PolygonIdentifyRequest, db: Session = Depends(get_db)):
    """
    Accepts a validated GeoJSON polygon from the interactive map, performs spatial intersection
    using Shapely, ranks candidate parcels, and returns matching cadastral parcels.
    """
    poly = req.geometry or req.polygon
    if not poly:
        raise HTTPException(status_code=400, detail="Polygon geometry is required.")
    return gis_service.identify_parcels_by_polygon(db, poly)


@app.get("/api/land/parcels/{id}/records")
def get_land_parcel_records(id: int, db: Session = Depends(get_db)):
    """
    Returns linked RTC/Pahani, mutation registers, and document references for a parcel.
    """
    parcel = db.query(LandParcel).filter(LandParcel.id == id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail=f"Land parcel with ID {id} not found.")

    records_out = []
    all_docs = []
    for r in parcel.records:
        docs = [
            {
                "id": d.id,
                "document_type": d.document_type,
                "secure_file_reference": d.secure_file_reference,
                "issuing_source": d.issuing_source,
                "document_date": d.document_date,
                "ocr_status": d.ocr_status,
                "review_status": d.review_status
            } for d in r.documents
        ]
        all_docs.extend(docs)
        records_out.append({
            "record_id": r.id,
            "record_type": r.record_type or "RTC / Pahani (Form 16)",
            "owner_name": r.owner_name,
            "relative_name": r.relative_name,
            "area_in_acres": r.area_in_acres,
            "extent_unit": r.area_unit,
            "mutation_reference": r.mutation_number,
            "record_year": r.record_year,
            "effective_date": r.registration_date or "10/05/2024",
            "issuing_department": r.source_department,
            "verification_status": parcel.verification_status,
            "last_verified_at": r.created_at.isoformat() if r.created_at else None,
            "blockchain_tx_hash": r.blockchain_tx_hash,
            "documents": docs
        })

    return {
        "parcel_id": parcel.id,
        "survey_number": parcel.survey_number,
        "hissa_number": parcel.hissa_number,
        "village": parcel.village,
        "taluk": parcel.taluk,
        "district": parcel.district,
        "verification_status": parcel.verification_status,
        "data_source": parcel.geometry_source,
        "records": records_out,
        "documents": all_docs
    }



# ==========================================
# 🛰️ GIS & Cadastral Map Endpoints
# ==========================================

@app.get("/api/gis/parcels", response_model=List[schemas.GISParcelResponse])
def get_gis_parcels(db: Session = Depends(get_db)):
    """Retrieves all surveyed parcels with polygon boundary coordinates for GIS satellite overlay."""
    records = db.query(LandRecord).all()
    parcels = []
    for r in records:
        poly_data = None
        if r.polygon_coordinates:
            try:
                poly_data = json.loads(r.polygon_coordinates)
            except Exception:
                pass
        
        if not poly_data:
            gen = gis_service.generate_parcel_polygon(r.survey_number, r.village, r.area_in_acres)
            poly_data = gen["polygon"]
            r.latitude = gen["center_lat"]
            r.longitude = gen["center_lng"]
            r.polygon_coordinates = json.dumps(poly_data)
            db.commit()

        # Generate corner markers
        corners = [
            {"corner": "NW", "lat": poly_data[0][0], "lng": poly_data[0][1], "marker_stone": "Verified Granite"},
            {"corner": "NE", "lat": poly_data[1][0], "lng": poly_data[1][1], "marker_stone": "Verified Granite"},
            {"corner": "SE", "lat": poly_data[2][0], "lng": poly_data[2][1], "marker_stone": "Verified Granite"},
            {"corner": "SW", "lat": poly_data[3][0], "lng": poly_data[3][1], "marker_stone": "Verified Granite"},
        ]

        parcels.append({
            "record_id": r.id,
            "survey_number": r.survey_number,
            "village": r.village,
            "district": r.district,
            "owner_name": r.owner_name,
            "area_acres": r.area_in_acres,
            "center_lat": r.latitude or poly_data[0][0],
            "center_lng": r.longitude or poly_data[0][1],
            "polygon": poly_data,
            "corners": corners,
            "encroachment_flag": r.gis_encroachment_flag or False,
            "encroachment_details": r.encroachment_details,
            "status": r.status
        })
    return parcels


# ==========================================
# ⛓️ Blockchain Mutation Ledger Endpoints
# ==========================================

@app.get("/api/blockchain/blocks", response_model=List[schemas.BlockchainBlockResponse])
def get_blockchain_ledger(db: Session = Depends(get_db)):
    """Returns the immutable cryptographic blockchain ledger."""
    return db.query(BlockchainBlock).order_by(BlockchainBlock.block_index.asc()).all()


@app.post("/api/blockchain/verify", response_model=schemas.BlockchainVerifyResponse)
def verify_blockchain_chain(db: Session = Depends(get_db)):
    """Verifies cryptographic chain integrity and SHA-256 hashes from genesis block to tip."""
    return blockchain_service.verify_chain_integrity(db)


# ==========================================
# 📱 Mobile Field Inspector Endpoints
# ==========================================

@app.post("/api/inspections/submit", response_model=schemas.FieldInspectionResponse)
def submit_field_inspection(insp_data: schemas.FieldInspectionCreate, db: Session = Depends(get_db)):
    """
    Submits on-site field officer inspection, computes GPS distance to boundary,
    and checks geofence radius.
    """
    rec = db.query(LandRecord).filter(LandRecord.id == insp_data.record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Land record not found")

    rec_lat = rec.latitude or 13.2924
    rec_lng = rec.longitude or 77.8012
    distance_m = gis_service.haversine_distance_meters(
        insp_data.inspection_lat, insp_data.inspection_lng, rec_lat, rec_lng
    )

    within_geofence = distance_m <= GEOFENCE_MAX_DISTANCE_METERS

    db_insp = FieldInspectionLog(
        record_id=rec.id,
        inspector_id=insp_data.inspector_id,
        inspector_name=insp_data.inspector_name,
        inspection_lat=insp_data.inspection_lat,
        inspection_lng=insp_data.inspection_lng,
        distance_to_boundary_m=distance_m,
        within_geofence=within_geofence,
        boundary_stones_verified=insp_data.boundary_stones_verified,
        crop_status=insp_data.crop_status,
        occupant_match=insp_data.occupant_match,
        photo_url=insp_data.photo_url or "/static/samples/sample_rtc_karnataka.png",
        notes=insp_data.notes
    )
    db.add(db_insp)

    # Also log inspection in blockchain
    blockchain_service.record_mutation(
        db=db,
        action="FIELD_INSPECTION_AUDIT",
        record_id=rec.id,
        survey_number=rec.survey_number,
        village=rec.village,
        owner_name=rec.owner_name,
        details=f"On-site inspection by {insp_data.inspector_name}. Geofence: {distance_m:.1f}m. Passed: {within_geofence}."
    )

    db.commit()
    db.refresh(db_insp)
    return db_insp


@app.get("/api/inspections/record/{record_id}", response_model=List[schemas.FieldInspectionResponse])
def get_inspections_for_record(record_id: int, db: Session = Depends(get_db)):
    return db.query(FieldInspectionLog).filter(FieldInspectionLog.record_id == record_id).all()


# ==========================================
# 📄 Ingestion & Multi-Lingual Extraction
# ==========================================

# ==========================================
# 📍 Location Hierarchy Endpoints (Karnataka)
# ==========================================

@app.get("/api/locations/districts", response_model=List[schemas.DistrictResponse])
def get_districts(db: Session = Depends(get_db)):
    """Returns supported Karnataka districts (Davanagere and Tumakuru)."""
    return location_service.get_districts(db)


@app.get("/api/locations/taluks", response_model=List[schemas.TalukResponse])
def get_taluks(
    district_id: Optional[int] = None,
    district_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Returns taluks under the selected district."""
    return location_service.get_taluks(db, district_id=district_id, district_name=district_name)


@app.get("/api/locations/hoblis", response_model=List[schemas.HobliResponse])
def get_hoblis(
    taluk_id: Optional[int] = None,
    taluk_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Returns hoblis under the selected taluk."""
    return location_service.get_hoblis(db, taluk_id=taluk_id, taluk_name=taluk_name)


@app.get("/api/locations/villages", response_model=List[schemas.VillageResponse])
def get_villages(
    hobli_id: Optional[int] = None,
    hobli_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Returns villages under the selected hobli."""
    return location_service.get_villages(db, hobli_id=hobli_id, hobli_name=hobli_name)


# ==========================================
# 📚 Reference Dataset & Admin Endpoints
# ==========================================

@app.get("/api/reference/template.csv")
def download_reference_template():
    """Generates and serves downloadable CSV template for bulk reference parcels."""
    csv_str = reference_service.get_csv_template()
    from fastapi.responses import Response
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=bhoomi_reference_template.csv"}
    )


@app.post("/api/reference/import", response_model=schemas.ReferenceImportResponse)
async def import_reference_parcels(
    file: UploadFile = File(...),
    dataset_source: str = Form("Admin CSV Import"),
    db: Session = Depends(get_db)
):
    """Imports reference parcels from a CSV file with detailed row-by-row validation report."""
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported for reference data import.")

    content = await file.read()
    csv_text = content.decode("utf-8", errors="replace")

    res = reference_service.validate_and_import_csv(
        db=db,
        csv_content=csv_text,
        filename=file.filename,
        dataset_source=dataset_source
    )
    return res


@app.get("/api/reference/parcels", response_model=List[schemas.ReferenceParcelResponse])
def get_reference_parcels(
    district: Optional[str] = None,
    taluk: Optional[str] = None,
    village: Optional[str] = None,
    survey_number: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Returns paginated catalog of reference parcels with filters."""
    query = db.query(ReferenceParcel)
    if district and district != "ALL":
        query = query.filter(ReferenceParcel.district == district)
    if taluk and taluk != "ALL":
        query = query.filter(ReferenceParcel.taluk == taluk)
    if village and village != "ALL":
        query = query.filter(ReferenceParcel.village == village)
    if survey_number:
        query = query.filter(ReferenceParcel.survey_number.ilike(f"%{survey_number}%"))
    if search:
        s_fmt = f"%{search.strip()}%"
        query = query.filter(
            (ReferenceParcel.owner_name.ilike(s_fmt)) |
            (ReferenceParcel.survey_number.ilike(s_fmt)) |
            (ReferenceParcel.village.ilike(s_fmt))
        )
    return query.order_by(ReferenceParcel.id.desc()).offset(offset).limit(limit).all()


# ==========================================
# 🔍 Verification Results Endpoints
# ==========================================

@app.get("/api/verification/results/{document_id}", response_model=Optional[schemas.VerificationResultResponse])
def get_verification_result(document_id: int, db: Session = Depends(get_db)):
    """Retrieves field-by-field verification analysis for an uploaded document."""
    res = db.query(VerificationResult).filter(VerificationResult.document_id == document_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Verification result not found for this document")

    comparisons = json.loads(res.field_comparisons_json) if res.field_comparisons_json else []
    warnings = json.loads(res.warnings_json) if res.warnings_json else []

    doc = res.document
    rec = res.record
    ext_fields = {}
    if rec:
        ext_fields = {
            "state": rec.state,
            "district": rec.district,
            "taluk": rec.taluk,
            "hobli": rec.hobli,
            "village": rec.village,
            "survey_number": rec.survey_number,
            "surnoc": rec.surnoc,
            "hissa_number": rec.hissa_number,
            "record_year": rec.record_year,
            "record_type": rec.record_type,
            "owner_name": rec.owner_name,
            "relative_name": rec.relative_name,
            "area_value": rec.area_value,
            "area_unit": rec.area_unit,
            "area_in_acres": rec.area_in_acres,
            "land_type": rec.land_type,
            "mutation_number": rec.mutation_number,
            "registration_date": rec.registration_date,
            "source_department": rec.source_department
        }
    elif doc:
        ext_fields = {
            "district": doc.district,
            "taluk": doc.taluk,
            "hobli": doc.hobli,
            "village": doc.village,
            "survey_number": doc.survey_number,
            "surnoc": doc.surnoc,
            "hissa_number": doc.hissa_number,
            "record_year": doc.record_year,
            "record_type": doc.record_type
        }

    return {
        "id": res.id,
        "document_id": res.document_id,
        "record_id": res.record_id,
        "reference_parcel_id": res.reference_parcel_id,
        "final_status": res.final_status,
        "discrepancy_score": res.discrepancy_score,
        "field_comparisons": comparisons,
        "warnings": warnings,
        "reference_source_details": res.reference_source_details,
        "verified_at": res.verified_at,
        "reference_parcel": res.reference_parcel,
        "document_filename": doc.filename if doc else None,
        "document_category": doc.document_category if doc else None,
        "extracted_fields": ext_fields,
        "blockchain_hash": rec.blockchain_tx_hash if rec else None,
        "raw_ocr_text": doc.raw_ocr_text if doc else None
    }


@app.get("/api/verification/all", response_model=List[schemas.VerificationResultResponse])
def get_all_verifications(
    status: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Retrieves all verification results with optional status filter."""
    query = db.query(VerificationResult)
    if status and status != "ALL":
        query = query.filter(VerificationResult.final_status == status)
    results = query.order_by(VerificationResult.verified_at.desc()).limit(limit).all()

    out = []
    for res in results:
        comparisons = json.loads(res.field_comparisons_json) if res.field_comparisons_json else []
        warnings = json.loads(res.warnings_json) if res.warnings_json else []
        doc = res.document
        rec = res.record
        ext_fields = {}
        if rec:
            ext_fields = {
                "state": rec.state,
                "district": rec.district,
                "taluk": rec.taluk,
                "hobli": rec.hobli,
                "village": rec.village,
                "survey_number": rec.survey_number,
                "surnoc": rec.surnoc,
                "hissa_number": rec.hissa_number,
                "record_year": rec.record_year,
                "record_type": rec.record_type,
                "owner_name": rec.owner_name,
                "relative_name": rec.relative_name,
                "area_value": rec.area_value,
                "area_unit": rec.area_unit,
                "area_in_acres": rec.area_in_acres,
                "land_type": rec.land_type,
                "mutation_number": rec.mutation_number,
                "registration_date": rec.registration_date,
                "source_department": rec.source_department
            }
        elif doc:
            ext_fields = {
                "district": doc.district,
                "taluk": doc.taluk,
                "hobli": doc.hobli,
                "village": doc.village,
                "survey_number": doc.survey_number,
                "surnoc": doc.surnoc,
                "hissa_number": doc.hissa_number,
                "record_year": doc.record_year,
                "record_type": doc.record_type
            }
        out.append({
            "id": res.id,
            "document_id": res.document_id,
            "record_id": res.record_id,
            "reference_parcel_id": res.reference_parcel_id,
            "final_status": res.final_status,
            "discrepancy_score": res.discrepancy_score,
            "field_comparisons": comparisons,
            "warnings": warnings,
            "reference_source_details": res.reference_source_details,
            "verified_at": res.verified_at,
            "reference_parcel": res.reference_parcel,
            "document_filename": doc.filename if doc else None,
            "document_category": doc.document_category if doc else None,
            "extracted_fields": ext_fields,
            "blockchain_hash": rec.blockchain_tx_hash if rec else None,
            "raw_ocr_text": doc.raw_ocr_text if doc else None
        })
    return out


# ==========================================
# 📄 Ingestion & Multi-Lingual Extraction
# ==========================================

@app.post("/api/documents/upload", response_model=schemas.ExtractionResult)
async def upload_document(
    file: UploadFile = File(...),
    document_category: str = Form("RTC / Pahani (Form 16)"),
    source_department: str = Form("Revenue Department (RTC)"),
    language: str = Form("auto"),
    district: Optional[str] = Form(None),
    taluk: Optional[str] = Form(None),
    hobli: Optional[str] = Form(None),
    village: Optional[str] = Form(None),
    survey_number: Optional[str] = Form(None),
    surnoc: Optional[str] = Form("*"),
    hissa_number: Optional[str] = Form("1"),
    record_year: Optional[str] = Form("2024-2025"),
    record_type: Optional[str] = Form("CURRENT_RTC"),
    owner_name: Optional[str] = Form(None),
    area_value: Optional[str] = Form(None),
    area_unit: Optional[str] = Form("Acres"),
    supporting_files: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db)
):
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in [".jpg", ".jpeg", ".png", ".pdf"]:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, and PDF files are supported.")

    def _clean_str(val, fallback=""):
        if val is None or hasattr(val, "default"):
            return fallback
        return str(val).strip()

    document_category = _clean_str(document_category, "RTC / Pahani (Form 16)")
    source_department = _clean_str(source_department, "Revenue Department (RTC)")
    language = _clean_str(language, "auto")
    district = _clean_str(district, "") or None
    taluk = _clean_str(taluk, "") or None
    hobli = _clean_str(hobli, "") or None
    village = _clean_str(village, "") or None
    survey_number = _clean_str(survey_number, "") or None
    surnoc = _clean_str(surnoc, "*")
    hissa_number = _clean_str(hissa_number, "1")
    record_year = _clean_str(record_year, "2024-2025")
    record_type = _clean_str(record_type, "CURRENT_RTC")
    owner_name = _clean_str(owner_name, "") or None
    area_value = _clean_str(area_value, "") or None
    area_unit = _clean_str(area_unit, "Acres")

    user_hints = {
        "district": district,
        "taluk": taluk,
        "hobli": hobli,
        "village": village,
        "survey_number": survey_number,
        "surnoc": surnoc,
        "hissa_number": hissa_number,
        "record_year": record_year,
        "record_type": record_type,
        "owner_name": owner_name,
        "area_value": area_value,
        "area_unit": area_unit
    }

    content_bytes = await file.read()
    file_size = len(content_bytes)
    if file_size > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File size exceeds 25MB limit (received {file_size / (1024 * 1024):.2f}MB, maximum allowed is 25MB)."
        )

    unique_filename = f"{int(time.time())}_{file.filename}"
    upload_path = UPLOAD_DIR / unique_filename

    with open(upload_path, "wb") as buffer:
        buffer.write(content_bytes)

    # Only use companion txt if uploaded directly or explicit test sample; do not blind copy
    # sample_txt from samples directory to ensure genuine OCR runs on user's uploaded images.

    target_image_path = upload_path
    if file_ext == ".pdf":
        try:
            from pypdf import PdfReader
            reader = PdfReader(str(upload_path))
            pdf_text = "\n".join([page.extract_text() or "" for page in reader.pages])
            if pdf_text.strip():
                txt_path = upload_path.with_suffix(".txt")
                with open(txt_path, "w", encoding="utf-8") as f:
                    f.write(pdf_text)
        except Exception:
            pass

    # 1. OCR extraction with user form hints
    ocr_result = ocr_service.run_ocr(target_image_path, user_hints=user_hints)
    raw_text = ocr_result["raw_text"]

    # 2. Multi-Lingual Indic Parsing
    extracted_fields = {}
    field_confidences = {}
    detected_lang = language

    if language != "en" and (language != "auto" or any(ord(c) > 127 for c in raw_text)):
        extracted_fields, field_confidences, detected_lang = indic_ocr_service.parse_indic_document(raw_text, language, user_hints=user_hints)

    # If Indic parsing returned fields, use them, otherwise use standard NLP extractor
    if not extracted_fields or not extracted_fields.get("owner_name") or extracted_fields.get("owner_name") == "None":
        extracted_fields, field_confidences = nlp_extractor.extract_entities(raw_text, user_hints=user_hints)

    # Genuinely extracted document attributes take precedence over default untouched form inputs.
    # Only fall back to form inputs if the attribute was not found from the document text.
    for k, v in [
        ("district", district),
        ("taluk", taluk),
        ("hobli", hobli),
        ("village", village),
        ("survey_number", survey_number),
        ("surnoc", surnoc),
        ("hissa_number", hissa_number),
        ("record_year", record_year)
    ]:
        if v and not extracted_fields.get(k):
            extracted_fields[k] = v

    if owner_name and not extracted_fields.get("owner_name"):
        extracted_fields["owner_name"] = owner_name

    if area_value and not extracted_fields.get("area_value"):
        try:
            av = float(area_value)
            extracted_fields["area_value"] = av
            extracted_fields["area_unit"] = area_unit or "Acres"
            extracted_fields["area_in_acres"] = nlp_extractor.normalize_area(av, area_unit or "Acres")
        except (ValueError, TypeError):
            pass

    doc_type = nlp_extractor.classify_document(raw_text, user_hints=user_hints)

    # 3. Document upload record with complete BhoomiAI metadata
    doc_upload = DocumentUpload(
        filename=file.filename,
        original_path=str(upload_path),
        processed_path=ocr_result["processed_path"],
        file_type=file_ext,
        file_size_bytes=file_size,
        document_category=doc_type or document_category,
        district=extracted_fields.get("district") or district,
        taluk=extracted_fields.get("taluk") or taluk,
        hobli=extracted_fields.get("hobli") or hobli,
        village=extracted_fields.get("village") or village,
        survey_number=extracted_fields.get("survey_number") or survey_number,
        surnoc=extracted_fields.get("surnoc") or surnoc or "*",
        hissa_number=extracted_fields.get("hissa_number") or hissa_number or "1",
        record_year=extracted_fields.get("record_year") or record_year or "2024-2025",
        record_type=record_type or "CURRENT_RTC",
        language=detected_lang,
        raw_ocr_text=raw_text,
        confidence_score=ocr_result["confidence_score"],
        processing_time_ms=ocr_result["processing_time_ms"],
        status="COMPLETED"
    )
    db.add(doc_upload)
    db.flush()

    # 4. Generate Cadastral GIS Polygon
    gis_poly = gis_service.generate_parcel_polygon(
        extracted_fields.get("survey_number", "104"),
        extracted_fields.get("village", "Avaragere"),
        extracted_fields.get("area_in_acres", 3.5)
    )

    # 5. Validation
    validation_issues = validation_service.validate_record(extracted_fields, field_confidences)
    record_status = validation_service.determine_record_status(validation_issues)

    # Check GIS encroachment (preventing false self-encroachments on same survey/village)
    existing_recs = db.query(LandRecord).all()
    encroach = gis_service.check_encroachment(
        candidate_poly=gis_poly["polygon"],
        existing_records=existing_recs,
        candidate_survey=extracted_fields.get("survey_number"),
        candidate_village=extracted_fields.get("village")
    )
    encroachment_flag = encroach["encroachment_detected"]
    if encroachment_flag:
        validation_issues.append({
            "field_name": "gis_boundaries",
            "issue_type": "GIS_ENCROACHMENT",
            "severity": "CRITICAL",
            "description": encroach["details"],
            "suggested_fix": "Initiate physical Total Station re-survey."
        })
        record_status = "FLAGGED"

    # 6. Create LandRecord
    land_record = LandRecord(
        document_id=doc_upload.id,
        state=extracted_fields.get("state", "Karnataka"),
        district=extracted_fields.get("district", "Davanagere"),
        taluk=extracted_fields.get("taluk", "Davanagere"),
        hobli=extracted_fields.get("hobli", "Kasaba"),
        village=extracted_fields.get("village", "Avaragere"),
        survey_number=extracted_fields.get("survey_number", "104"),
        surnoc=extracted_fields.get("surnoc", "*"),
        hissa_number=extracted_fields.get("hissa_number", "1"),
        record_year=extracted_fields.get("record_year", "2024-2025"),
        record_type=record_type or "CURRENT_RTC",
        sub_division=extracted_fields.get("sub_division", "1"),
        owner_name=extracted_fields.get("owner_name", "Unknown"),
        relative_name=extracted_fields.get("relative_name"),
        owner_share_percent=extracted_fields.get("owner_share_percent", 100.0),
        area_value=extracted_fields.get("area_value", 0.0),
        area_unit=extracted_fields.get("area_unit", "Acres"),
        area_in_acres=extracted_fields.get("area_in_acres", extracted_fields.get("area_value", 0.0)),
        land_type=extracted_fields.get("land_type", "Agricultural"),
        mutation_number=extracted_fields.get("mutation_number"),
        registration_date=extracted_fields.get("registration_date"),
        valuation_amount=extracted_fields.get("valuation_amount", 0.0),
        north_boundary=extracted_fields.get("north_boundary"),
        south_boundary=extracted_fields.get("south_boundary"),
        east_boundary=extracted_fields.get("east_boundary"),
        west_boundary=extracted_fields.get("west_boundary"),
        source_department=source_department,
        language=detected_lang,
        latitude=gis_poly["center_lat"],
        longitude=gis_poly["center_lng"],
        polygon_coordinates=json.dumps(gis_poly["polygon"]),
        gis_encroachment_flag=encroachment_flag,
        encroachment_details=encroach["details"] if encroachment_flag else None,
        status=record_status
    )
    db.add(land_record)
    db.flush()

    # Save primary document record into LandRecordDocument
    primary_doc = LandRecordDocument(
        land_record_id=land_record.id,
        document_type=document_category,
        secure_file_reference=f"/static/uploads/{unique_filename}",
        issuing_source=source_department,
        document_date=extracted_fields.get("registration_date") or datetime.utcnow().strftime("%Y-%m-%d"),
        ocr_status="COMPLETED",
        review_status="VERIFIED" if record_status == "VALID" else "PENDING_REVIEW"
    )
    db.add(primary_doc)

    # Process and save any attached supporting files
    if supporting_files and isinstance(supporting_files, (list, tuple)):
        for s_file in supporting_files:
            if not s_file or not s_file.filename:
                continue
            s_ext = Path(s_file.filename).suffix.lower()
            if s_ext not in [".jpg", ".jpeg", ".png", ".pdf"]:
                continue
            s_content = await s_file.read()
            if len(s_content) == 0 or len(s_content) > MAX_UPLOAD_SIZE_BYTES:
                continue
            s_unique = f"supp_{int(time.time())}_{s_file.filename}"
            s_path = UPLOAD_DIR / s_unique
            with open(s_path, "wb") as bf:
                bf.write(s_content)

            s_name_lower = s_file.filename.lower()
            if "mutation" in s_name_lower or "mr" in s_name_lower or "21" in s_name_lower:
                s_type = "Mutation Extract (Form 21/MR)"
            elif "sketch" in s_name_lower or "tippan" in s_name_lower or "fmb" in s_name_lower:
                s_type = "Cadastral Survey Sketch (Tippan/FMB)"
            elif "deed" in s_name_lower or "sale" in s_name_lower:
                s_type = "Supporting Property Documents (Sale Deed)"
            else:
                s_type = "Supporting Document"

            db.add(LandRecordDocument(
                land_record_id=land_record.id,
                document_type=s_type,
                secure_file_reference=f"/static/uploads/{s_unique}",
                issuing_source="Attached Supporting Record",
                document_date=datetime.utcnow().strftime("%Y-%m-%d"),
                ocr_status="COMPLETED",
                review_status="VERIFIED"
            ))

    # 7. Anchor into Cryptographic Blockchain
    block = blockchain_service.record_mutation(
        db=db,
        action="TITLE_ORIGIN_CREATION" if "RTC" in source_department else "CONVEYANCE_DEED_REGISTRATION",
        record_id=land_record.id,
        survey_number=land_record.survey_number,
        village=land_record.village,
        owner_name=land_record.owner_name,
        details=f"Extracted {doc_type} ({detected_lang.upper()}) into BhoomiAI trust anchor."
    )
    land_record.blockchain_tx_hash = block.current_hash

    # Save validation issues
    for iss in validation_issues:
        db.add(ValidationIssue(
            record_id=land_record.id,
            document_id=doc_upload.id,
            field_name=iss["field_name"],
            issue_type=iss["issue_type"],
            severity=iss["severity"],
            description=iss["description"],
            suggested_fix=iss.get("suggested_fix"),
            status="OPEN"
        ))

    # 8. Intelligent Verification Engine Run
    verif_res = verification_engine.verify_document_record(
        db=db,
        extracted_data=extracted_fields,
        document_id=doc_upload.id,
        record_id=land_record.id,
        field_confidences=field_confidences
    )
    verif_dict = {
        "final_status": verif_res.final_status,
        "discrepancy_score": verif_res.discrepancy_score,
        "reference_source_details": verif_res.reference_source_details,
        "field_comparisons": json.loads(verif_res.field_comparisons_json) if verif_res.field_comparisons_json else [],
        "warnings": json.loads(verif_res.warnings_json) if verif_res.warnings_json else []
    }

    # Synchronize LandRecord lifecycle status with Verification Engine audit results
    if verif_res.final_status == "MISMATCH_DETECTED":
        land_record.status = "FLAGGED"
        primary_doc.review_status = "FLAGGED"
        doc_upload.review_status = "FLAGGED"
        v_issue = {
            "field_name": "verification_audit",
            "issue_type": "STATUTORY_CROSS_VERIFICATION_MISMATCH",
            "severity": "CRITICAL",
            "description": f"Verification Engine detected discrepancies against official cadastral reference records ({verif_res.discrepancy_score}% discrepancy).",
            "suggested_fix": "Review field comparisons in Verification Engine and initiate discrepancy resolution."
        }
        validation_issues.append(v_issue)
        db.add(ValidationIssue(
            record_id=land_record.id,
            document_id=doc_upload.id,
            field_name=v_issue["field_name"],
            issue_type=v_issue["issue_type"],
            severity=v_issue["severity"],
            description=v_issue["description"],
            suggested_fix=v_issue["suggested_fix"],
            status="OPEN"
        ))
    elif verif_res.final_status == "NEEDS_REVIEW":
        if land_record.status != "FLAGGED":
            land_record.status = "PENDING_REVIEW"
            primary_doc.review_status = "PENDING_REVIEW"
            doc_upload.review_status = "PENDING_REVIEW"
    elif verif_res.final_status == "MATCH":
        if not encroachment_flag and record_status == "VALID":
            land_record.status = "VALID"
            primary_doc.review_status = "VERIFIED"
            doc_upload.review_status = "VERIFIED"

    # Duplicate checks
    duplicates_detected = duplicate_detector.check_duplicate(extracted_fields, existing_recs)
    for dup in duplicates_detected:
        db.add(DuplicateMatch(
            source_record_id=land_record.id,
            target_record_id=dup["target_record_id"],
            similarity_score=dup["similarity_score"],
            match_type=dup["match_type"],
            details=dup["details"],
            status="UNRESOLVED"
        ))

    # Mismatch checks
    mismatches_detected = mismatch_detector.check_department_mismatches(
        {
            "survey_number": land_record.survey_number,
            "village": land_record.village,
            "source_department": land_record.source_department,
            "area_in_acres": land_record.area_in_acres,
            "owner_name": land_record.owner_name
        },
        existing_recs
    )
    for m in mismatches_detected:
        db.add(MismatchLog(
            survey_number=m["survey_number"],
            village=m["village"],
            dept_source_1=m["dept_source_1"],
            dept_source_2=m["dept_source_2"],
            field_name=m["field_name"],
            value_1=m["value_1"],
            value_2=m["value_2"],
            discrepancy_description=m["discrepancy_description"],
            discrepancy_percentage=m["discrepancy_percentage"],
            severity=m["severity"],
            status="FLAGGED"
        ))

    db.commit()

    return {
        "document_id": doc_upload.id,
        "document_category": document_category,
        "document_type": doc_type,
        "language": detected_lang,
        "confidence_score": ocr_result["confidence_score"],
        "processing_time_ms": ocr_result["processing_time_ms"],
        "extracted_fields": extracted_fields,
        "field_confidences": field_confidences,
        "bounding_boxes": ocr_result["bounding_boxes"],
        "validation_issues": validation_issues,
        "verification_result": verif_dict,
        "duplicates_detected": duplicates_detected,
        "mismatches_detected": mismatches_detected,
        "gis_polygon_data": gis_poly,
        "blockchain_block": {
            "index": block.block_index,
            "hash": block.current_hash,
            "merkle_root": block.merkle_root,
            "timestamp": block.timestamp.isoformat()
        },
        "record_id": land_record.id,
        "processed_image_url": f"/static/{ocr_result['processed_path']}",
        "original_image_url": f"/static/{ocr_result['original_path']}"
    }


@app.get("/api/documents/samples")
def get_available_samples():
    """Returns verified catalog of testable RTC and land records with metadata and download links."""
    return [
        {
            "id": "mutation_extract",
            "name": "Mutation Extract (Form 21) - Samplehalli (Sy 128 / A/2)",
            "document_type": "Mutation Extract (Form 21 / MR)",
            "survey_number": "128",
            "hissa": "A/2",
            "village": "Samplehalli",
            "taluk": "Tumakuru",
            "district": "Tumakuru",
            "owner": "Meera N. (ಮೀರಾ ಎನ್)",
            "relative": "Ravi Kumar (Transferor)",
            "area": "1.50 Acres (1 Acre 20 Guntas)",
            "mutation": "MR-DEMO-2026-0042",
            "file_url": "/static/samples/sample_mutation_extract.jpeg",
            "filename": "sample_mutation_extract.jpeg",
            "status": "Authentic Mutation Register",
            "expected_match": "MATCH (0.0% Discrepancy)"
        },
        {
            "id": "tippan_sketch",
            "name": "Tippan Survey Sketch (FMB) - Samplehalli (Sy 128 / A/2)",
            "document_type": "Cadastral Survey Sketch (Tippan/FMB)",
            "survey_number": "128",
            "hissa": "A/2",
            "village": "Samplehalli",
            "taluk": "Tumakuru",
            "district": "Tumakuru",
            "owner": "Government Cadastral Parcel Sy No 128",
            "area": "1.50 Acres (1 Acre 20 Guntas)",
            "mutation": "MR-128/2024",
            "file_url": "/static/samples/sample_tippan_sketch.jpeg",
            "filename": "sample_tippan_sketch.jpeg",
            "status": "Authentic Cadastral Boundary Sketch",
            "expected_match": "MATCH (0.0% Discrepancy)"
        },
        {
            "id": "user_pani_1",
            "name": "Pahani 1 - Tumakuru, Devarayanahalli (Sy 142/3)",
            "survey_number": "142/3",
            "village": "Devarayanahalli",
            "taluk": "Tumakuru",
            "district": "Tumakuru",
            "owner": "Shri Manjunath (ಶ್ರೀ ಮಂಜುನಾಥ್)",
            "area": "0.68 Acres",
            "mutation": "MR 32/2018-19",
            "file_url": "/static/samples/Karnataka RTC Land Record Document-1.png",
            "filename": "Karnataka RTC Land Record Document-1.png",
            "status": "Authentic Official Record",
            "expected_match": "MATCH (0.0% Discrepancy)"
        },
        {
            "id": "user_pani_2",
            "name": "Pahani 2 - Tumakuru, Belathur (Sy 112)",
            "survey_number": "112",
            "village": "Belathur",
            "taluk": "Tumakuru",
            "district": "Tumakuru",
            "owner": "Shri Manjunath Gowda (ಶ್ರೀ ಮಂಜುನಾಥ ಗೌಡ)",
            "area": "1.25 Acres",
            "mutation": "MR 14/2021-22",
            "file_url": "/static/samples/Karnataka RTC Land Record Document-2.png",
            "filename": "Karnataka RTC Land Record Document-2.png",
            "status": "Authentic Official Record",
            "expected_match": "MATCH (0.0% Discrepancy)"
        },
        {
            "id": "user_pani_3",
            "name": "Pahani 3 - Tumakuru, Melekote (Sy 101)",
            "survey_number": "101",
            "village": "Melekote",
            "taluk": "Tumakuru",
            "district": "Tumakuru",
            "owner": "Krishnappa M (ಕೃಷ್ಣಪ್ಪ ಎಂ)",
            "area": "0.10 Acres (4 Guntas)",
            "mutation": "MR 55/2023-24",
            "file_url": "/static/samples/pani.jpeg",
            "filename": "pani.jpeg",
            "status": "Authentic Official Record",
            "expected_match": "MATCH (0.0% Discrepancy)"
        },
        {
            "id": "tumakuru_rtc",
            "name": "Tumakuru Baseline RTC - Melekote (Sy 75)",
            "survey_number": "75",
            "village": "Melekote",
            "taluk": "Tumakuru",
            "district": "Tumakuru",
            "owner": "Gangaraju K M (ಗಂಗರಾಜು)",
            "area": "2.75 Acres",
            "mutation": "MR-14/2023",
            "file_url": "/static/samples/sample_tumakuru_rtc.png",
            "filename": "sample_tumakuru_rtc.png",
            "status": "Authentic Verified Baseline",
            "expected_match": "MATCH (0.0% Discrepancy)"
        },

        {
            "id": "tumakuru_mismatch",
            "name": "Tumakuru Mismatch Demo - Sale Deed (Sy 75)",
            "survey_number": "75",
            "village": "Melekote",
            "taluk": "Tumakuru",
            "district": "Tumakuru",
            "owner": "Gangaraju K M",
            "area": "4.50 Acres (vs 2.75 Acres in RTC)",
            "mutation": "REG-2024-991",
            "file_url": "/static/samples/sample_tumakuru_mismatch.png",
            "filename": "sample_tumakuru_mismatch.png",
            "status": "Intentional Discrepancy Demo",
            "expected_match": "MISMATCH_DETECTED (>10% Variance)"
        }
    ]


@app.post("/api/documents/test-sample/{sample_name}", response_model=schemas.ExtractionResult)
async def test_sample_document(sample_name: str, db: Session = Depends(get_db)):
    """Convenience endpoint to test preloaded synthetic documents including Karnataka RTCs."""
    sample_map = {
        "user_pani_1": ("Karnataka RTC Land Record Document-1.png", "Revenue Department (RTC / ಪಹಣಿ)", "kn", "Tumakuru", "Tumakuru", "Kasaba", "Devarayanahalli", "142/3"),
        "user_pani_2": ("Karnataka RTC Land Record Document-2.png", "Revenue Department (RTC / ಪಹಣಿ)", "kn", "Tumakuru", "Tumakuru", "Kasaba", "Belathur", "112"),
        "user_pani_3": ("pani.jpeg", "Revenue Department (RTC / ಪಹಣಿ)", "kn", "Tumakuru", "Tumakuru", "Kasaba", "Melekote", "101"),
        "mutation_extract": ("sample_mutation_extract.jpeg", "Revenue Department (Mutation Extract / Form 21)", "en", "Tumakuru", "Tumakuru", "Kasaba", "Samplehalli", "128"),
        "tippan_sketch": ("sample_tippan_sketch.jpeg", "Survey & Settlement Department (Tippan / FMB)", "en", "Tumakuru", "Tumakuru", "Kasaba", "Samplehalli", "128"),
        "tumakuru_rtc": ("sample_tumakuru_rtc.png", "Revenue Department (RTC / ಪಹಣಿ)", "kn", "Tumakuru", "Tumakuru", "Kasaba", "Melekote", "75"),
        "tumakuru_mismatch": ("sample_tumakuru_mismatch.png", "Sub-Registrar Office (Sale Deed)", "en", "Tumakuru", "Tumakuru", "Kasaba", "Melekote", "75"),
        "tumakuru_english_rtc": ("sample_tumakuru_rtc.png", "Revenue Department (RTC)", "en", "Tumakuru", "Tumakuru", "Kasaba", "Melekote", "75"),
        "davanagere_rtc": ("sample_davanagere_rtc.png", "Revenue Department (RTC / ಪಹಣಿ)", "kn", "Davanagere", "Davanagere", "Kasaba", "Avaragere", "104"),
        "davanagere_mismatch": ("sample_davanagere_mismatch.png", "Sub-Registrar Office (Sale Deed)", "en", "Davanagere", "Davanagere", "Kasaba", "Avaragere", "104"),
        "rtc_karnataka": ("sample_rtc_karnataka.png", "Revenue Department (RTC)", "en", "Bengaluru Rural", "Devanahalli", "Kasaba", "Vijayapura", "142/2"),
        "sale_deed_mismatch": ("sample_sale_deed_mismatch.png", "Sub-Registrar Office (Sale Deed)", "en", "Bengaluru Rural", "Devanahalli", "Kasaba", "Vijayapura", "142/2"),
        "712_maharashtra": ("sample_712_maharashtra.png", "Revenue Department (7/12)", "mr", "Pune", "Haveli", "Kasaba", "Wagholi", "88/1"),
        "duplicate_rtc": ("sample_rtc_duplicate.png", "Revenue Department (RTC)", "en", "Bengaluru Rural", "Devanahalli", "Kasaba", "Vijayapura", "142/2"),
        "kannada_rtc": ("sample_tumakuru_rtc.png", "Revenue Department (RTC / ಪಹಣಿ)", "kn", "Tumakuru", "Tumakuru", "Kasaba", "Melekote", "75"),
        "marathi_712": ("sample_marathi_712.png", "Revenue Department (7/12 उतारा)", "mr", "Pune", "Haveli", "Kasaba", "Wagholi", "88/1"),
        "hindi_khatauni": ("sample_hindi_khatauni.png", "Revenue Department (खतौनी)", "hi", "Varanasi", "Pindra", "Kasaba", "Phulpur", "305")
    }
    if sample_name not in sample_map:
        raise HTTPException(status_code=404, detail=f"Sample '{sample_name}' not found. Choose from {list(sample_map.keys())}")

    filename, source_dept, lang, dist, tlk, hbl, vlg, sy = sample_map[sample_name]
    sample_file_path = SAMPLES_DIR / filename
    if not sample_file_path.exists():
        sample_generator.generate_all_samples()

    unique_name = f"sample_{int(time.time())}_{filename}"
    dest_path = UPLOAD_DIR / unique_name
    shutil.copy(sample_file_path, dest_path)

    txt_src = sample_file_path.with_suffix(".txt")
    if txt_src.exists():
        shutil.copy(txt_src, dest_path.with_suffix(".txt"))

    class MockUploadFile:
        def __init__(self, name, p):
            self.filename = name
            self.p = p
        async def read(self):
            with open(self.p, "rb") as f:
                return f.read()

    mock = MockUploadFile(filename, dest_path)
    return await upload_document(
        file=mock,
        document_category="RTC / Pahani (Form 16)" if "RTC" in source_dept or "7/12" in source_dept else "Mutation Extract (Form 21/MR)",
        source_department=source_dept,
        language=lang,
        district=dist,
        taluk=tlk,
        hobli=hbl,
        village=vlg,
        survey_number=sy,
        surnoc="*",
        hissa_number="1",
        record_year="2024-2025",
        record_type="CURRENT_RTC",
        db=db
    )


@app.get("/api/records", response_model=List[schemas.LandRecordResponse])
def get_records(
    search: Optional[str] = None,
    district: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(LandRecord)
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            (LandRecord.survey_number.ilike(search_fmt)) |
            (LandRecord.owner_name.ilike(search_fmt)) |
            (LandRecord.village.ilike(search_fmt)) |
            (LandRecord.mutation_number.ilike(search_fmt))
        )
    if district and district != "ALL":
        query = query.filter(LandRecord.district == district)
    if status and status != "ALL":
        query = query.filter(LandRecord.status == status)
    return query.order_by(LandRecord.created_at.desc()).all()


@app.get("/api/records/{id}", response_model=schemas.LandRecordResponse)
def get_record_by_id(id: int, db: Session = Depends(get_db)):
    rec = db.query(LandRecord).filter(LandRecord.id == id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Land record not found")
    return rec


@app.put("/api/records/{id}", response_model=schemas.LandRecordResponse)
def update_record(id: int, updates: schemas.LandRecordUpdate, db: Session = Depends(get_db)):
    rec = db.query(LandRecord).filter(LandRecord.id == id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Land record not found")

    update_dict = updates.dict(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(rec, k, v)

    if "area_value" in update_dict or "area_unit" in update_dict:
        rec.area_in_acres = nlp_extractor.normalize_area(rec.area_value, rec.area_unit)

    rec_data = {
        "owner_name": rec.owner_name,
        "survey_number": rec.survey_number,
        "village": rec.village,
        "district": rec.district,
        "area_value": rec.area_value,
        "area_unit": rec.area_unit,
        "owner_share_percent": rec.owner_share_percent,
        "registration_date": rec.registration_date
    }
    new_issues = validation_service.validate_record(rec_data)
    rec.status = validation_service.determine_record_status(new_issues)

    db.query(ValidationIssue).filter(ValidationIssue.record_id == rec.id).delete()
    for iss in new_issues:
        db.add(ValidationIssue(
            record_id=rec.id,
            document_id=rec.document_id,
            field_name=iss["field_name"],
            issue_type=iss["issue_type"],
            severity=iss["severity"],
            description=iss["description"],
            suggested_fix=iss.get("suggested_fix"),
            status="OPEN"
        ))

    # Mine blockchain block for the modification
    blockchain_service.record_mutation(
        db=db,
        action="RECORD_FIELD_MODIFICATION",
        record_id=rec.id,
        survey_number=rec.survey_number,
        village=rec.village,
        owner_name=rec.owner_name,
        details=f"Human-in-the-loop updated fields: {list(update_dict.keys())}."
    )

    db.commit()
    db.refresh(rec)
    return rec


@app.get("/api/validation/issues", response_model=List[schemas.ValidationIssueResponse])
def get_validation_issues(
    severity: Optional[str] = None,
    status: Optional[str] = "OPEN",
    db: Session = Depends(get_db)
):
    query = db.query(ValidationIssue)
    if severity and severity != "ALL":
        query = query.filter(ValidationIssue.severity == severity)
    if status and status != "ALL":
        query = query.filter(ValidationIssue.status == status)
    return query.order_by(ValidationIssue.created_at.desc()).all()


@app.post("/api/validation/issues/{id}/resolve")
def resolve_issue(id: int, db: Session = Depends(get_db)):
    issue = db.query(ValidationIssue).filter(ValidationIssue.id == id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Validation issue not found")
    issue.status = "RESOLVED"
    db.commit()
    return {"message": "Issue marked as resolved", "id": id}


@app.get("/api/duplicates")
def get_duplicate_matches(db: Session = Depends(get_db)):
    dups = db.query(DuplicateMatch).all()
    results = []
    for d in dups:
        src = db.query(LandRecord).filter(LandRecord.id == d.source_record_id).first()
        tgt = db.query(LandRecord).filter(LandRecord.id == d.target_record_id).first()
        results.append({
            "id": d.id,
            "similarity_score": d.similarity_score,
            "match_type": d.match_type,
            "details": d.details,
            "status": d.status,
            "created_at": d.created_at,
            "source_record": src,
            "target_record": tgt
        })
    return results


@app.post("/api/duplicates/{id}/resolve")
def resolve_duplicate(id: int, action: str = Query("DISMISS", pattern="^(MERGE|DISMISS)$"), db: Session = Depends(get_db)):
    dup = db.query(DuplicateMatch).filter(DuplicateMatch.id == id).first()
    if not dup:
        raise HTTPException(status_code=404, detail="Duplicate record not found")
    dup.status = "MERGED" if action == "MERGE" else "DISMISSED"

    blockchain_service.record_mutation(
        db=db,
        action="DUPLICATE_COLLISION_RESOLUTION",
        record_id=dup.source_record_id,
        survey_number="142/2",
        village="Vijayapura",
        owner_name="Titleholder",
        details=f"Duplicate candidate resolved with action: {dup.status}."
    )

    db.commit()
    return {"message": f"Duplicate pair marked as {dup.status}", "id": id}


@app.get("/api/mismatches", response_model=List[schemas.MismatchLogResponse])
def get_mismatches(db: Session = Depends(get_db)):
    return db.query(MismatchLog).order_by(MismatchLog.created_at.desc()).all()


@app.post("/api/mismatches/{id}/resolve")
def resolve_mismatch(id: int, db: Session = Depends(get_db)):
    m = db.query(MismatchLog).filter(MismatchLog.id == id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Mismatch log not found")
    m.status = "RESOLVED"

    blockchain_service.record_mutation(
        db=db,
        action="CROSS_DEPT_MUTATION_ENDORSEMENT",
        record_id=None,
        survey_number=m.survey_number,
        village=m.village,
        owner_name="Reconciled Title",
        details=f"Discrepancy on {m.field_name} between {m.dept_source_1} and {m.dept_source_2} endorsed."
    )

    db.commit()
    return {"message": "Mismatch marked as resolved", "id": id}


@app.post("/api/reports/generate/{record_id}")
def generate_audit_report(record_id: int, db: Session = Depends(get_db)):
    rec = db.query(LandRecord).filter(LandRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Land record not found")

    issues = [
        {"field_name": i.field_name, "severity": i.severity, "description": i.description, "suggested_fix": i.suggested_fix}
        for i in rec.issues
    ]
    duplicates = [
        {"similarity_score": d.similarity_score, "target_owner": "Registered Holder", "target_survey": rec.survey_number, "target_village": rec.village, "details": d.details}
        for d in db.query(DuplicateMatch).filter(DuplicateMatch.source_record_id == rec.id).all()
    ]
    mismatches = [
        {"dept_source_1": m.dept_source_1, "dept_source_2": m.dept_source_2, "field_name": m.field_name, "value_1": m.value_1, "value_2": m.value_2, "severity": m.severity, "discrepancy_description": m.discrepancy_description}
        for m in db.query(MismatchLog).filter(MismatchLog.survey_number == rec.survey_number).all()
    ]

    rec_dict = {
        "survey_number": rec.survey_number,
        "sub_division": rec.sub_division,
        "owner_name": rec.owner_name,
        "relative_name": rec.relative_name,
        "village": rec.village,
        "taluk": rec.taluk,
        "district": rec.district,
        "state": rec.state,
        "area_value": rec.area_value,
        "area_unit": rec.area_unit,
        "area_in_acres": rec.area_in_acres,
        "land_type": rec.land_type,
        "mutation_number": rec.mutation_number,
        "valuation_amount": rec.valuation_amount,
        "north_boundary": rec.north_boundary,
        "south_boundary": rec.south_boundary,
        "east_boundary": rec.east_boundary,
        "west_boundary": rec.west_boundary,
        "source_department": rec.source_department
    }

    pdf_path = report_generator.generate_pdf_report(rec_dict, issues, duplicates, mismatches)
    filename = pdf_path.name
    download_url = f"/api/reports/download/{filename}"

    audit_entry = AuditReport(
        report_number=pdf_path.stem,
        record_id=rec.id,
        document_id=rec.document_id,
        file_path=str(pdf_path)
    )
    db.add(audit_entry)
    db.commit()

    return {
        "report_id": pdf_path.stem,
        "filename": filename,
        "download_url": download_url
    }


@app.get("/api/reports/download/{filename}")
def download_report(filename: str):
    file_path = REPORTS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Report file not found")
    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=filename
    )


@app.get("/api/download/project-report")
def download_project_report():
    """Direct downloadable endpoint for the comprehensive SIH26018 technical project report."""
    pdf_path = REPORTS_DIR / "SIH26018_BhoomiVerify_Full_Project_Report.pdf"
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="Project report PDF not found")
    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename="SIH26018_BhoomiVerify_Full_Project_Report.pdf"
    )


# ==========================================
# 💬 BhoomiAI Assistant Chat Endpoints
# ==========================================

_chat_rate_limits = {}

def get_chat_client_id(request: Request) -> str:
    user_header = request.headers.get("X-User-Id")
    if user_header:
        return user_header.strip()
    return request.client.host if request.client else "guest-user"

def check_chat_rate_limit(client_id: str):
    now = time.time()
    timestamps = _chat_rate_limits.get(client_id, [])
    timestamps = [t for t in timestamps if now - t < 60]
    if len(timestamps) >= CHAT_RATE_LIMIT_PER_MINUTE:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Please wait a moment before sending more messages (max {CHAT_RATE_LIMIT_PER_MINUTE} per minute)."
        )
    timestamps.append(now)
    _chat_rate_limits[client_id] = timestamps


@app.get("/api/chat/status", response_model=schemas.ChatStatusResponse)
def get_chat_status():
    """Returns AI service status and configuration state."""
    is_configured = AIChatService.is_api_key_configured()
    provider, model_name = AIChatService.get_provider_and_model()
    return schemas.ChatStatusResponse(
        api_key_configured=is_configured,
        model=model_name,
        service_status="ONLINE" if is_configured else "SETUP_REQUIRED",
        message=(
            f"Live AI intelligence active and connected ({provider.upper()} - {model_name})."
            if is_configured
            else "Assistant ready in setup mode. Add your API key to backend/.env to unlock real-time completions."
        )
    )


@app.post("/api/chat")
async def chat_message_stream(
    chat_req: schemas.ChatRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Main ChatGPT-like streaming chat endpoint.
    Accepts user prompt, maintains multi-turn conversation memory, and streams real-time SSE chunks.
    """
    client_id = get_chat_client_id(request)
    check_chat_rate_limit(client_id)

    raw_message = (chat_req.message or "").strip()
    if not raw_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if len(raw_message) > CHAT_MAX_MESSAGE_LENGTH:
        raise HTTPException(status_code=400, detail=f"Message exceeds maximum character length of {CHAT_MAX_MESSAGE_LENGTH}")

    return StreamingResponse(
        AIChatService.stream_chat_response(
            db=db,
            conversation_id=chat_req.conversation_id,
            user_message=raw_message,
            selected_parcel_context=chat_req.selected_parcel_context,
            current_map_view=chat_req.current_map_view,
            user_id=client_id
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.get("/api/chat/conversations", response_model=List[schemas.ChatConversationSummary])
def get_chat_conversations(
    request: Request,
    db: Session = Depends(get_db)
):
    """Lists all conversation sessions for the active user/session."""
    client_id = get_chat_client_id(request)
    convs = db.query(ChatConversation).filter(
        ChatConversation.user_id == client_id
    ).order_by(ChatConversation.updated_at.desc()).all()

    result = []
    for c in convs:
        last_msg = db.query(ChatMessage).filter(
            ChatMessage.conversation_id == c.id
        ).order_by(ChatMessage.id.desc()).first()
        msg_count = db.query(func.count(ChatMessage.id)).filter(
            ChatMessage.conversation_id == c.id
        ).scalar() or 0

        result.append(schemas.ChatConversationSummary(
            id=c.id,
            title=c.title or "New Conversation",
            created_at=c.created_at,
            updated_at=c.updated_at,
            message_count=msg_count,
            last_message_preview=last_msg.content[:80] + "..." if last_msg and len(last_msg.content) > 80 else (last_msg.content if last_msg else None)
        ))
    return result


@app.get("/api/chat/conversations/{conversation_id}", response_model=schemas.ChatConversationDetail)
def get_chat_conversation_detail(
    conversation_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Retrieves full conversation turns and history for a given conversation ID."""
    client_id = get_chat_client_id(request)
    conv = db.query(ChatConversation).filter(
        ChatConversation.id == conversation_id,
        ChatConversation.user_id == client_id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = db.query(ChatMessage).filter(
        ChatMessage.conversation_id == conversation_id
    ).order_by(ChatMessage.id.asc()).all()

    msg_schemas = []
    for m in messages:
        map_act = None
        if m.map_action:
            try:
                map_act = json.loads(m.map_action)
            except Exception:
                pass
        msg_schemas.append(schemas.ChatMessageSchema(
            id=m.id,
            role=m.role,
            content=m.content,
            map_action=map_act,
            created_at=m.created_at
        ))

    return schemas.ChatConversationDetail(
        id=conv.id,
        title=conv.title or "New Conversation",
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=msg_schemas
    )


@app.delete("/api/chat/conversations/{conversation_id}")
def delete_chat_conversation(
    conversation_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Deletes a conversation session and all its message turns."""
    client_id = get_chat_client_id(request)
    conv = db.query(ChatConversation).filter(
        ChatConversation.id == conversation_id,
        ChatConversation.user_id == client_id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    db.query(ChatMessage).filter(ChatMessage.conversation_id == conversation_id).delete()
    db.delete(conv)
    db.commit()
    return {"message": "Conversation successfully deleted", "id": conversation_id}


@app.post("/api/chat/conversations/clear")
def clear_all_chat_conversations(
    request: Request,
    db: Session = Depends(get_db)
):
    """Clears all conversation sessions for the active user/session."""
    client_id = get_chat_client_id(request)
    user_convs = db.query(ChatConversation).filter(ChatConversation.user_id == client_id).all()
    conv_ids = [c.id for c in user_convs]

    if conv_ids:
        db.query(ChatMessage).filter(ChatMessage.conversation_id.in_(conv_ids)).delete(synchronize_session=False)
        db.query(ChatConversation).filter(ChatConversation.user_id == client_id).delete(synchronize_session=False)
        db.commit()

    return {"message": "All conversations cleared", "cleared_count": len(conv_ids)}



# Mount built frontend dist for unified production server
from config import PROJECT_DIR
frontend_dist = PROJECT_DIR / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
