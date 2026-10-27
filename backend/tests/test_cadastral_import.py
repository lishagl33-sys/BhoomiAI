import sys
import json
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from main import app, startup_event

startup_event()
client = TestClient(app)


def test_import_cadastral_valid_sample():
    """
    Test 1: Import valid synthetic GeoJSON sample (tumakuru_melekote_sample_cadastral.geojson).
    Verifies features are imported and summary reflects counts.
    """
    sample_path = backend_dir / "sample_data" / "tumakuru_melekote_sample_cadastral.geojson"
    assert sample_path.exists(), f"Sample dataset not found at {sample_path}"

    with open(sample_path, "rb") as f:
        res = client.post(
            "/api/land/parcels/import-cadastral",
            files={"file": ("tumakuru_melekote_sample_cadastral.geojson", f, "application/geo+json")},
            data={"district": "Tumakuru", "taluk": "Tumakuru", "village": "Melekote"}
        )

    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "COMPLETED"
    assert data["total_features"] == 3
    # Either imported or duplicate_skipped depending on test runs
    assert data["imported_count"] + data["duplicate_count"] == 3
    assert data["rejected_count"] == 0


def test_import_cadastral_duplicate_prevention():
    """
    Test 2: Re-importing the same dataset must detect duplicates and prevent double insertions.
    """
    sample_path = backend_dir / "sample_data" / "tumakuru_melekote_sample_cadastral.geojson"
    with open(sample_path, "rb") as f:
        res = client.post(
            "/api/land/parcels/import-cadastral",
            files={"file": ("tumakuru_melekote_sample_cadastral.geojson", f, "application/geo+json")},
            data={"district": "Tumakuru", "taluk": "Tumakuru", "village": "Melekote"}
        )

    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "COMPLETED"
    assert data["duplicate_count"] == 3
    assert data["imported_count"] == 0


def test_import_cadastral_reject_invalid_unclosed_ring():
    """
    Test 3: Reject polygon where linear ring is unclosed (first pt != last pt).
    """
    bad_geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"survey_number": "999"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [77.0840, 13.3510],
                            [77.0855, 13.3510],
                            [77.0855, 13.3525],
                            [77.0840, 13.3525]
                            # Unclosed: missing final [77.0840, 13.3510]
                        ]
                    ]
                }
            }
        ]
    }

    res = client.post(
        "/api/land/parcels/import-cadastral",
        files={"file": ("unclosed.geojson", json.dumps(bad_geojson).encode(), "application/geo+json")},
        data={"district": "Tumakuru", "taluk": "Tumakuru", "village": "Melekote"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["rejected_count"] == 1
    assert data["imported_count"] == 0
    assert "unclosed" in data["details"][0]["reason"].lower()


def test_import_cadastral_reject_missing_survey_number():
    """
    Test 4: Reject feature lacking survey_number property.
    """
    bad_geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"owner": "Unknown"}, # No survey_number
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [77.0840, 13.3510],
                            [77.0855, 13.3510],
                            [77.0855, 13.3525],
                            [77.0840, 13.3525],
                            [77.0840, 13.3510]
                        ]
                    ]
                }
            }
        ]
    }

    res = client.post(
        "/api/land/parcels/import-cadastral",
        files={"file": ("no_sy.geojson", json.dumps(bad_geojson).encode(), "application/geo+json")},
        data={"district": "Tumakuru", "taluk": "Tumakuru", "village": "Melekote"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["rejected_count"] == 1
    assert "survey_number" in data["details"][0]["reason"]


def test_user_drawn_parcels_endpoint():
    """
    Test 5: Verify GET /api/land/parcels/user-drawings returns user plots.
    """
    res = client.get("/api/land/parcels/user-drawings")
    assert res.status_code == 200
    assert isinstance(res.json(), list)
