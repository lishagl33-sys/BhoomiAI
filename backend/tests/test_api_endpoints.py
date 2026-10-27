import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from main import app, startup_event

# Ensure DB seed, samples, and genesis block are created
startup_event()

client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "BhoomiAI" in data["service"]
    assert "indic_ocr_modules" in data
    assert "gis_satellite_engine" in data
    assert "blockchain_ledger" in data

def test_karnataka_location_hierarchy():
    # 1. Districts
    d_res = client.get("/api/locations/districts")
    assert d_res.status_code == 200
    districts = d_res.json()
    d_names = [d["name"] for d in districts]
    assert "Davanagere" in d_names
    assert "Tumakuru" in d_names

    # 2. Taluks under Davanagere
    t_res = client.get("/api/locations/taluks?district_name=Davanagere")
    assert t_res.status_code == 200
    taluks = t_res.json()
    t_names = [t["name"] for t in taluks]
    assert "Davanagere" in t_names
    assert "Harihara" in t_names
    assert "Channagiri" in t_names

    # 3. Hoblis under Davanagere taluk
    h_res = client.get("/api/locations/hoblis?taluk_name=Davanagere")
    assert h_res.status_code == 200
    hoblis = h_res.json()
    h_names = [h["name"] for h in hoblis]
    assert "Kasaba" in h_names

    # 4. Villages under Kasaba hobli
    v_res = client.get("/api/locations/villages?hobli_name=Kasaba")
    assert v_res.status_code == 200
    villages = v_res.json()
    assert len(villages) >= 3

def test_reference_dataset_endpoints():
    # 1. Download CSV template
    tmpl_res = client.get("/api/reference/template.csv")
    assert tmpl_res.status_code == 200
    assert "district,taluk,hobli,village,survey_number" in tmpl_res.text

    # 2. Query Reference Parcels
    p_res = client.get("/api/reference/parcels?district=Tumakuru")
    assert p_res.status_code == 200
    parcels = p_res.json()
    assert len(parcels) >= 1
    p0 = parcels[0]
    assert p0["district"] == "Tumakuru"
    assert "is_synthetic" in p0
    assert p0["is_synthetic"] is True

def test_tumakuru_sample_verification():
    response = client.post("/api/documents/test-sample/tumakuru_rtc")
    assert response.status_code == 200
    res = response.json()
    assert res["language"] == "kn"
    assert "verification_result" in res
    assert res["verification_result"] is not None
    assert res["verification_result"]["final_status"] in ["MATCH", "NEEDS_REVIEW"]
    assert len(res["verification_result"]["field_comparisons"]) >= 3

def test_frontend_dist_served():
    response = client.get("/")
    assert response.status_code == 200
    assert "LandNova" in response.text or "Bhoomi" in response.text or "html" in response.text.lower()

def test_dashboard_stats_endpoint():
    response = client.get("/api/dashboard/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_documents" in data
    assert "total_records" in data
    assert "valid_records" in data
    assert "records_with_issues" in data
    assert "potential_duplicates" in data
    assert "data_mismatches" in data
    assert "total_blockchain_blocks" in data
    assert "gis_encroachments_count" in data
    assert "field_inspections_count" in data
    assert data["total_records"] >= 3

def test_get_records_endpoint():
    response = client.get("/api/records")
    assert response.status_code == 200
    records = response.json()
    assert len(records) >= 3
    # Check that survey numbers exist
    surveys = [r["survey_number"] for r in records]
    assert "142/2" in surveys

def test_gis_parcels_endpoint():
    response = client.get("/api/gis/parcels")
    assert response.status_code == 200
    parcels = response.json()
    assert len(parcels) >= 3
    p0 = parcels[0]
    assert "polygon" in p0
    assert len(p0["polygon"]) >= 4
    assert "corners" in p0
    assert "encroachment_flag" in p0

def test_blockchain_ledger_and_verification():
    # 1. Fetch blocks
    response = client.get("/api/blockchain/blocks")
    assert response.status_code == 200
    blocks = response.json()
    assert len(blocks) >= 1
    assert "GENESIS" in blocks[0]["action"]
    assert len(blocks[0]["current_hash"]) == 64

    # 2. Verify chain integrity
    verify_res = client.post("/api/blockchain/verify")
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["is_valid"] is True
    assert v_data["total_blocks"] >= 1

def test_field_inspection_submission():
    # Get record 1 location
    rec_res = client.get("/api/records/1")
    assert rec_res.status_code == 200
    rec = rec_res.json()
    r_lat = rec["latitude"] or 13.2924
    r_lng = rec["longitude"] or 77.8012

    payload = {
        "record_id": 1,
        "inspector_id": "REV-TEST-001",
        "inspector_name": "Test Inspector",
        "inspection_lat": r_lat + 0.0001,
        "inspection_lng": r_lng + 0.0001,
        "boundary_stones_verified": True,
        "crop_status": "Paddy Cultivation",
        "occupant_match": True,
        "notes": "Pytest automated verification of boundary stones."
    }
    response = client.post("/api/inspections/submit", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["within_geofence"] is True
    assert data["distance_to_boundary_m"] < 50.0

def test_sample_rtc_ingestion_and_nlp():
    response = client.post("/api/documents/test-sample/rtc_karnataka")
    assert response.status_code == 200
    res = response.json()
    assert res["document_type"] in ["RTC / Pahani (Form 16)", "Land Record (General)", "Mutation Extract (Form 21 / MR)"]
    assert "survey_number" in res["extracted_fields"]
    assert res["extracted_fields"]["survey_number"] == "142/2"
    assert "Ramesh" in res["extracted_fields"]["owner_name"]
    assert res["confidence_score"] > 0.6
    assert res["record_id"] is not None

def test_indic_kannada_sample_ingestion():
    response = client.post("/api/documents/test-sample/kannada_rtc")
    assert response.status_code == 200
    res = response.json()
    assert res["language"] == "kn"
    assert "survey_number" in res["extracted_fields"]
    assert res["record_id"] is not None

def test_sample_sale_deed_mismatch_detection():
    response = client.post("/api/documents/test-sample/sale_deed_mismatch")
    assert response.status_code == 200
    res = response.json()
    assert res["document_type"] in ["Registered Sale Deed", "Land Record (General)"]
    assert len(res["mismatches_detected"]) >= 1

def test_sample_duplicate_detection():
    response = client.post("/api/documents/test-sample/duplicate_rtc")
    assert response.status_code == 200
    res = response.json()
    assert len(res["duplicates_detected"]) >= 1
    assert res["duplicates_detected"][0]["similarity_score"] >= 75.0

def test_report_generation_endpoint():
    response = client.post("/api/reports/generate/1")
    assert response.status_code == 200
    data = response.json()
    assert "report_id" in data
    assert "download_url" in data

    download_res = client.get(data["download_url"])
    assert download_res.status_code == 200
    assert download_res.headers["content-type"] == "application/pdf"
    assert len(download_res.content) > 1000

def test_frontend_dist_served():
    response = client.get("/")
    assert response.status_code == 200
    assert "Bhoomi" in response.text
