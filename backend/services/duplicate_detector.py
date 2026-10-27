from typing import List, Dict, Any
from rapidfuzz import fuzz

class DuplicateDetector:
    def __init__(self, duplicate_threshold: float = 75.0):
        self.duplicate_threshold = duplicate_threshold

    def calculate_name_similarity(self, name1: str, name2: str) -> float:
        """Computes fuzzy token sort ratio and partial ratio for Indian names."""
        n1 = name1.strip().lower()
        n2 = name2.strip().lower()
        if n1 == n2:
            return 100.0
        
        # Token sort ignores word order (e.g. "Kumar Ramesh" vs "Ramesh Kumar")
        token_sort = fuzz.token_sort_ratio(n1, n2)
        token_set = fuzz.token_set_ratio(n1, n2)
        lev = fuzz.ratio(n1, n2)

        return round(float(max(token_sort * 0.5 + token_set * 0.3 + lev * 0.2, lev)), 1)

    def check_duplicate(self, candidate: Dict[str, Any], existing_records: List[Any]) -> List[Dict[str, Any]]:
        """
        Scans existing records for exact spatial collisions and fuzzy name matches.
        """
        matches = []
        c_dist = str(candidate.get("district", "")).strip().lower()
        c_vil = str(candidate.get("village", "")).strip().lower()
        c_sy = str(candidate.get("survey_number", "")).strip().lower()
        c_sub = str(candidate.get("sub_division", "1")).strip().lower()
        c_owner = str(candidate.get("owner_name", "")).strip()

        for rec in existing_records:
            # Skip self if checking existing record
            rec_id = getattr(rec, "id", None)
            if rec_id and rec_id == candidate.get("id"):
                continue

            r_dist = str(getattr(rec, "district", "")).strip().lower()
            r_vil = str(getattr(rec, "village", "")).strip().lower()
            r_sy = str(getattr(rec, "survey_number", "")).strip().lower()
            r_sub = str(getattr(rec, "sub_division", "1")).strip().lower()
            r_owner = str(getattr(rec, "owner_name", "")).strip()

            same_village = (c_vil == r_vil) or (c_dist == r_dist and fuzz.ratio(c_vil, r_vil) > 85)
            same_survey = (c_sy == r_sy)
            same_sub = (c_sub == r_sub)
            name_score = self.calculate_name_similarity(c_owner, r_owner)

            similarity_score = 0.0
            match_type = ""
            details = []

            # Scenario 1: Exact Spatial Key + High Name Match -> DUPLICATE RECORD
            if same_village and same_survey and same_sub and name_score >= 75.0:
                similarity_score = round(0.5 * 100 + 0.5 * name_score, 1)
                match_type = "EXACT_SPATIAL_AND_FUZZY_NAME"
                details.append(f"Identical Survey {c_sy}/{c_sub} in Village '{candidate.get('village')}'.")
                details.append(f"Owner Name match ({name_score}%): '{c_owner}' vs '{r_owner}'.")

            # Scenario 2: Exact Spatial Key + Different Owner -> DOUBLE DEED / ENCUMBRANCE
            elif same_village and same_survey and same_sub and name_score < 75.0:
                similarity_score = 88.0
                match_type = "SURVEY_NUMBER_COLLISION"
                details.append(f"Conflict: Survey {c_sy}/{c_sub} in '{candidate.get('village')}' is already registered to a different owner.")
                details.append(f"Current Owner: '{r_owner}' | Incoming Document Owner: '{c_owner}'.")

            # Scenario 3: High Name Match across same village with different survey number -> POTENTIAL MULTI-PARCEL ALIAS
            elif same_village and not same_survey and name_score >= 88.0:
                similarity_score = round(name_score * 0.75, 1)
                match_type = "OWNER_MULTI_PARCEL"
                details.append(f"Same owner '{r_owner}' holds adjacent or distinct parcel {r_sy} in same village.")

            if similarity_score >= self.duplicate_threshold:
                matches.append({
                    "target_record_id": rec_id,
                    "target_owner": r_owner,
                    "target_survey": f"{getattr(rec, 'survey_number', '')}/{getattr(rec, 'sub_division', '')}",
                    "target_village": getattr(rec, "village", ""),
                    "target_area": getattr(rec, "area_value", 0),
                    "target_status": getattr(rec, "status", "VALID"),
                    "similarity_score": similarity_score,
                    "match_type": match_type,
                    "details": " | ".join(details)
                })

        # Sort by highest similarity
        matches.sort(key=lambda x: x["similarity_score"], reverse=True)
        return matches

duplicate_detector = DuplicateDetector()
