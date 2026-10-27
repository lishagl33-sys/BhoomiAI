import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from main import app, startup_event

startup_event()
client = TestClient(app)


def test_survey_lookup_verified_geometry():
    """
    Test 1: Successful search for existing parcel with verified geometry:
    Tumakuru -> Tumakuru -> Kasaba -> Melekote -> Survey 75, Hissa 2A.
    """
    res = client.get("/api/land/parcels/survey-lookup", params={
        "district": "Tumakuru",
        "taluk": "Tumakuru",
        "hobli": "Kasaba",
        "village": "Melekote",
        "survey_number": "75",
        "hissa_number": "2A"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "VERIFIED_GEOMETRY_FOUND"
    assert data["has_geometry"] is True
    assert data["geometry"] is not None
    assert data["geometry"]["type"] in ["Polygon", "MultiPolygon"]
    assert data["survey_number"] == "75"
    assert data["hissa_number"] == "2A"
    assert data["area_acres"] > 0
    assert "extent_display" in data
    assert data["verification_status"] == "VERIFIED_AUTHORIZED"


def test_survey_lookup_invalid_subdivision():
    """
    Test 2: Survey 75 exists in Melekote, but subdivision '99X' is invalid.
    Must return INVALID_SUBDIVISION with available subdivisions.
    """
    res = client.get("/api/land/parcels/survey-lookup", params={
        "district": "Tumakuru",
        "taluk": "Tumakuru",
        "hobli": "Kasaba",
        "village": "Melekote",
        "survey_number": "75",
        "hissa_number": "99X"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "INVALID_SUBDIVISION"
    assert "available_subdivisions" in data
    assert len(data["available_subdivisions"]) >= 1
    assert "1" in data["available_subdivisions"] or "2A" in data["available_subdivisions"]


def test_survey_lookup_record_found_geometry_missing():
    """
    Test 3: Survey 89, Hissa 1 in Mallasandra exists in ReferenceParcel revenue baseline,
    but has no digitized GIS polygon in LandParcel.
    Must return RECORD_FOUND_GEOMETRY_MISSING and never fabricate fake coordinates.
    """
    res = client.get("/api/land/parcels/survey-lookup", params={
        "district": "Tumakuru",
        "taluk": "Tumakuru",
        "hobli": "Bellavi",
        "village": "Mallasandra",
        "survey_number": "89",
        "hissa_number": "1"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "RECORD_FOUND_GEOMETRY_MISSING"
    assert data["has_geometry"] is False
    assert data["geometry"] is None
    assert data["area_acres"] > 0
    assert "owner_name" in data
    assert "guidance" in data


def test_survey_lookup_missing_survey_number():
    """
    Test 4: Survey 9999999 does not exist in Melekote.
    Must return RECORD_NOT_FOUND.
    """
    res = client.get("/api/land/parcels/survey-lookup", params={
        "district": "Tumakuru",
        "taluk": "Tumakuru",
        "hobli": "Kasaba",
        "village": "Melekote",
        "survey_number": "9999999"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "RECORD_NOT_FOUND"


def test_survey_lookup_no_dataset_configured_for_village():
    """
    Test 5: Village 'Pandithanahalli' has no records configured in current database.
    Must report NO_DATASET_CONFIGURED and state what dataset must be imported.
    """
    res = client.get("/api/land/parcels/survey-lookup", params={
        "district": "Tumakuru",
        "taluk": "Tumakuru",
        "hobli": "Urdigere",
        "village": "Pandithanahalli",
        "survey_number": "10"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "NO_DATASET_CONFIGURED"
    assert "required_dataset" in data
