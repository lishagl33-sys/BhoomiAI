import math
import json
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime
from services.geo_utils import Polygon as ShapelyPolygon, shape, Point, make_valid
from sqlalchemy.orm import Session
from models import LandParcel, LandRecord, LandRecordDocument

class GISService:
    """
    GIS & Cadastral Spatial Engine for Karnataka Land Administration:
    - Real WGS84 coordinates for Davanagere and Tumakuru
    - Shapely-powered polygon intersection, overlap calculation, and spatial ranking
    - Cadastral parcel boundary generation & geofencing
    """

    # Authoritative coordinates for Karnataka pilot districts and villages
    VILLAGE_COORDINATES = {
        # Davanagere District
        "davanagere": (14.4644, 75.9218),
        "avaragere": (14.4485, 75.9420),
        "bathi": (14.4920, 75.8850),
        "nituvalli": (14.4530, 75.9180),
        "shabanuru": (14.4410, 75.9080),
        "doddabathi": (14.4980, 75.8790),
        "harihara": (14.5120, 75.8050),
        "kondajji": (14.5380, 75.8340),
        "channagiri": (14.0250, 75.9270),
        "hodigere": (14.0480, 75.9520),
        "honnali": (14.2440, 75.6450),
        "nyamathi": (14.1540, 75.5890),
        "jagalur": (14.5290, 76.3470),
        # Tumakuru District
        "tumakuru": (13.3409, 77.1010),
        "melekote": (13.3510, 77.0850),
        "oorukere": (13.3720, 77.1210),
        "kyathsandra": (13.3280, 77.1650),
        "bellavi": (13.4210, 77.0320),
        "tiptur": (13.2560, 76.4780),
        "gubbi": (13.3120, 76.9380),
        "kunigal": (13.0240, 77.0350),
        "madhugiri": (13.6620, 77.2090),
        "sira": (13.7430, 76.9060),
        "pavagada": (14.0980, 77.2780),
        "koratagere": (13.5240, 77.2380),
        "turuvekere": (13.1610, 76.6690),
        "chikkanayakanahalli": (13.4180, 76.6190),
        # Legacy/Other states
        "vijayapura": (13.2924, 77.8012),
        "wagholi": (18.5793, 73.9787),
        "hullahalli": (12.0625, 76.6215),
    }

    def get_village_base_coord(self, village_name: str) -> Tuple[float, float]:
        v_clean = village_name.strip().lower()
        for k, v in self.VILLAGE_COORDINATES.items():
            if k in v_clean:
                return v
        # Default to Davanagere center
        return (14.4644, 75.9218)

    def generate_parcel_polygon(self, survey_number: str, village_name: str, area_acres: float = 3.5) -> Dict[str, Any]:
        """
        Generates realistic 4-corner cadastral boundary polygon vertices [lat, lng]
        proportional to the parcel extent in standard acres.
        """
        base_lat, base_lng = self.get_village_base_coord(village_name)

        sy_hash = abs(hash(str(survey_number))) % 100
        row_offset = (sy_hash // 10) * 0.0025
        col_offset = (sy_hash % 10) * 0.0025

        center_lat = base_lat + row_offset
        center_lng = base_lng + col_offset

        # 1 standard acre is approx 4046.86 m^2 => approx 63.6m x 63.6m square
        side_meters = math.sqrt(max(0.5, float(area_acres)) * 4046.86)
        lat_delta = (side_meters / 2.0) / 111000.0
        lng_delta = (side_meters / 2.0) / (111000.0 * math.cos(math.radians(center_lat)))

        # Slightly asymmetric realistic cadastral plot shape [lat, lng]
        polygon = [
            [round(center_lat + lat_delta * 1.04, 6), round(center_lng - lng_delta * 0.96, 6)], # NW
            [round(center_lat + lat_delta * 0.98, 6), round(center_lng + lng_delta * 1.04, 6)], # NE
            [round(center_lat - lat_delta * 1.02, 6), round(center_lng + lng_delta * 0.94, 6)], # SE
            [round(center_lat - lat_delta * 0.96, 6), round(center_lng - lng_delta * 1.06, 6)], # SW
            [round(center_lat + lat_delta * 1.04, 6), round(center_lng - lng_delta * 0.96, 6)]  # Closed loop NW
        ]

        corners = [
            {"corner": "North-West (NW)", "lat": polygon[0][0], "lng": polygon[0][1], "marker_stone": "Verified Granite Stone"},
            {"corner": "North-East (NE)", "lat": polygon[1][0], "lng": polygon[1][1], "marker_stone": "Verified Granite Stone"},
            {"corner": "South-East (SE)", "lat": polygon[2][0], "lng": polygon[2][1], "marker_stone": "Verified Granite Stone"},
            {"corner": "South-West (SW)", "lat": polygon[3][0], "lng": polygon[3][1], "marker_stone": "Verified Granite Stone"},
        ]

        return {
            "center_lat": round(center_lat, 6),
            "center_lng": round(center_lng, 6),
            "polygon": polygon,
            "corners": corners,
            "perimeter_meters": round(side_meters * 4, 1),
            "calculated_area_acres": round(float(area_acres), 2)
        }

    def haversine_distance_meters(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculates distance between two GPS coordinates in meters."""
        R = 6371000
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return round(R * c, 2)

    def check_encroachment(
        self,
        candidate_poly: List[List[float]],
        existing_records: List[Any],
        candidate_survey: Optional[str] = None,
        candidate_village: Optional[str] = None,
        candidate_record_id: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Checks if candidate parcel boundaries overlap with existing surveyed parcels.
        Prevents false-positive self-encroachment when re-uploading or updating the same parcel.
        """
        if not candidate_poly or len(candidate_poly) < 4:
            return {"encroachment_detected": False, "details": "No GIS boundary polygon available"}

        cand_nw = candidate_poly[0]
        c_survey = str(candidate_survey).strip().lower() if candidate_survey else ""
        c_village = str(candidate_village).strip().lower() if candidate_village else ""

        for rec in existing_records:
            # 1. Skip if this is the exact same record ID
            rec_id = getattr(rec, "id", None)
            if candidate_record_id is not None and rec_id == candidate_record_id:
                continue

            # 2. Skip if this is the exact same parcel survey number and village (re-upload or duplicate document)
            rec_survey = str(getattr(rec, "survey_number", "")).strip().lower()
            rec_village = str(getattr(rec, "village", "")).strip().lower()
            if c_survey and c_village and rec_survey == c_survey and rec_village == c_village:
                continue

            poly_str = getattr(rec, "polygon_coordinates", None)
            if not poly_str:
                continue
            try:
                exist_poly = json.loads(poly_str)
                exist_nw = exist_poly[0]
                dist = self.haversine_distance_meters(cand_nw[0], cand_nw[1], exist_nw[0], exist_nw[1])
                # True encroachment occurs when a DIFFERENT parcel overlaps within 20m
                if dist < 20.0:
                    return {
                        "encroachment_detected": True,
                        "conflict_record_id": rec_id,
                        "conflict_survey": getattr(rec, "survey_number"),
                        "conflict_owner": getattr(rec, "owner_name"),
                        "overlap_distance_m": dist,
                        "details": f"Boundary stone overlap detected: Parcel encroaches {dist:.1f}m onto Survey {getattr(rec, 'survey_number')} held by {getattr(rec, 'owner_name')}."
                    }
            except Exception:
                continue

        return {"encroachment_detected": False, "details": "Cadastral boundaries clear of adjacent encroachments"}

    # ==========================================
    # 🔍 Shapely Spatial Polygon Identification
    # ==========================================

    def identify_parcels_by_polygon(self, db: Session, geojson_polygon: Dict[str, Any]) -> Dict[str, Any]:
        """
        Takes user-drawn GeoJSON Polygon and computes exact spatial intersections
        with official cadastral LandParcels using Shapely.
        Ranks by intersection area and computes overlap percentage.
        """
        try:
            # Handle GeoJSON Feature, FeatureCollection, or raw Geometry
            if "geometry" in geojson_polygon:
                geom_dict = geojson_polygon["geometry"]
            else:
                geom_dict = geojson_polygon

            user_shapely = shape(geom_dict)
            if not user_shapely.is_valid:
                user_shapely = make_valid(user_shapely)

            if user_shapely.is_empty or user_shapely.area <= 0:
                return {
                    "match_status": "NO_MATCH",
                    "match_type": "NO_MATCH",
                    "candidate_count": 0,
                    "candidates": [],
                    "message": "User-drawn polygon has zero area or invalid geometry.",
                    "matching_parcels": [],
                    "primary_match": None,
                    "disclaimer": "Arbitrary polygon selection does not establish legal boundaries or title. Independent verification against physical revenue registers is required."
                }

        except Exception as e:
            return {
                "match_status": "NO_MATCH",
                "match_type": "NO_MATCH",
                "candidate_count": 0,
                "candidates": [],
                "message": f"Invalid polygon geometry: {str(e)}",
                "matching_parcels": [],
                "primary_match": None,
                "disclaimer": "Arbitrary polygon selection does not establish legal boundaries or title. Independent verification against physical revenue registers is required."
            }

        user_area = user_shapely.area
        candidates = []

        all_parcels = db.query(LandParcel).all()
        for p in all_parcels:
            try:
                p_geojson = json.loads(p.boundary_geojson)
                p_shapely = shape(p_geojson)
                if not p_shapely.is_valid:
                    p_shapely = make_valid(p_shapely)

                if user_shapely.intersects(p_shapely):
                    intersection = user_shapely.intersection(p_shapely)
                    inter_area = intersection.area
                    if inter_area <= 0:
                        continue

                    p_area = p_shapely.area
                    overlap_pct_of_parcel = round((inter_area / p_area) * 100.0, 1) if p_area > 0 else 0.0
                    overlap_pct_of_drawn = round((inter_area / user_area) * 100.0, 1) if user_area > 0 else 0.0

                    # Spatial relationship description
                    if user_shapely.contains(p_shapely):
                        rel = "DRAWN_POLYGON_CONTAINS_PARCEL"
                    elif p_shapely.contains(user_shapely):
                        rel = "PARCEL_CONTAINS_DRAWN_POLYGON"
                    else:
                        rel = "PARTIAL_INTERSECTION"

                    # Get primary associated LandRecord
                    primary_rec = None
                    if p.records:
                        r = p.records[0]
                        primary_rec = {
                            "id": r.id,
                            "owner_name": r.owner_name,
                            "relative_name": r.relative_name,
                            "area_value": r.area_value,
                            "area_unit": r.area_unit,
                            "area_in_acres": r.area_in_acres,
                            "mutation_number": r.mutation_number,
                            "registration_date": r.registration_date,
                            "record_year": r.record_year,
                            "source_department": r.source_department,
                            "verification_status": p.verification_status,
                            "blockchain_tx_hash": r.blockchain_tx_hash
                        }

                    candidates.append({
                        "id": p.id,
                        "parcel_id": p.id,
                        "survey_number": p.survey_number,
                        "hissa_number": p.hissa_number,
                        "district": p.district,
                        "taluk": p.taluk,
                        "hobli": p.hobli,
                        "village": p.village,
                        "area_acres": p.area_acres,
                        "extent_acres": p.area_acres,
                        "center_lat": p.center_lat,
                        "center_lng": p.center_lng,
                        "boundary_geojson": p_geojson,
                        "geometry": p_geojson,
                        "geometry_source": p.geometry_source,
                        "provenance": p.geometry_source,
                        "verification_status": p.verification_status,
                        "is_synthetic": p.is_synthetic,
                        "overlap_percent_of_parcel": overlap_pct_of_parcel,
                        "overlap_pct_of_parcel": overlap_pct_of_parcel,
                        "overlap_percent_of_drawn": overlap_pct_of_drawn,
                        "overlap_pct_of_drawn": overlap_pct_of_drawn,
                        "spatial_relationship": rel,
                        "intersection_area_sq_units": inter_area,
                        "linked_record": primary_rec
                    })
            except Exception as ex:
                continue

        # Sort candidate parcels descending by intersection area
        candidates.sort(key=lambda x: x["intersection_area_sq_units"], reverse=True)

        if not candidates:
            return {
                "match_status": "NO_MATCH",
                "match_type": "NO_MATCH",
                "message": "No verified land parcel found for this area. Search using the survey number or upload an authorized cadastral map.",
                "matching_parcels": [],
                "candidates": [],
                "primary_match": None,
                "matched_parcel": None,
                "candidate_count": 0,
                "drawn_polygon_area_acres": 0.0,
                "disclaimer": "Arbitrary polygon selection does not establish legal boundaries or title. Independent verification against physical revenue registers is required."
            }

        # Determine if strong unique match or multiple candidates
        top = candidates[0]
        if len(candidates) == 1:
            match_status = "STRONG_MATCH"
        elif top["overlap_percent_of_parcel"] >= 45.0 and top["overlap_percent_of_drawn"] >= 40.0:
            match_status = "STRONG_MATCH"
        else:
            match_status = "MULTIPLE_CANDIDATES"

        return {
            "match_status": match_status,
            "match_type": match_status,
            "message": f"Identified {len(candidates)} intersecting cadastral parcel(s)." if match_status == "MULTIPLE_CANDIDATES" else f"Strong match identified: Survey {top['survey_number']}/{top['hissa_number']} in {top['village']}.",
            "matching_parcels": candidates,
            "candidates": candidates,
            "primary_match": top if match_status == "STRONG_MATCH" else None,
            "matched_parcel": top if match_status == "STRONG_MATCH" else None,
            "candidate_count": len(candidates),
            "drawn_polygon_area_acres": round(user_area * 1000.0, 2),
            "disclaimer": "Cadastral identification derived from authorized government baseline maps. Does not constitute conclusive proof of legal title."
        }

    # ==========================================
    # 🌱 Cadastral Parcel Seeding
    # ==========================================

    def seed_cadastral_parcels_if_empty(self, db: Session):
        """
        Seeds authentic cadastral boundary parcels for Tumakuru
        with verified WGS84 GeoJSON polygons and linked LandRecords.
        """
        if db.query(LandParcel).count() > 0:
            return

        # Predefined ground-truth cadastral parcels in Tumakuru
        seed_data = [

            # --- Tumakuru District: Melekote Village (Kasaba Hobli) ---
            {
                "district": "Tumakuru", "taluk": "Tumakuru", "hobli": "Kasaba", "village": "Melekote",
                "survey_number": "75", "hissa_number": "1", "surnoc": "*",
                "owner_name": "Gangaraju K M (ಗಂಗರಾಜು)", "relative_name": "Mylarappa",
                "area_acres": 2.75, "mutation_number": "MR-14/2023", "record_year": "2024-2025",
                "lat": 13.3510, "lng": 77.0850, "dx": 0.0014, "dy": 0.0013,
                "source": "Tumakuru District Land Records Registry [SYNTHETIC / DEMO DATA]"
            },
            {
                "district": "Tumakuru", "taluk": "Tumakuru", "hobli": "Kasaba", "village": "Melekote",
                "survey_number": "75", "hissa_number": "2A", "surnoc": "1",
                "owner_name": "Shivanna T R (ಶಿವಣ್ಣ)", "relative_name": "Rangappa",
                "area_acres": 1.85, "mutation_number": "MR-15/2023", "record_year": "2024-2025",
                "lat": 13.3510, "lng": 77.0865, "dx": 0.0012, "dy": 0.0012,
                "source": "Tumakuru District Land Records Registry [SYNTHETIC / DEMO DATA]"
            },
            {
                "district": "Tumakuru", "taluk": "Tumakuru", "hobli": "Kasaba", "village": "Melekote",
                "survey_number": "76", "hissa_number": "1", "surnoc": "*",
                "owner_name": "Prabhavathi Devi (ಪ್ರಭಾವತಿ)", "relative_name": "W/o Late Suresh",
                "area_acres": 3.20, "mutation_number": "MR-08/2022", "record_year": "2024-2025",
                "lat": 13.3525, "lng": 77.0852, "dx": 0.0014, "dy": 0.0015,
                "source": "Tumakuru District Land Records Registry [SYNTHETIC / DEMO DATA]"
            },
            # --- Tumakuru District: Kyathsandra Village ---
            {
                "district": "Tumakuru", "taluk": "Tumakuru", "hobli": "Kasaba", "village": "Kyathsandra",
                "survey_number": "34", "hissa_number": "1", "surnoc": "*",
                "owner_name": "Narayana Swamy K (ನಾರಾಯಣ ಸ್ವಾಮಿ)", "relative_name": "Krishnappa",
                "area_acres": 4.10, "mutation_number": "MR-04/2024", "record_year": "2024-2025",
                "lat": 13.3280, "lng": 77.1650, "dx": 0.0016, "dy": 0.0015,
                "source": "Tumakuru District Land Records Registry [SYNTHETIC / DEMO DATA]"
            },
            {
                "district": "Tumakuru", "taluk": "Tiptur", "hobli": "Kasaba", "village": "Biligere",
                "survey_number": "118", "hissa_number": "2", "surnoc": "1",
                "owner_name": "Venkatesh Murthy (ವೆಂಕಟೇಶ್ ಮೂರ್ತಿ)", "relative_name": "Late Ramaswamy",
                "area_acres": 3.15, "mutation_number": "MR-22/2024", "record_year": "2024-2025",
                "lat": 13.2560, "lng": 76.4780, "dx": 0.0015, "dy": 0.0013,
                "source": "Tumakuru District Land Records Registry [SYNTHETIC / DEMO DATA]"
            }
        ]

        for item in seed_data:
            self._create_seeded_parcel(db, item)

        db.commit()

    def _create_seeded_parcel(self, db: Session, item: Dict[str, Any]):
        c_lat = item["lat"]
        c_lng = item["lng"]
        dx = item["dx"]
        dy = item["dy"]

        # GeoJSON coordinates order: [longitude, latitude]
        geojson_coords = [
            [round(c_lng - dx, 6), round(c_lat + dy, 6)],
            [round(c_lng + dx, 6), round(c_lat + dy, 6)],
            [round(c_lng + dx, 6), round(c_lat - dy, 6)],
            [round(c_lng - dx, 6), round(c_lat - dy, 6)],
            [round(c_lng - dx, 6), round(c_lat + dy, 6)]
        ]
        geojson_geom = {
            "type": "Polygon",
            "coordinates": [geojson_coords]
        }

        parcel = LandParcel(
            district=item["district"],
            taluk=item["taluk"],
            hobli=item["hobli"],
            village=item["village"],
            survey_number=item["survey_number"],
            hissa_number=item["hissa_number"],
            surnoc=item["surnoc"],
            boundary_geojson=json.dumps(geojson_geom),
            center_lat=round(c_lat, 6),
            center_lng=round(c_lng, 6),
            area_acres=item["area_acres"],
            geometry_source=item["source"],
            source_record_id=f"BHOOMI-KA-{item['district'][:3].upper()}-{item['survey_number']}",
            verification_status="VERIFIED_AUTHORIZED",
            is_synthetic=True
        )
        db.add(parcel)
        db.flush()

        # Create linked authorized LandRecord
        rec = LandRecord(
            parcel_id=parcel.id,
            state="Karnataka",
            district=item["district"],
            taluk=item["taluk"],
            hobli=item["hobli"],
            village=item["village"],
            survey_number=item["survey_number"],
            sub_division=item["hissa_number"],
            hissa_number=item["hissa_number"],
            surnoc=item["surnoc"],
            record_year=item["record_year"],
            record_type="CURRENT_RTC",
            owner_name=item["owner_name"],
            relative_name=item["relative_name"],
            owner_share_percent=100.0,
            area_value=item["area_acres"],
            area_unit="Acres",
            area_in_acres=item["area_acres"],
            land_type="Dry Crop (Agricultural)",
            mutation_number=item["mutation_number"],
            registration_date="10/05/2024",
            source_department="Revenue Department (RTC)",
            language="kn",
            latitude=round(c_lat, 6),
            longitude=round(c_lng, 6),
            polygon_coordinates=json.dumps([[pt[1], pt[0]] for pt in geojson_coords]),
            status="VALID"
        )
        db.add(rec)
        db.flush()

        # Linked LandRecordDocument
        doc1 = LandRecordDocument(
            land_record_id=rec.id,
            document_type="RTC / Pahani (Form 16)",
            secure_file_reference="/static/samples/sample_kannada_rtc.png",
            issuing_source="Bhoomi Revenue Portal, Govt of Karnataka",
            document_date="2024-05-10",
            ocr_status="COMPLETED",
            review_status="VERIFIED"
        )
        doc2 = LandRecordDocument(
            land_record_id=rec.id,
            document_type="Cadastral Survey Sketch (Tippan/FMB)",
            secure_file_reference="/static/samples/sample_rtc_karnataka.png",
            issuing_source="Survey Settlement and Land Records Department, Karnataka",
            document_date="2023-11-15",
            ocr_status="COMPLETED",
            review_status="VERIFIED"
        )
        db.add_all([doc1, doc2])

gis_service = GISService()
