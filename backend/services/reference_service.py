import re
import csv
import io
from typing import Dict, Any, List, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from models import ReferenceParcel, ReferenceImportAudit
from config import TEMPLATES_DIR, SUPPORTED_KARNATAKA_DISTRICTS
from services.nlp_extractor import nlp_extractor
from services.location_service import location_service

class ReferenceService:
    """
    Manages authoritative reference datasets, CSV/Excel imports, and synthetic demo baselines.
    Ensures complete transparency with SYNTHETIC / DEMO DATA labeling.
    """

    CSV_HEADERS = [
        "district",
        "taluk",
        "hobli",
        "village",
        "survey_number",
        "surnoc",
        "hissa_number",
        "record_year",
        "record_type",
        "owner_name",
        "relative_name",
        "area_value",
        "area_unit",
        "land_type",
        "mutation_number",
        "dataset_source"
    ]

    def get_csv_template(self) -> str:
        """Generates downloadable CSV template for reference parcel bulk import."""
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(self.CSV_HEADERS)
        
        # Example guidance rows (clearly marked as synthetic demo data)
        writer.writerow([
            "Davanagere", "Davanagere", "Kasaba", "Avaragere",
            "104", "*", "1", "2024-2025", "CURRENT_RTC",
            "Basavarajappa H (ಬಸವರಾಜಪ್ಪ)", "Late Halappa",
            "4.25", "Acres", "Dry Crop (Agricultural)", "MR-88/2024",
            "Davanagere Revenue Archive 2024 [SYNTHETIC / DEMO DATA]"
        ])
        writer.writerow([
            "Tumakuru", "Tumakuru", "Kasaba", "Melekote",
            "75", "1", "2A", "2024-2025", "CURRENT_RTC",
            "Gangaraju K M (ಗಂಗರಾಜು)", "Mylarappa",
            "2.75", "Acres", "Garden / Coconut", "MR-14/2023",
            "Tumakuru District Land Records Registry [SYNTHETIC / DEMO DATA]"
        ])
        writer.writerow([
            "Davanagere", "Harihara", "Malebennur", "Kondajji",
            "210", "*", "3", "2023-2024", "HISTORICAL_RTC",
            "Manjula Bai (ಮಂಜುಳಾ ಬಾಯಿ)", "Gopal Rao",
            "3.10", "Acres", "Wet Crop (Paddy)", "MR-32/2022",
            "Harihara Taluk Historical Register [SYNTHETIC / DEMO DATA]"
        ])
        return output.getvalue()

    def validate_and_import_csv(self, db: Session, csv_content: str, filename: str = "import.csv", dataset_source: str = "Admin CSV Import") -> Dict[str, Any]:
        """
        Validates CSV rows and imports valid parcels into ReferenceParcel table.
        Robust, resilient: supports column aliases, smart defaults for optional columns,
        updates existing reference parcels on survey/village collision, and reports clear errors.
        """
        reader = csv.DictReader(io.StringIO(csv_content))
        total_rows = 0
        valid_rows = 0
        invalid_rows = 0
        errors = []
        parcels_to_add = []

        # Map common header variations to canonical names
        HEADER_ALIASES = {
            "survey": "survey_number",
            "survey_no": "survey_number",
            "survey_num": "survey_number",
            "sy_no": "survey_number",
            "sy_num": "survey_number",
            "syno": "survey_number",
            "khasra": "survey_number",
            "khasra_no": "survey_number",
            "owner": "owner_name",
            "owner_name": "owner_name",
            "farmer_name": "owner_name",
            "farmer": "owner_name",
            "khatadar": "owner_name",
            "name": "owner_name",
            "titleholder": "owner_name",
            "area": "area_value",
            "extent": "area_value",
            "land_extent": "area_value",
            "area_value": "area_value",
            "area_acres": "area_value",
            "acres": "area_value",
            "unit": "area_unit",
            "area_unit": "area_unit",
            "village": "village",
            "village_name": "village",
            "taluk": "taluk",
            "taluk_name": "taluk",
            "tahsil": "taluk",
            "district": "district",
            "district_name": "district",
            "hobli": "hobli",
            "surnoc": "surnoc",
            "hissa": "hissa_number",
            "hissa_no": "hissa_number",
            "hissa_number": "hissa_number",
            "subdivision": "hissa_number",
            "sub_division": "hissa_number",
            "year": "record_year",
            "record_year": "record_year",
            "type": "record_type",
            "record_type": "record_type",
            "relative": "relative_name",
            "relative_name": "relative_name",
            "father_name": "relative_name",
            "land_type": "land_type",
            "mutation": "mutation_number",
            "mr_no": "mutation_number",
            "mutation_no": "mutation_number",
            "mutation_number": "mutation_number",
            "source": "dataset_source",
            "dataset_source": "dataset_source"
        }

        # Build map from raw headers to canonical keys
        canonical_header_map = {}
        for fn in (reader.fieldnames or []):
            if fn:
                clean_fn = fn.strip().lower().replace(" ", "_").replace("-", "_")
                canonical_header_map[fn] = HEADER_ALIASES.get(clean_fn, clean_fn)

        present_canonical = set(canonical_header_map.values())
        strictly_required = ["survey_number", "owner_name", "area_value"]
        missing_required = [h for h in strictly_required if h not in present_canonical]
        if missing_required:
            return {
                "success": False,
                "message": f"CSV is missing required core columns: {', '.join(missing_required)}. Found columns: {', '.join(reader.fieldnames or [])}",
                "total_rows": 0,
                "valid_rows": 0,
                "invalid_rows": 0,
                "errors": [{"row": 0, "survey": "N/A", "error": f"Missing core columns: {', '.join(missing_required)}", "errors": [f"Missing {c}" for c in missing_required]}]
            }

        for idx, row in enumerate(reader, start=2):
            total_rows += 1
            row_errors = []

            # Get normalized fields
            row_clean = {}
            for k, v in row.items():
                if k is not None:
                    c_key = canonical_header_map.get(k, k.strip().lower())
                    row_clean[c_key] = (v or "").strip()

            district = row_clean.get("district") or "Tumakuru"
            taluk = row_clean.get("taluk") or district
            hobli = row_clean.get("hobli") or "Kasaba"
            village = row_clean.get("village") or "Melekote"
            survey_no = row_clean.get("survey_number", "")
            surnoc = row_clean.get("surnoc") or "*"
            hissa = row_clean.get("hissa_number") or ("1" if "/" not in survey_no else survey_no.split("/")[-1])
            record_year = row_clean.get("record_year") or "2024-2025"
            record_type = row_clean.get("record_type") or "CURRENT_RTC"
            owner = row_clean.get("owner_name", "")
            relative = row_clean.get("relative_name") or "Family Lineage"
            area_raw = row_clean.get("area_value", "")
            unit = row_clean.get("area_unit") or "Acres"
            land_type = row_clean.get("land_type") or "Dry Crop (Agricultural)"
            mutation = row_clean.get("mutation_number") or f"MR-{survey_no}/2024"
            source = row_clean.get("dataset_source") or dataset_source

            # 1. Mandatory fields check
            if not survey_no:
                row_errors.append("Survey number is required.")
            if not owner:
                row_errors.append("Owner name is required.")
            if not area_raw:
                row_errors.append("Area value is required.")

            # 2. Area validation & normalization
            try:
                area_match = re.search(r'(-?[0-9]+(?:\.[0-9]+)?)', str(area_raw))
                if area_match:
                    area_float = float(area_match.group(1))
                else:
                    area_float = float(area_raw)

                if area_float <= 0:
                    row_errors.append("Land area must be greater than 0.")
                norm_acres = nlp_extractor.normalize_area(area_float, unit)
            except (ValueError, TypeError):
                row_errors.append(f"Invalid area value '{area_raw}'. Must be numeric.")
                area_float = 0.0
                norm_acres = 0.0

            if row_errors:
                invalid_rows += 1
                errors.append({
                    "row": idx,
                    "survey": survey_no or "N/A",
                    "error": "; ".join(row_errors),
                    "errors": row_errors
                })
            else:
                # Check if this reference parcel already exists in DB to prevent duplicates
                existing_ref = db.query(ReferenceParcel).filter(
                    ReferenceParcel.survey_number == survey_no,
                    ReferenceParcel.village == village
                ).first()

                if existing_ref:
                    existing_ref.district = district
                    existing_ref.taluk = taluk
                    existing_ref.hobli = hobli
                    existing_ref.surnoc = surnoc
                    existing_ref.hissa_number = hissa
                    existing_ref.record_year = record_year
                    existing_ref.record_type = record_type
                    existing_ref.owner_name = owner
                    existing_ref.relative_name = relative
                    existing_ref.area_value = area_float
                    existing_ref.area_unit = unit
                    existing_ref.area_in_acres = norm_acres
                    existing_ref.land_type = land_type
                    existing_ref.mutation_number = mutation
                    existing_ref.dataset_source = f"{source} [VERIFIED_IMPORT]"
                    existing_ref.retrieval_date = datetime.utcnow().strftime("%Y-%m-%d")
                    valid_rows += 1
                else:
                    valid_rows += 1
                    parcels_to_add.append(ReferenceParcel(
                        district=district,
                        taluk=taluk,
                        hobli=hobli,
                        village=village,
                        survey_number=survey_no,
                        surnoc=surnoc,
                        hissa_number=hissa,
                        record_year=record_year,
                        record_type=record_type,
                        owner_name=owner,
                        relative_name=relative,
                        area_value=area_float,
                        area_unit=unit,
                        area_in_acres=norm_acres,
                        land_type=land_type,
                        mutation_number=mutation,
                        dataset_source=f"{source} [VERIFIED_IMPORT]",
                        retrieval_date=datetime.utcnow().strftime("%Y-%m-%d"),
                        verification_status="VERIFIED_BASELINE",
                        is_synthetic=False
                    ))

        # Add parcels to DB
        if parcels_to_add:
            db.add_all(parcels_to_add)

        # Log audit entry
        audit = ReferenceImportAudit(
            filename=filename,
            total_rows=total_rows,
            valid_rows=valid_rows,
            invalid_rows=invalid_rows,
            errors_summary=f"{len(errors)} rows had validation errors" if errors else "Clean import",
            dataset_source=dataset_source
        )
        db.add(audit)
        db.commit()

        return {
            "success": True,
            "message": f"Processed {total_rows} rows. {valid_rows} imported successfully, {invalid_rows} invalid rows rejected.",
            "total_rows": total_rows,
            "valid_rows": valid_rows,
            "invalid_rows": invalid_rows,
            "errors": errors[:50]
        }

    def seed_synthetic_reference_parcels(self, db: Session):
        """
        Seeds initial baseline parcels for Tumakuru, Shivamogga, and Mysuru.
        All records are strictly and transparently flagged as SYNTHETIC / DEMO DATA.
        """
        demo_parcels = [
            # --- Davanagere District Baseline Parcels ---
            ReferenceParcel(
                district="Davanagere",
                taluk="Davanagere",
                hobli="Kasaba",
                village="Avaragere",
                survey_number="104",
                surnoc="*",
                hissa_number="1",
                record_year="2024-2025",
                record_type="CURRENT_RTC",
                owner_name="Basavarajappa H (ಬಸವರಾಜಪ್ಪ)",
                relative_name="Late Halappa",
                area_value=4.25,
                area_unit="Acres",
                area_in_acres=4.25,
                land_type="Dry Crop (Agricultural)",
                mutation_number="MR-88/2024",
                dataset_source="Davanagere District Land Records Registry [SYNTHETIC / DEMO DATA]",
                retrieval_date="2024-10-01",
                verification_status="VERIFIED_BASELINE",
                is_synthetic=True
            ),
            ReferenceParcel(
                district="Davanagere",
                taluk="Channagiri",
                hobli="Kasaba",
                village="Maravanji",
                survey_number="42",
                surnoc="*",
                hissa_number="1",
                record_year="2024-2025",
                record_type="CURRENT_RTC",
                owner_name="Basappa M (ಬಸಪ್ಪ)",
                relative_name="Late Mallappa",
                area_value=3.25,
                area_unit="Acres",
                area_in_acres=3.25,
                land_type="Dry Crop / Maize",
                mutation_number="MR-42/2023",
                dataset_source="Davanagere District Land Records Registry [SYNTHETIC / DEMO DATA]",
                retrieval_date="2024-10-01",
                verification_status="VERIFIED_BASELINE",
                is_synthetic=True
            ),
            ReferenceParcel(
                district="Davanagere",
                taluk="Davanagere",
                hobli="Kasaba",
                village="Bathi",
                survey_number="88",
                surnoc="*",
                hissa_number="1",
                record_year="2024-2025",
                record_type="CURRENT_RTC",
                owner_name="Rudrappa K (ರುದ್ರಪ್ಪ)",
                relative_name="Late Channappa",
                area_value=3.75,
                area_unit="Acres",
                area_in_acres=3.75,
                land_type="Wet Crop (Sugarcane)",
                mutation_number="MR-19/2024",
                dataset_source="Davanagere District Land Records Registry [SYNTHETIC / DEMO DATA]",
                retrieval_date="2024-10-01",
                verification_status="VERIFIED_BASELINE",
                is_synthetic=True
            ),
            ReferenceParcel(
                district="Davanagere",
                taluk="Harihara",
                hobli="Malebennur",
                village="Kondajji",
                survey_number="210",
                surnoc="*",
                hissa_number="3",
                record_year="2023-2024",
                record_type="HISTORICAL_RTC",
                owner_name="Manjula Bai (ಮಂಜುಳಾ ಬಾಯಿ)",
                relative_name="Gopal Rao",
                area_value=3.10,
                area_unit="Acres",
                area_in_acres=3.10,
                land_type="Wet Crop (Paddy)",
                mutation_number="MR-32/2022",
                dataset_source="Harihara Taluk Historical Register [SYNTHETIC / DEMO DATA]",
                retrieval_date="2024-10-01",
                verification_status="VERIFIED_BASELINE",
                is_synthetic=True
            ),

            # --- Bengaluru Rural District Baseline Parcels ---
            ReferenceParcel(
                district="Bengaluru Rural",
                taluk="Devanahalli",
                hobli="Kasaba",
                village="Vijayapura",
                survey_number="142/2",
                surnoc="*",
                hissa_number="2",
                record_year="2024-2025",
                record_type="CURRENT_RTC",
                owner_name="Ramesh Chandra Gowda (ರಮೇಶ್ ಚಂದ್ರ ಗೌಡ)",
                relative_name="Late Venkatappa Gowda",
                area_value=3.50,
                area_unit="Acres",
                area_in_acres=3.50,
                land_type="Dry Crop (Agricultural)",
                mutation_number="T142/2021-22",
                dataset_source="Devanahalli Taluk Revenue Archive [SYNTHETIC / DEMO DATA]",
                retrieval_date="2024-10-01",
                verification_status="VERIFIED_BASELINE",
                is_synthetic=True
            ),

            # --- Tumakuru District Baseline Parcels ---
            ReferenceParcel(
                district="Tumakuru",
                taluk="Tumakuru",
                hobli="Kasaba",
                village="Melekote",
                survey_number="75",
                surnoc="1",
                hissa_number="2A",
                record_year="2024-2025",
                record_type="CURRENT_RTC",
                owner_name="Gangaraju K M (ಗಂಗರಾಜು)",
                relative_name="Mylarappa",
                area_value=2.75,
                area_unit="Acres",
                area_in_acres=2.75,
                land_type="Garden / Coconut",
                mutation_number="MR-14/2023",
                dataset_source="Tumakuru District Land Records Registry [SYNTHETIC / DEMO DATA]",
                retrieval_date="2024-10-01",
                verification_status="VERIFIED_BASELINE",
                is_synthetic=True
            ),
            ReferenceParcel(
                district="Tumakuru",
                taluk="Tumakuru",
                hobli="Bellavi",
                village="Mallasandra",
                survey_number="89",
                surnoc="*",
                hissa_number="1",
                record_year="2024-2025",
                record_type="CURRENT_RTC",
                owner_name="Siddalingaiah S (ಸಿದ್ಧಲಿಂಗಯ್ಯ)",
                relative_name="Shivalingaiah",
                area_value=1.85,
                area_unit="Acres",
                area_in_acres=1.85,
                land_type="Dry Crop (Ragi)",
                mutation_number="MR-77/2022",
                dataset_source="Tumakuru District Land Records Registry [SYNTHETIC / DEMO DATA]",
                retrieval_date="2024-10-01",
                verification_status="VERIFIED_BASELINE",
                is_synthetic=True
            ),
            ReferenceParcel(
                district="Tumakuru",
                taluk="Tiptur",
                hobli="Kasaba",
                village="Albur",
                survey_number="134",
                surnoc="2",
                hissa_number="1",
                record_year="2024-2025",
                record_type="CURRENT_RTC",
                owner_name="Parameshwarappa T N (ಪರಮೇಶ್ವರಪ್ಪ)",
                relative_name="Nanjundappa",
                area_value=6.40,
                area_unit="Acres",
                area_in_acres=6.40,
                land_type="Dry Crop / Coconut Plantation",
                mutation_number="MR-99/2024",
                dataset_source="Tumakuru District Land Records Registry [SYNTHETIC / DEMO DATA]",
                retrieval_date="2024-10-01",
                verification_status="VERIFIED_BASELINE",
                is_synthetic=True
            ),
            ReferenceParcel(
                district="Tumakuru",
                taluk="Gubbi",
                hobli="Kasaba",
                village="Kadaba",
                survey_number="42",
                surnoc="*",
                hissa_number="3",
                record_year="2024-2025",
                record_type="CURRENT_RTC",
                owner_name="Lakshmamma W/o Kumar (ಲಕ್ಷ್ಮಮ್ಮ)",
                relative_name="Kumar",
                area_value=2.20,
                area_unit="Acres",
                area_in_acres=2.20,
                land_type="Dry Crop",
                mutation_number="MR-31/2023",
                dataset_source="Tumakuru District Land Records Registry [SYNTHETIC / DEMO DATA]",
                retrieval_date="2024-10-01",
                verification_status="VERIFIED_BASELINE",
                is_synthetic=True
            ),
            ReferenceParcel(
                district="Tumakuru",
                taluk="Kunigal",
                hobli="Kasaba",
                village="Herur",
                survey_number="115",
                surnoc="*",
                hissa_number="1",
                record_year="2024-2025",
                record_type="CURRENT_RTC",
                owner_name="Venkatesh Murthy (ವೆಂಕಟೇಶ್ ಮೂರ್ತಿ)",
                relative_name="Late Ramaswamy",
                area_value=3.15,
                area_unit="Acres",
                area_in_acres=3.15,
                land_type="Wet Crop (Canal Irrigated)",
                mutation_number="MR-22/2024",
                dataset_source="Tumakuru District Land Records Registry [SYNTHETIC / DEMO DATA]",
                retrieval_date="2024-10-01",
                verification_status="VERIFIED_BASELINE",
                is_synthetic=True
            ),

            # --- Shivamogga District Baseline Parcels ---
            ReferenceParcel(
                district="Shivamogga",
                taluk="Shivamogga",
                hobli="Kasaba",
                village="Nidige",
                survey_number="58",
                surnoc="*",
                hissa_number="1",
                record_year="2024-2025",
                record_type="CURRENT_RTC",
                owner_name="Manjunatha Rao (ಮಂಜುನಾಥ ರಾವ್)",
                relative_name="Ramachandra Rao",
                area_value=4.50,
                area_unit="Acres",
                area_in_acres=4.50,
                land_type="Garden / Arecanut",
                mutation_number="MR-08/2023",
                dataset_source="Shivamogga District Land Records Registry [SYNTHETIC / DEMO DATA]",
                retrieval_date="2024-10-01",
                verification_status="VERIFIED_BASELINE",
                is_synthetic=True
            ),
            ReferenceParcel(
                district="Shivamogga",
                taluk="Bhadravathi",
                hobli="Holehonnur",
                village="Kudligere",
                survey_number="102",
                surnoc="*",
                hissa_number="2",
                record_year="2024-2025",
                record_type="CURRENT_RTC",
                owner_name="Basavarajappa H (ಬಸವರಾಜಪ್ಪ)",
                relative_name="Halappa",
                area_value=3.25,
                area_unit="Acres",
                area_in_acres=3.25,
                land_type="Wet Crop (Paddy)",
                mutation_number="MR-45/2024",
                dataset_source="Shivamogga District Land Records Registry [SYNTHETIC / DEMO DATA]",
                retrieval_date="2024-10-01",
                verification_status="VERIFIED_BASELINE",
                is_synthetic=True
            ),

            # --- Mysuru District Baseline Parcels ---
            ReferenceParcel(
                district="Mysuru",
                taluk="Mysuru",
                hobli="Varuna",
                village="Varuna",
                survey_number="74",
                surnoc="*",
                hissa_number="1",
                record_year="2024-2025",
                record_type="CURRENT_RTC",
                owner_name="Siddaramaiah N (ಸಿದ್ಧರಾಮಯ್ಯ)",
                relative_name="Ninge Gowda",
                area_value=5.00,
                area_unit="Acres",
                area_in_acres=5.00,
                land_type="Wet Crop (Canal Irrigated)",
                mutation_number="MR-12/2024",
                dataset_source="Mysuru District Land Records Registry [SYNTHETIC / DEMO DATA]",
                retrieval_date="2024-10-01",
                verification_status="VERIFIED_BASELINE",
                is_synthetic=True
            ),
            ReferenceParcel(
                district="Mysuru",
                taluk="Nanjangud",
                hobli="Kasaba",
                village="Biligere",
                survey_number="112",
                surnoc="*",
                hissa_number="3A",
                record_year="2024-2025",
                record_type="CURRENT_RTC",
                owner_name="Chamaraja Urs (ಚಾಮರಾಜ ಅರಸ್)",
                relative_name="Subramanya Urs",
                area_value=2.80,
                area_unit="Acres",
                area_in_acres=2.80,
                land_type="Dry Crop",
                mutation_number="MR-56/2023",
                dataset_source="Mysuru District Land Records Registry [SYNTHETIC / DEMO DATA]",
                retrieval_date="2024-10-01",
                verification_status="VERIFIED_BASELINE",
                is_synthetic=True
            )
        ]

        # Seed only missing parcels
        for p in demo_parcels:
            exists = db.query(ReferenceParcel).filter(
                ReferenceParcel.district == p.district,
                ReferenceParcel.taluk == p.taluk,
                ReferenceParcel.village == p.village,
                ReferenceParcel.survey_number == p.survey_number
            ).first()
            if not exists:
                db.add(p)

        db.commit()


reference_service = ReferenceService()
