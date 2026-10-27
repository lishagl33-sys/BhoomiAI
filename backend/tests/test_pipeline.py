import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import pytest
import numpy as np
from services.ocr_service import ocr_service
from services.nlp_extractor import nlp_extractor
from services.validation_service import validation_service
from services.duplicate_detector import duplicate_detector
from services.mismatch_detector import mismatch_detector
from services.report_generator import report_generator
from services.sample_generator import sample_generator

def test_samples_generation():
    sample_generator.generate_all_samples()
    rtc_file = sample_generator.samples_dir / "sample_rtc_karnataka.png"
    deed_file = sample_generator.samples_dir / "sample_sale_deed_mismatch.png"
    assert rtc_file.exists()
    assert deed_file.exists()

def test_ocr_preprocessing_and_extraction():
    rtc_file = sample_generator.samples_dir / "sample_rtc_karnataka.png"
    binary_img, proc_path = ocr_service.preprocess_image(rtc_file)
    assert binary_img is not None
    assert binary_img.shape[0] > 100
    assert proc_path.exists()

    result = ocr_service.run_ocr(rtc_file)
    assert result["raw_text"] != ""
    assert result["confidence_score"] > 0.5
    assert len(result["bounding_boxes"]) > 0

def test_nlp_extraction():
    sample_text = (
        "GOVERNMENT OF KARNATAKA - REVENUE DEPARTMENT\n"
        "RECORD OF RIGHTS, TENANCY AND CROPS (RTC) - FORM NO. 16\n"
        "State: Karnataka | District: Bengaluru Rural | Taluk: Devanahalli\n"
        "Village: Vijayapura | Survey No: 142/2 | Hissa: 2\n"
        "Owner Name: Ramesh Chandra Gowda | Relative: Late Venkatappa Gowda\n"
        "Land Extent: 3 Acres 20 Guntas\n"
        "Land Classification: Dry Crop (Agricultural)\n"
        "Mutation Number: MR-142/2021 | Registration Date: 14/08/2021\n"
        "Owner Share: 100% | Valuation: Rs. 45,00,000"
    )
    fields, confs = nlp_extractor.extract_entities(sample_text)
    assert fields["survey_number"] == "142/2"
    assert "Ramesh" in fields["owner_name"]
    assert fields["area_value"] == 3.0
    assert fields["area_in_acres"] == 3.5  # 3 Acres + 20/40 = 3.5 Acres
    assert fields["district"] == "Bengaluru Rural"
    assert fields["village"] == "Vijayapura"

def test_validation_service():
    # Valid record
    valid_data = {
        "owner_name": "Ramesh Chandra Gowda",
        "survey_number": "142/2",
        "village": "Vijayapura",
        "district": "Bengaluru Rural",
        "area_value": 3.5,
        "area_unit": "Acres",
        "owner_share_percent": 100.0,
        "registration_date": "14/08/2021"
    }
    issues = validation_service.validate_record(valid_data)
    assert len(issues) == 0
    assert validation_service.determine_record_status(issues) == "VALID"

    # Invalid record
    invalid_data = {
        "owner_name": "",
        "survey_number": "142/2$$#INV",
        "village": "Vijayapura",
        "district": "Bengaluru Rural",
        "area_value": -5.0,
        "owner_share_percent": 120.0,
        "registration_date": "01/01/2099"
    }
    issues = validation_service.validate_record(invalid_data)
    types = [i["issue_type"] for i in issues]
    assert "MISSING_FIELD" in types
    assert "INVALID_SURVEY_FORMAT" in types
    assert "AREA_INCONSISTENCY" in types
    assert "UNBALANCED_SHARE" in types
    assert "INVALID_DATE" in types
    assert validation_service.determine_record_status(issues) == "FLAGGED"

def test_duplicate_detector():
    class DummyRecord:
        def __init__(self, id, dist, vil, sy, sub, owner, area):
            self.id = id
            self.district = dist
            self.village = vil
            self.survey_number = sy
            self.sub_division = sub
            self.owner_name = owner
            self.area_value = area
            self.status = "VALID"

    existing = [
        DummyRecord(1, "Bengaluru Rural", "Vijayapura", "142/2", "2", "Ramesh Chandra Gowda", 3.5),
        DummyRecord(2, "Bengaluru Rural", "Vijayapura", "145/1", "1", "Gopal Rao", 2.0)
    ]

    # Candidate with phonetic similarity and same survey
    candidate = {
        "id": 99,
        "district": "Bengaluru Rural",
        "village": "Vijayapura",
        "survey_number": "142/2",
        "sub_division": "2",
        "owner_name": "Ramesha C Gouda"
    }
    dups = duplicate_detector.check_duplicate(candidate, existing)
    assert len(dups) >= 1
    assert dups[0]["similarity_score"] >= 80.0
    assert dups[0]["target_record_id"] == 1

def test_mismatch_detector():
    class DummyDeptRecord:
        def __init__(self, sy, vil, dept, area, owner):
            self.survey_number = sy
            self.village = vil
            self.source_department = dept
            self.area_in_acres = area
            self.owner_name = owner

    existing = [
        DummyDeptRecord("142/2", "Vijayapura", "Revenue Department (RTC)", 3.50, "Ramesh Chandra Gowda")
    ]

    # Incoming deed with 3.88 Acres (excess area!) and new owner
    incoming = {
        "survey_number": "142/2",
        "village": "Vijayapura",
        "source_department": "Sub-Registrar Office (Sale Deed)",
        "area_in_acres": 3.88,
        "owner_name": "Suresh Kumar"
    }
    mismatches = mismatch_detector.check_department_mismatches(incoming, existing)
    assert len(mismatches) >= 1
    fields_flagged = [m["field_name"] for m in mismatches]
    assert "Land Area (Acres)" in fields_flagged

def test_pdf_report_generation():
    sample_rec = {
        "survey_number": "142/2",
        "sub_division": "2",
        "owner_name": "Ramesh Chandra Gowda",
        "relative_name": "Late Venkatappa Gowda",
        "village": "Vijayapura",
        "taluk": "Devanahalli",
        "district": "Bengaluru Rural",
        "state": "Karnataka",
        "area_value": 3.5,
        "area_unit": "Acres",
        "area_in_acres": 3.5,
        "land_type": "Agricultural",
        "mutation_number": "MR-142/2021",
        "valuation_amount": 4500000.0,
        "source_department": "Revenue Department (RTC)"
    }
    issues = [{"field_name": "Test Field", "severity": "WARNING", "description": "Test warning", "suggested_fix": "None"}]
    pdf = report_generator.generate_pdf_report(sample_rec, issues, [], [])
    assert pdf.exists()
    assert pdf.stat().st_size > 1000  # Non-empty valid PDF
