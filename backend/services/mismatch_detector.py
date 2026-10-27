from typing import List, Dict, Any
from rapidfuzz import fuzz
from config import AREA_MISMATCH_TOLERANCE_PERCENT

class MismatchDetector:
    def check_department_mismatches(self, record: Dict[str, Any], department_records: List[Any]) -> List[Dict[str, Any]]:
        """
        Compares incoming digitized record against departmental databases
        (e.g., Revenue RTC vs Sub-Registrar Office Deeds vs Cadastral Survey).
        """
        mismatches = []
        sy = str(record.get("survey_number", "")).strip()
        village = str(record.get("village", "")).strip()
        source_dept = record.get("source_department", "Revenue Department (RTC)")
        curr_area = float(record.get("area_in_acres", record.get("area_value", 0.0)))
        curr_owner = str(record.get("owner_name", "")).strip()

        for d_rec in department_records:
            d_dept = getattr(d_rec, "source_department", "Sub-Registrar Office (Sale Deed)")
            # Compare across differing departments for the same survey number & village
            if d_dept == source_dept:
                continue

            d_sy = str(getattr(d_rec, "survey_number", "")).strip()
            d_vil = str(getattr(d_rec, "village", "")).strip()

            if sy.lower() == d_sy.lower() and village.lower() == d_vil.lower():
                d_area = float(getattr(d_rec, "area_in_acres", getattr(d_rec, "area_value", 0.0)))
                d_owner = str(getattr(d_rec, "owner_name", "")).strip()

                # 1. Check Land Area Variance
                if curr_area > 0 and d_area > 0:
                    area_diff = abs(curr_area - d_area)
                    pct_diff = round((area_diff / max(curr_area, d_area)) * 100.0, 2)
                    
                    if pct_diff > AREA_MISMATCH_TOLERANCE_PERCENT:
                        mismatches.append({
                            "survey_number": sy,
                            "village": village,
                            "dept_source_1": source_dept,
                            "dept_source_2": d_dept,
                            "field_name": "Land Area (Acres)",
                            "value_1": f"{curr_area:.2f} Acres",
                            "value_2": f"{d_area:.2f} Acres",
                            "discrepancy_percentage": pct_diff,
                            "severity": "HIGH" if pct_diff > 10.0 else "MEDIUM",
                            "discrepancy_description": (
                                f"Area variance of {pct_diff}% exceeds statutory {AREA_MISMATCH_TOLERANCE_PERCENT}% tolerance. "
                                f"{source_dept} registers {curr_area:.2f} Acres, whereas {d_dept} indicates {d_area:.2f} Acres."
                            )
                        })

                # 2. Check Titleholder / Grantee Name Discrepancy
                name_similarity = fuzz.token_sort_ratio(curr_owner.lower(), d_owner.lower())
                if name_similarity < 70.0:
                    mismatches.append({
                        "survey_number": sy,
                        "village": village,
                        "dept_source_1": source_dept,
                        "dept_source_2": d_dept,
                        "field_name": "Owner / Titleholder Name",
                        "value_1": curr_owner,
                        "value_2": d_owner,
                        "discrepancy_percentage": round(100.0 - name_similarity, 1),
                        "severity": "HIGH",
                        "discrepancy_description": (
                            f"Name mismatch between departments. {source_dept} records '{curr_owner}', "
                            f"while {d_dept} lists '{d_owner}'. Mutation endorsement or unexecuted deed pending."
                        )
                    })

        return mismatches

mismatch_detector = MismatchDetector()
