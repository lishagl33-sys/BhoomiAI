import re
from datetime import datetime
from typing import Dict, Any, List

class ValidationService:
    def validate_record(self, data: Dict[str, Any], confidences: Dict[str, float] = None) -> List[Dict[str, Any]]:
        """
        Validates extracted land record against statutory and logical integrity rules.
        Returns list of validation issues with severity, type, and remediation steps.
        """
        issues = []
        confidences = confidences or {}

        # 1. Mandatory Fields Check
        mandatory_fields = [
            ("owner_name", "Owner Name"),
            ("survey_number", "Survey / Khasra Number"),
            ("village", "Village Name"),
            ("district", "District Name"),
            ("area_value", "Land Area Extent")
        ]
        for field, label in mandatory_fields:
            val = data.get(field)
            if val is None or (isinstance(val, str) and not val.strip()):
                issues.append({
                    "field_name": field,
                    "issue_type": "MISSING_FIELD",
                    "severity": "CRITICAL",
                    "description": f"Mandatory field '{label}' is missing or could not be detected from the document.",
                    "suggested_fix": f"Review the document scan and manually input the {label}."
                })

        # 2. Survey Number Format Validation
        survey_no = str(data.get("survey_number", "")).strip()
        if survey_no:
            # Typical format: 142 or 142/2 or 142-A or 142/2B
            if not re.match(r'^[0-9]+([/\-][0-9A-Za-z]+)?$', survey_no):
                issues.append({
                    "field_name": "survey_number",
                    "issue_type": "INVALID_SURVEY_FORMAT",
                    "severity": "WARNING",
                    "description": f"Survey number '{survey_no}' contains unconventional characters or formatting.",
                    "suggested_fix": "Verify whether the survey number has an irregular sub-division or mutation prefix."
                })

        # 3. Area Sanity & Consistency Check
        area_val = data.get("area_value")
        if area_val is not None:
            try:
                area_float = float(area_val)
                if area_float <= 0:
                    issues.append({
                        "field_name": "area_value",
                        "issue_type": "AREA_INCONSISTENCY",
                        "severity": "CRITICAL",
                        "description": "Land area cannot be zero or negative.",
                        "suggested_fix": "Confirm positive parcel extent from Schedule of Property."
                    })
                elif area_float > 500 and data.get("area_unit", "Acres") == "Acres":
                    issues.append({
                        "field_name": "area_value",
                        "issue_type": "AREA_INCONSISTENCY",
                        "severity": "WARNING",
                        "description": f"Land extent of {area_float} Acres is unusually large for an individual title.",
                        "suggested_fix": "Verify if this is an estate parcel, village commons, or OCR unit error (e.g. Guntas vs Acres)."
                    })
            except (ValueError, TypeError):
                issues.append({
                    "field_name": "area_value",
                    "issue_type": "AREA_INCONSISTENCY",
                    "severity": "CRITICAL",
                    "description": f"Invalid numerical value for area: '{area_val}'",
                    "suggested_fix": "Enter numeric value for parcel area."
                })

        # 4. Owner Share Check
        share_val = data.get("owner_share_percent")
        if share_val is not None:
            try:
                share_float = float(share_val)
                if share_float <= 0 or share_float > 100:
                    issues.append({
                        "field_name": "owner_share_percent",
                        "issue_type": "UNBALANCED_SHARE",
                        "severity": "CRITICAL",
                        "description": f"Owner share percentage must be between 1% and 100%. Found: {share_float}%.",
                        "suggested_fix": "Recalculate co-ownership undivided share ratio."
                    })
            except (ValueError, TypeError):
                pass

        # 5. Registration Date Sanity Check
        reg_date_str = data.get("registration_date")
        if reg_date_str:
            for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d.%m.%Y"):
                try:
                    parsed_date = datetime.strptime(reg_date_str.strip(), fmt)
                    if parsed_date > datetime.now():
                        issues.append({
                            "field_name": "registration_date",
                            "issue_type": "INVALID_DATE",
                            "severity": "CRITICAL",
                            "description": f"Registration date '{reg_date_str}' is in the future.",
                            "suggested_fix": "Check deed execution stamp for correct historical date."
                        })
                    break
                except ValueError:
                    continue

        # 6. OCR Low Confidence Flags
        for field, conf in confidences.items():
            if conf < 0.70:
                issues.append({
                    "field_name": field,
                    "issue_type": "LOW_CONFIDENCE",
                    "severity": "WARNING",
                    "description": f"Field '{field}' was extracted with low OCR confidence ({int(conf * 100)}%).",
                    "suggested_fix": "Inspect the original scan and confirm text clarity."
                })

        return issues

    def determine_record_status(self, issues: List[Dict[str, Any]]) -> str:
        """Determines record lifecycle status based on validation issues."""
        severities = [i.get("severity") for i in issues]
        if "CRITICAL" in severities:
            return "FLAGGED"
        elif "WARNING" in severities:
            return "PENDING_REVIEW"
        return "VALID"

validation_service = ValidationService()
