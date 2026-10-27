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


def test_get_district_boundary_davanagere():
    """Verify GET /api/land/boundaries/district/davanagere returns official GeoJSON boundary."""
    res = client.get("/api/land/boundaries/district/davanagere")
    assert res.status_code == 200
    data = res.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) >= 1
    feat = data["features"][0]
    assert feat["geometry"]["type"] in ["Polygon", "MultiPolygon"]
    props = feat["properties"]
    assert "davanagere" in props.get("name", "").lower() or "davanagere" in props.get("district", "").lower() or "davanagere" in props.get("display_name", "").lower()


def test_get_district_boundary_tumakuru():
    """Verify GET /api/land/boundaries/district/tumakuru returns official GeoJSON boundary."""
    res = client.get("/api/land/boundaries/district/tumakuru")
    assert res.status_code == 200
    data = res.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) >= 1
    feat = data["features"][0]
    assert feat["geometry"]["type"] in ["Polygon", "MultiPolygon"]


def test_get_all_district_boundaries():
    """Verify GET /api/land/boundaries/all returns FeatureCollection with both Davanagere and Tumakuru."""
    res = client.get("/api/land/boundaries/all")
    assert res.status_code == 200
    data = res.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) >= 2
    district_ids = [f["properties"].get("district_id") for f in data["features"]]
    assert "davanagere" in district_ids
    assert "tumakuru" in district_ids


def test_get_district_boundary_not_found():
    """Verify non-existent district returns 404 with helpful error."""
    res = client.get("/api/land/boundaries/district/unknown_district")
    assert res.status_code == 404
    assert "Currently supported: Davanagere, Tumakuru" in res.json()["detail"]


def test_search_places_maravanji_disambiguation():
    """
    Verify searching 'Maravanji' returns disambiguated results for:
    1. Maravanji, Channagiri Taluk, Davanagere District
    2. Maravanji, Kaduru Taluk, Chikkamagaluru District
    And verifies Davanagere Maravanji has accurate coordinates and is a point location.
    """
    res = client.get("/api/land/search/places?q=Maravanji")
    assert res.status_code == 200
    data = res.json()
    assert data["count"] >= 2
    results = data["results"]

    # Check Davanagere Maravanji
    dvg_maravanji = next((p for p in results if p["district"] == "Davanagere"), None)
    assert dvg_maravanji is not None
    assert dvg_maravanji["name"] == "Maravanji"
    assert dvg_maravanji["taluk"] == "Channagiri"
    assert dvg_maravanji["name_kn"] == "ಮರವಂಜಿ"
    assert abs(dvg_maravanji["lat"] - 13.9465) < 0.01
    assert abs(dvg_maravanji["lng"] - 75.9745) < 0.01
    assert dvg_maravanji["is_verified"] is True
    # Crucial non-fabrication requirement: Maravanji must NOT claim a fake polygon
    assert dvg_maravanji["has_boundary_polygon"] is False

    # Check Kaduru Maravanji disambiguation
    ckm_maravanji = next((p for p in results if p["district"] == "Chikkamagaluru"), None)
    assert ckm_maravanji is not None
    assert ckm_maravanji["taluk"] == "Kaduru"


def test_search_places_kannada_query():
    """Verify searching in Kannada script returns correct places."""
    res = client.get("/api/land/search/places?q=ಮರವಂಜಿ")
    assert res.status_code == 200
    data = res.json()
    assert data["count"] >= 1
    assert any("maravanji" in p["name"].lower() for p in data["results"])

    # Search Davanagere in Kannada
    res_dvg = client.get("/api/land/search/places?q=ದಾವಣಗೆರೆ")
    assert res_dvg.status_code == 200
    assert res_dvg.json()["count"] >= 1


def test_search_places_taluks_and_cities():
    """Verify search finds key taluks and towns in Davanagere and Tumakuru."""
    # Harihara
    res = client.get("/api/land/search/places?q=Harihara")
    assert res.status_code == 200
    results = res.json()["results"]
    assert any(p["name"] == "Harihara" for p in results)

    # Channagiri
    res = client.get("/api/land/search/places?q=Channagiri")
    assert res.status_code == 200
    assert any(p["name"] == "Channagiri" for p in res.json()["results"])

    # Tumakuru
    res = client.get("/api/land/search/places?q=Tumakuru")
    assert res.status_code == 200
    assert any(p["name"] == "Tumakuru" for p in res.json()["results"])

    # Bellavi
    res = client.get("/api/land/search/places?q=Bellavi")
    assert res.status_code == 200
    assert any(p["name"] == "Bellavi" for p in res.json()["results"])


def test_coverage_metadata():
    """Verify GET /api/land/coverage/metadata returns comprehensive transparent data pipeline information."""
    res = client.get("/api/land/coverage/metadata")
    assert res.status_code == 200
    data = res.json()
    assert "districts_covered" in data
    districts = [d["name"] for d in data["districts_covered"]]
    assert "Davanagere" in districts
    assert "Tumakuru" in districts

    dvg = next(d for d in data["districts_covered"] if d["name"] == "Davanagere")
    assert dvg["taluks_count"] == 6
    assert "Channagiri" in dvg["taluks"]
    assert "bbox" in dvg

    tum = next(d for d in data["districts_covered"] if d["name"] == "Tumakuru")
    assert tum["taluks_count"] == 10
    assert "Tiptur" in tum["taluks"]

    assert "WGS84" in data["crs"]
    assert "trust_guarantee" in data
    assert "non-fabrication" in data["trust_guarantee"].lower()


def test_search_places_survey_number():
    """Verify searching for survey number e.g. '75' returns matching cadastral parcels."""
    res = client.get("/api/land/search/places?q=75")
    assert res.status_code == 200
    data = res.json()
    assert data["count"] >= 1
    # Check that Survey 75 is returned as a cadastral parcel
    parcel = next((p for p in data["results"] if p.get("place_type") == "cadastral_parcel"), None)
    assert parcel is not None
    assert "75" in parcel["name"]
    assert parcel["has_boundary_polygon"] is True
    assert parcel["is_cadastral_parcel"] is True
    assert parcel["district"] == "Tumakuru"


def test_search_places_pincode():
    """Verify 6-digit Indian PIN code search routes to postal geocoding."""
    res = client.get("/api/land/search/places?q=577002")
    assert res.status_code == 200
    data = res.json()
    assert "results" in data


def test_get_osm_buildings_endpoint():
    """Verify GET /api/land/buildings/osm returns FeatureCollection."""
    res = client.get("/api/land/buildings/osm?min_lat=14.464&min_lng=75.921&max_lat=14.468&max_lng=75.925")
    assert res.status_code == 200
    data = res.json()
    assert data["type"] == "FeatureCollection"
    assert "features" in data


def test_import_geojson_boundary():
    """Verify POST /api/land/parcels/import-geojson parses boundary and computes area."""
    test_geojson = {
        "type": "Feature",
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [75.9410, 14.4480],
                    [75.9430, 14.4480],
                    [75.9430, 14.4500],
                    [75.9410, 14.4500],
                    [75.9410, 14.4480]
                ]
            ]
        },
        "properties": {"name": "Test Boundary Sketch"}
    }
    res = client.post("/api/land/parcels/import-geojson", json=test_geojson)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["area_acres"] > 0
    assert data["centroid"]["lat"] > 0
    assert "spatial_match" in data


def test_sample_maravanji_rtc():
    """Verify test-sample endpoint runs Maravanji RTC sample."""
    res = client.post("/api/documents/test-sample/maravanji_rtc")
    assert res.status_code == 200
    data = res.json()
    assert "document_id" in data
    assert "extracted_fields" in data
    assert "verification_result" in data
    assert data["extracted_fields"].get("village") == "Maravanji"


def test_search_places_sit_tumakuru():
    """Verify searching for 'Siddaganga Institute of Technology, Tumakuru' returns accurate college coordinates."""
    res = client.get("/api/land/search/places?q=Siddaganga Institute of Technology, Tumakuru")
    assert res.status_code == 200
    data = res.json()
    assert data["count"] >= 1
    sit = data["results"][0]
    assert "Siddaganga" in sit["name"]
    assert abs(sit["lat"] - 13.3269) < 0.02
    assert abs(sit["lng"] - 77.1261) < 0.02
    assert sit["zoom"] >= 16


def test_search_places_tumakuru_city():
    """Verify searching for 'Tumakuru city' returns Tumakuru city coordinates."""
    res = client.get("/api/land/search/places?q=Tumakuru city")
    assert res.status_code == 200
    data = res.json()
    assert data["count"] >= 1
    match = next((p for p in data["results"] if "Tumakuru" in p["name"]), None)
    assert match is not None
    assert abs(match["lat"] - 13.3409) < 0.02
    assert abs(match["lng"] - 77.1010) < 0.02


def test_search_places_davanagere():
    """Verify searching for 'Davanagere' returns Davanagere coordinates."""
    res = client.get("/api/land/search/places?q=Davanagere")
    assert res.status_code == 200
    data = res.json()
    assert data["count"] >= 1
    match = next((p for p in data["results"] if "Davanagere" in p["name"]), None)
    assert match is not None
    assert abs(match["lat"] - 14.4644) < 0.02
    assert abs(match["lng"] - 75.9218) < 0.02


def test_search_places_mysuru_palace():
    """Verify searching for 'Mysuru Palace' resolves accurate coordinates in Karnataka."""
    res = client.get("/api/land/search/places?q=Mysuru Palace")
    assert res.status_code == 200
    data = res.json()
    assert data["count"] >= 1
    match = data["results"][0]
    assert "Mysuru" in match["name"] or "Mysuru" in match.get("display_name", "")
    assert abs(match["lat"] - 12.3052) < 0.03
    assert abs(match["lng"] - 76.6552) < 0.03


def test_search_places_gps_coordinates():
    """Verify direct coordinate string '13.3409, 77.1010' resolves to coordinates place type with zoom 17."""
    res = client.get("/api/land/search/places?q=13.3409, 77.1010")
    assert res.status_code == 200
    data = res.json()
    assert data["count"] == 1
    coord_place = data["results"][0]
    assert coord_place["place_type"] == "coordinates"
    assert abs(coord_place["lat"] - 13.3409) < 0.0001
    assert abs(coord_place["lng"] - 77.1010) < 0.0001
    assert coord_place["zoom"] == 17

