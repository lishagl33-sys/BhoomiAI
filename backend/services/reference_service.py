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
        Reports detailed errors per row without silently failing or corrupting data.
        """
        reader = csv.DictReader(io.StringIO(csv_content))
        total_rows = 0
        valid_rows = 0
        invalid_rows = 0
        errors = []
        parcels_to_add = []

        # Check required columns
        fieldnames = [f.strip().lower() for f in (reader.fieldnames or [])]
        missing_headers = [h for h in self.CSV_HEADERS if h.lower() not in fieldnames]
        if missing_headers:
            return {
                "success": False,
                "message": f"CSV is missing required columns: {', '.join(missing_headers)}",
                "total_rows": 0,
                "valid_rows": 0,
                "invalid_rows": 0,
                "errors": [{"row": 0, "error": f"Missing columns: {missing_headers}"}]
            }

        # Normalize header keys map
        header_map = {orig: orig.strip().lower() for orig in (reader.fieldnames or [])}

        for idx, row in enumerate(reader, start=2):
            total_rows += 1
            row_errors = []

            # Get normalized fields
            row_clean = {k.lower(): v.strip() for k, v in row.items() if k}

            district = row_clean.get("district", "")
            taluk = row_clean.get("taluk", "")
            hobli = row_clean.get("hobli", "")
            village = row_clean.get("village", "")
            survey_no = row_clean.get("survey_number", "")
            surnoc = row_clean.get("surnoc", "*") or "*"
            hissa = row_clean.get("hissa_number", "1") or "1"
            record_year = row_clean.get("record_year", "2024-2025") or "2024-2025"
            record_type = row_clean.get("record_type", "CURRENT_RTC") or "CURRENT_RTC"
            owner = row_clean.get("owner_name", "")
            relative = row_clean.get("relative_name", "")
            area_raw = row_clean.get("area_value", "")
            unit = row_clean.get("area_unit", "Acres") or "Acres"
            land_type = row_clean.get("land_type", "Dry Crop") or "Dry Crop"
            mutation = row_clean.get("mutation_number", "")
            source = row_clean.get("dataset_source", "") or dataset_source

            # 1. District validation
            matched_dist = None
            for d in SUPPORTED_KARNATAKA_DISTRICTS:
                if d.lower() in district.lower():
                    matched_dist = d
                    break
            if not matched_dist:
                row_errors.append(f"District '{district}' is not supported. Supported: {', '.join(SUPPORTED_KARNATAKA_DISTRICTS)}.")

            # 2. Mandatory fields check
            if not village:
                row_errors.append("Village name is required.")
            if not survey_no:
                row_errors.append("Survey number is required.")
            if not owner:
                row_errors.append("Owner name is required.")

            # 3. Area validation & normalization
            try:
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
                errors.append({"row": idx, "survey": survey_no, "errors": row_errors})
            else:
                valid_rows += 1
                parcels_to_add.append(ReferenceParcel(
                    district=matched_dist or district,
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
