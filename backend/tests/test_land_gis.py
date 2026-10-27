import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from main import app, startup_event

# Ensure DB seed, samples, and GIS cadastral parcels are initialized
startup_event()

client = TestClient(app)

def test_get_land_locations():
    """Verify GET /api/land/locations returns Karnataka pilot districts and hierarchy."""
    response = client.get("/api/land/locations")
    assert response.status_code == 200
    data = response.json()
    assert "districts" in data
    districts = data["districts"]
    d_names = [d["name"] for d in districts]
    assert "Davanagere" in d_names
    assert "Tumakuru" in d_names

    # Check Davanagere hierarchy
    davanagere = next(d for d in districts if d["name"] == "Davanagere")
    taluk_names = [t["name"] for t in davanagere["taluks"]]
    assert "Davanagere" in taluk_names
    assert "Harihara" in taluk_names

    # Check Tumakuru hierarchy
    tumakuru = next(d for d in districts if d["name"] == "Tumakuru")
    t_taluks = [t["name"] for t in tumakuru["taluks"]]
    assert "Tumakuru" in t_taluks
    assert "Tiptur" in t_taluks

def test_search_land_parcels():
    """Verify GET /api/land/parcels/search with various filters."""
    # 1. Search all parcels
    res = client.get("/api/land/parcels/search")
    assert res.status_code == 200
    parcels = res.json()
    assert len(parcels) >= 4

    # 2. Filter by district
    res_tum = client.get("/api/land/parcels/search?district=Tumakuru")
    assert res_tum.status_code == 200
    tum_parcels = res_tum.json()
    assert len(tum_parcels) >= 2
    for p in tum_parcels:
        assert p["district"] == "Tumakuru"

    # 3. Filter by survey number
    res_sy = client.get("/api/land/parcels/search?survey_number=75")
    assert res_sy.status_code == 200
    sy_parcels = res_sy.json()
    assert len(sy_parcels) >= 1
    assert sy_parcels[0]["survey_number"] == "75"
    assert sy_parcels[0]["village"] == "Melekote"

    # 4. Search non-existent parcel
    res_empty = client.get("/api/land/parcels/search?survey_number=999999")
    assert res_empty.status_code == 200
    assert len(res_empty.json()) == 0

def test_get_land_parcel_by_id():
    """Verify GET /api/land/parcels/{id} returns full parcel details with geometry."""
    # Find an existing parcel first
    search_res = client.get("/api/land/parcels/search?survey_number=75")
    assert search_res.status_code == 200
    parcels = search_res.json()
    assert len(parcels) > 0
    parcel_id = parcels[0]["parcel_id"]

    # Fetch by ID
    res = client.get(f"/api/land/parcels/{parcel_id}")
    assert res.status_code == 200
    detail = res.json()
    assert detail["parcel_id"] == parcel_id
    assert detail["survey_number"] == "75"
    assert detail["village"] == "Melekote"
    assert detail["district"] == "Tumakuru"
    assert detail["geometry"] is not None
    assert detail["geometry"]["type"] == "Polygon"
    assert detail["verification_status"] == "VERIFIED_AUTHORIZED"
    assert len(detail["records"]) > 0

    # Non-existent ID returns 404
    res_404 = client.get("/api/land/parcels/999999")
    assert res_404.status_code == 404

def test_identify_parcel_by_polygon_strong_match():
    """Verify POST /api/land/parcels/identify with a polygon matching Survey 75."""
    # Polygon around Melekote Sy 75 centroid approx (13.3510, 77.0850)
    query_polygon = {
        "type": "Polygon",
        "coordinates": [
            [
                [77.0840, 13.3505],
                [77.0860, 13.3505],
                [77.0860, 13.3515],
                [77.0840, 13.3515],
                [77.0840, 13.3505]
            ]
        ]
    }

    res = client.post("/api/land/parcels/identify", json={"polygon": query_polygon})
    assert res.status_code == 200
    data = res.json()
    assert data["match_type"] in ["STRONG_MATCH", "MULTIPLE_CANDIDATES"]
    assert data["candidate_count"] >= 1
    candidates = data["candidates"]
    surveys = [c["survey_number"] for c in candidates]
    assert "75" in surveys or len(surveys) > 0

def test_identify_parcel_by_polygon_no_match():
    """Verify POST /api/land/parcels/identify with a polygon outside pilot coverage returns NO_MATCH."""
    outside_polygon = {
        "type": "Polygon",
        "coordinates": [
            [
                [70.0000, 10.0000],
                [70.0100, 10.0000],
                [70.0100, 10.0100],
                [70.0000, 10.0100],
                [70.0000, 10.0000]
            ]
        ]
    }

    res = client.post("/api/land/parcels/identify", json={"polygon": outside_polygon})
    assert res.status_code == 200
    data = res.json()
    assert data["match_type"] == "NO_MATCH"
    assert data["candidate_count"] == 0
    assert "No verified land parcel found" in data["message"]

def test_get_land_parcel_records_and_documents():
    """Verify GET /api/land/parcels/{id}/records returns linked records and documents."""
    # Find parcel 75
    search_res = client.get("/api/land/parcels/search?survey_number=75")
    parcels = search_res.json()
    assert len(parcels) > 0
    parcel_id = parcels[0]["parcel_id"]

    res = client.get(f"/api/land/parcels/{parcel_id}/records")
    assert res.status_code == 200
    data = res.json()
    assert data["parcel_id"] == parcel_id
    assert "records" in data
    assert "documents" in data
    assert len(data["records"]) > 0
    assert len(data["documents"]) > 0

    doc_types = [d["document_type"] for d in data["documents"]]
    assert any("RTC" in dt for dt in doc_types) or any("Tippan" in dt for dt in doc_types)

def test_create_update_delete_land_parcel():
    """Verify POST, PUT, and DELETE /api/land/parcels for user-drawn plot management."""
    test_polygon = {
        "type": "Polygon",
        "coordinates": [
            [
                [77.0800, 13.3500],
                [77.0850, 13.3500],
                [77.0850, 13.3550],
                [77.0800, 13.3550],
                [77.0800, 13.3500]
            ]
        ]
    }

    create_payload = {
        "district": "Tumakuru",
        "taluk": "Tumakuru",
        "hobli": "Kasaba",
        "village": "Melekote",
        "survey_number": "999TEST",
        "hissa_number": "1A",
        "boundary_geojson": test_polygon,
        "area_acres": 2.75,
        "perimeter_meters": 450.0,
        "land_type": "Agricultural",
        "owner_name": "Test Farmer",
        "notes": "Created via automated test",
        "verification_status": "USER_DRAWN_UNVERIFIED"
    }

    # 1. Create Parcel
    res = client.post("/api/land/parcels", json=create_payload)
    assert res.status_code == 201
    created = res.json()
    assert created["survey_number"] == "999TEST"
    assert created["village"] == "Melekote"
    assert created["area_acres"] == 2.75
    assert created["land_type"] == "Agricultural"
    assert created["verification_status"] == "USER_DRAWN_UNVERIFIED"
    parcel_id = created["id"]

    # 2. Update Parcel
    update_payload = {
        "owner_name": "Updated Farmer Name",
        "notes": "Updated notes",
        "land_type": "Residential"
    }
    update_res = client.put(f"/api/land/parcels/{parcel_id}", json=update_payload)
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["land_type"] == "Residential"
    assert updated["notes"] == "Updated notes"

    # 3. Search and find updated parcel
    search_res = client.get("/api/land/parcels/search?survey_number=999TEST")
    assert search_res.status_code == 200
    found = search_res.json()
    assert len(found) == 1
    assert found[0]["survey_number"] == "999TEST"

    # 4. Delete Parcel
    del_res = client.delete(f"/api/land/parcels/{parcel_id}")
    assert del_res.status_code == 200
    del_data = del_res.json()
    assert del_data["success"] is True

    # 5. Confirm deletion
    get_del = client.get(f"/api/land/parcels/{parcel_id}")
    assert get_del.status_code == 404

def test_search_land_parcels_filters_land_type_and_status():
    """Verify GET /api/land/parcels/search supports land_type and verification_status filters."""
    # Filter by land_type
    res_agri = client.get("/api/land/parcels/search?land_type=Agricultural")
    assert res_agri.status_code == 200
    agri_parcels = res_agri.json()
    assert len(agri_parcels) > 0
    for p in agri_parcels:
        assert "Agricultural" in p["land_type"]

    # Filter by verification_status
    res_status = client.get("/api/land/parcels/search?verification_status=VERIFIED_AUTHORIZED")
    assert res_status.status_code == 200
    verified_parcels = res_status.json()
    assert len(verified_parcels) > 0
    for p in verified_parcels:
        assert p["verification_status"] == "VERIFIED_AUTHORIZED"

