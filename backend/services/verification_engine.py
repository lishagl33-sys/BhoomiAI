import json
from typing import Dict, Any, List, Optional, Tuple
from difflib import SequenceMatcher
from sqlalchemy.orm import Session
from models import ReferenceParcel, LandRecord, DocumentUpload, VerificationResult
from config import (
    AREA_MATCH_TOLERANCE_PERCENT,
    AREA_MISMATCH_TOLERANCE_PERCENT,
    NAME_EXACT_MATCH_THRESHOLD,
    NAME_POSSIBLE_MATCH_THRESHOLD,
    PROTOTYPE_DISCLAIMER
)
from services.nlp_extractor import nlp_extractor

class VerificationEngine:
    """
    Intelligent Land Record Verification Engine for BhoomiAI:
    Compares extracted document entities against authoritative reference datasets.
    Distinguishes MATCH, NEEDS_REVIEW, MISMATCH_DETECTED, and REFERENCE_UNAVAILABLE.
    Ensures owner-name differences are treated as discrepancies, never labeled as fraud.
    """

    def _fuzzy_score(self, s1: str, s2: str) -> float:
        """Computes similarity ratio between two strings (0 to 100)."""
        if not s1 or not s2:
            return 0.0
        # Clean special chars and lowercase
        clean1 = " ".join(s1.lower().split())
        clean2 = " ".join(s2.lower().split())
        return round(SequenceMatcher(None, clean1, clean2).ratio() * 100, 1)

    def verify_document_record(
        self,
        db: Session,
        extracted_data: Dict[str, Any],
        document_id: int,
        record_id: Optional[int] = None,
        field_confidences: Optional[Dict[str, float]] = None
    ) -> VerificationResult:
        """
        Executes field-by-field verification of extracted record against reference parcels.
        Stores and returns a persistent VerificationResult.
        """
        field_confidences = field_confidences or {}
        warnings: List[str] = []
        comparisons: List[Dict[str, Any]] = []

        # 1. Normalize Extracted Inputs
        ext_district = (extracted_data.get("district") or "").strip()
        ext_taluk = (extracted_data.get("taluk") or "").strip()
        ext_hobli = (extracted_data.get("hobli") or "").strip()
        ext_village = (extracted_data.get("village") or "").strip()
        ext_survey = str(extracted_data.get("survey_number") or "").strip()
        ext_surnoc = str(extracted_data.get("surnoc") or "*").strip()
        ext_hissa = str(extracted_data.get("hissa_number") or "1").strip()
        ext_year = str(extracted_data.get("record_year") or "2024-2025").strip()
        ext_owner = (extracted_data.get("owner_name") or "").strip()
        ext_relative = (extracted_data.get("relative_name") or "").strip()
        ext_area_val = float(extracted_data.get("area_value") or 0.0)
        ext_unit = (extracted_data.get("area_unit") or "Acres").strip()
        ext_area_acres = float(extracted_data.get("area_in_acres") or nlp_extractor.normalize_area(ext_area_val, ext_unit))
        ext_mutation = (extracted_data.get("mutation_number") or "").strip()

        # Check missing mandatory extracted fields
        if not ext_owner:
            warnings.append("Primary titleholder name was not detected from document OCR.")
        if not ext_survey:
            warnings.append("Survey / Khasra number was missing or unreadable.")
        if ext_area_val <= 0:
            warnings.append("Recorded land extent was zero or unreadable.")

        # 2. Query Reference Dataset
        # Priority search: survey_number + village match
        query = db.query(ReferenceParcel)
        if ext_survey:
            # Handle survey number formats (e.g. 104 vs 104/1)
            survey_base = ext_survey.split("/")[0].split("-")[0].strip()
            query = query.filter(
                (ReferenceParcel.survey_number == ext_survey) |
                (ReferenceParcel.survey_number == survey_base)
            )

        candidates = query.all()

        # Find best matching candidate
        ref: Optional[ReferenceParcel] = None
        if candidates:
            # First look for village + hissa match
            for c in candidates:
                if ext_village.lower() in c.village.lower() or c.village.lower() in ext_village.lower():
                    if ext_hissa == c.hissa_number:
                        ref = c
                        break
            # Second look for village match
            if not ref:
                for c in candidates:
                    if ext_village.lower() in c.village.lower() or c.village.lower() in ext_village.lower():
                        ref = c
                        break
            # Fallback to first candidate for same survey
            if not ref and candidates:
                ref = candidates[0]

        # 3. If No Reference Record Found
        if not ref:
            final_status = "REFERENCE_UNAVAILABLE"
            discrepancy_score = 0.0
            warnings.append("No reference land parcel found in the authorized dataset for this Survey Number & Village.")
            warnings.append("Note: Prototype dataset covers selected survey parcels in Davanagere and Tumakuru districts.")

            comparisons = [
                {
                    "field": "survey_number",
                    "label": "Survey Number",
                    "extracted_value": ext_survey or "Not Detected",
                    "reference_value": "No Reference Data",
                    "status": "UNAVAILABLE",
                    "difference": "N/A"
                },
                {
                    "field": "owner_name",
                    "label": "Titleholder Name",
                    "extracted_value": ext_owner or "Not Detected",
                    "reference_value": "No Reference Data",
                    "status": "UNAVAILABLE",
                    "difference": "N/A"
                },
                {
                    "field": "land_area",
                    "label": "Land Extent",
                    "extracted_value": f"{ext_area_val} {ext_unit} ({ext_area_acres:.2f} Acres)",
                    "reference_value": "No Reference Data",
                    "status": "UNAVAILABLE",
                    "difference": "N/A"
                },
                {
                    "field": "location",
                    "label": "Village & Taluk",
                    "extracted_value": f"{ext_village}, {ext_taluk}",
                    "reference_value": "No Reference Data",
                    "status": "UNAVAILABLE",
                    "difference": "N/A"
                }
            ]

            result_entry = VerificationResult(
                document_id=document_id,
                record_id=record_id,
                reference_parcel_id=None,
                final_status=final_status,
                discrepancy_score=discrepancy_score,
                field_comparisons_json=json.dumps(comparisons),
                warnings_json=json.dumps(warnings),
                reference_source_details="Reference record unavailable in current dataset"
            )
            db.add(result_entry)
            db.commit()
            return result_entry

        # 4. Field-by-Field Detailed Comparison
        # Survey Number Check
        survey_match = ext_survey == ref.survey_number or ext_survey.startswith(ref.survey_number)
        comparisons.append({
            "field": "survey_number",
            "label": "Survey / Khasra Number",
            "extracted_value": ext_survey,
            "reference_value": ref.survey_number,
            "status": "EXACT_MATCH" if survey_match else "MISMATCH",
            "difference": "Identical Survey Plot" if survey_match else f"Survey mismatch: Extracted {ext_survey} vs Reference {ref.survey_number}"
        })
        if not survey_match:
            warnings.append(f"Survey number mismatch: Document shows '{ext_survey}' while reference records '{ref.survey_number}'.")

        # Surnoc & Hissa Check
        hissa_match = (ext_hissa == ref.hissa_number)
        comparisons.append({
            "field": "hissa_number",
            "label": "Surnoc / Hissa Sub-division",
            "extracted_value": f"Surnoc: {ext_surnoc} | Hissa: {ext_hissa}",
            "reference_value": f"Surnoc: {ref.surnoc} | Hissa: {ref.hissa_number}",
            "status": "EXACT_MATCH" if hissa_match else "POSSIBLE_MATCH",
            "difference": "Sub-division matched" if hissa_match else f"Extracted Hissa {ext_hissa} differs from Reference Hissa {ref.hissa_number}"
        })

        # Land Area Comparison & Normalization
        ref_acres = ref.area_in_acres
        area_diff_acres = abs(ext_area_acres - ref_acres)
        area_diff_pct = (area_diff_acres / ref_acres * 100) if ref_acres > 0 else 0.0

        if area_diff_pct <= AREA_MATCH_TOLERANCE_PERCENT:
            area_status = "EXACT_MATCH"
            area_diff_desc = f"Area matches reference ({area_diff_pct:.2f}% variance within 0.5% tolerance)"
        elif area_diff_pct <= AREA_MISMATCH_TOLERANCE_PERCENT:
            area_status = "POSSIBLE_MATCH"
            area_diff_desc = f"Minor area variance of {area_diff_pct:.2f}% ({area_diff_acres:.2f} Acres diff). Within statutory 2.5% tolerance."
            warnings.append(f"Minor land extent variance detected: Extracted {ext_area_acres:.2f} Acres vs Reference {ref_acres:.2f} Acres.")
        else:
            area_status = "MISMATCH"
            area_diff_desc = f"Significant extent variance of {area_diff_pct:.1f}% exceeds statutory 2.5% tolerance."
            warnings.append(f"Area Mismatch Detected: Document specifies {ext_area_acres:.2f} Acres while Reference records {ref_acres:.2f} Acres.")

        comparisons.append({
            "field": "land_area",
            "label": "Recorded Land Extent",
            "extracted_value": f"{ext_area_val} {ext_unit} ({ext_area_acres:.2f} Standard Acres)",
            "reference_value": f"{ref.area_value} {ref.area_unit} ({ref.area_in_acres:.2f} Standard Acres)",
            "status": area_status,
            "difference": area_diff_desc
        })

        # Titleholder / Owner Name Comparison (Fuzzy Analysis)
        owner_score = self._fuzzy_score(ext_owner, ref.owner_name)
        if owner_score >= NAME_EXACT_MATCH_THRESHOLD:
            owner_status = "EXACT_MATCH"
            owner_desc = f"Titleholder verified ({owner_score:.1f}% text match)"
        elif owner_score >= NAME_POSSIBLE_MATCH_THRESHOLD:
            owner_status = "POSSIBLE_MATCH"
            owner_desc = f"Possible spelling or transliteration variation ({owner_score:.1f}% match). Requires administrative review."
            warnings.append(f"Possible owner name discrepancy ({owner_score:.1f}% match): '{ext_owner}' vs reference '{ref.owner_name}'. Not indicative of fraud.")
        else:
            owner_status = "MISMATCH"
            owner_desc = f"Different titleholder recorded (Similarity {owner_score:.1f}%). Possible unregistered conveyance deed or pending mutation."
            warnings.append(f"Titleholder discrepancy detected: Extracted '{ext_owner}' vs Reference '{ref.owner_name}'. Verify mutation registers.")

        comparisons.append({
            "field": "owner_name",
            "label": "Registered Titleholder",
            "extracted_value": ext_owner or "Unreadable",
            "reference_value": ref.owner_name,
            "status": owner_status,
            "difference": owner_desc
        })

        # Location Hierarchy Comparison
        loc_match = ext_village.lower() in ref.village.lower() or ref.village.lower() in ext_village.lower()
        comparisons.append({
            "field": "location",
            "label": "Village, Hobli & Taluk",
            "extracted_value": f"{ext_village}, {ext_hobli or 'Kasaba'}, {ext_taluk}",
            "reference_value": f"{ref.village}, {ref.hobli}, {ref.taluk}",
            "status": "EXACT_MATCH" if loc_match else "MISMATCH",
            "difference": "Location consistent" if loc_match else f"Village mismatch: Extracted {ext_village} vs Reference {ref.village}"
        })
        if not loc_match:
            warnings.append(f"Location inconsistency: Village '{ext_village}' differs from Reference '{ref.village}'.")

        # Record Year Check
        year_match = ext_year == ref.record_year
        comparisons.append({
            "field": "record_year",
            "label": "RTC Record Year",
            "extracted_value": ext_year,
            "reference_value": ref.record_year,
            "status": "EXACT_MATCH" if year_match else "POSSIBLE_MATCH",
            "difference": "Record year matched" if year_match else f"Extracted {ext_year} vs Reference {ref.record_year}"
        })

        # 5. Determine Final Verification Status
        # Rules:
        # Match: Exact survey, area variance <= 0.5%, owner score >= 85%, location matched.
        # Needs Review: Area variance <= 2.5%, owner score 70-84%, or low OCR confidence.
        # Mismatch Detected: Area variance > 2.5%, owner score < 70%, or survey mismatch.
        avg_ocr_conf = sum(field_confidences.values()) / len(field_confidences) if field_confidences else 0.85
        if avg_ocr_conf < 0.70:
            warnings.append(f"Low OCR confidence ({avg_ocr_conf*100:.1f}%). Physical document review recommended.")

        if not survey_match or area_status == "MISMATCH" or owner_status == "MISMATCH" or not loc_match:
            final_status = "MISMATCH_DETECTED"
        elif area_status == "POSSIBLE_MATCH" or owner_status == "POSSIBLE_MATCH" or not hissa_match or avg_ocr_conf < 0.70:
            final_status = "NEEDS_REVIEW"
        else:
            final_status = "MATCH"

        discrepancy_score = round(max(area_diff_pct, 100.0 - owner_score if owner_score > 0 else 0.0), 1)

        result_entry = VerificationResult(
            document_id=document_id,
            record_id=record_id,
            reference_parcel_id=ref.id,
            final_status=final_status,
            discrepancy_score=discrepancy_score,
            field_comparisons_json=json.dumps(comparisons),
            warnings_json=json.dumps(warnings),
            reference_source_details=f"{ref.dataset_source} (Retrieval: {ref.retrieval_date})"
        )
        db.add(result_entry)
        db.commit()
        db.refresh(result_entry)
        return result_entry

verification_engine = VerificationEngine()
