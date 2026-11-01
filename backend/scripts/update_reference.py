import sys
from pathlib import Path

path = Path("backend/services/reference_service.py")
text = path.read_text(encoding="utf-8")

addition = """        demo_parcels = [
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

            # --- Tumakuru District Baseline Parcels ---"""

# Replace in unix or dos line endings
needle_crlf = "        demo_parcels = [\r\n            # --- Tumakuru District Baseline Parcels ---"
needle_lf = "        demo_parcels = [\n            # --- Tumakuru District Baseline Parcels ---"

if needle_crlf in text:
    text = text.replace(needle_crlf, addition.replace("\n", "\r\n"), 1)
    path.write_text(text, encoding="utf-8")
    print("Updated CRLF successfully!")
elif needle_lf in text:
    text = text.replace(needle_lf, addition, 1)
    path.write_text(text, encoding="utf-8")
    print("Updated LF successfully!")
else:
    print("Could not find needle in file!")
