from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

# ==========================================
# 🏛️ Location Schemas
# ==========================================

class DistrictResponse(BaseModel):
    id: int
    name: str
    state: str
    model_config = ConfigDict(from_attributes=True)


class TalukResponse(BaseModel):
    id: int
    district_id: int
    name: str
    model_config = ConfigDict(from_attributes=True)


class HobliResponse(BaseModel):
    id: int
    taluk_id: int
    name: str
    model_config = ConfigDict(from_attributes=True)


class VillageResponse(BaseModel):
    id: int
    hobli_id: int
    name: str
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 📑 Reference Parcel Schemas
# ==========================================

class ReferenceParcelResponse(BaseModel):
    id: int
    district: str
    taluk: str
    hobli: str
    village: str
    survey_number: str
    surnoc: str
    hissa_number: str
    record_year: str
    record_type: str
    owner_name: str
    relative_name: Optional[str] = None
    area_value: float
    area_unit: str
    area_in_acres: float
    land_type: str
    mutation_number: Optional[str] = None
    dataset_source: str
    retrieval_date: str
    verification_status: str
    is_synthetic: bool = True
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ReferenceParcelCreate(BaseModel):
    district: str
    taluk: str
    hobli: str
    village: str
    survey_number: str
    surnoc: Optional[str] = "*"
    hissa_number: Optional[str] = "1"
    record_year: Optional[str] = "2024-2025"
    record_type: Optional[str] = "CURRENT_RTC"
    owner_name: str
    relative_name: Optional[str] = None
    area_value: float
    area_unit: Optional[str] = "Acres"
    land_type: Optional[str] = "Dry Crop"
    mutation_number: Optional[str] = None
    dataset_source: Optional[str] = "Admin Manual Entry"


class ReferenceImportResponse(BaseModel):
    success: bool
    message: str
    total_rows: int
    valid_rows: int
    invalid_rows: int
    errors: List[Dict[str, Any]]


# ==========================================
# 🔍 Verification Result Schemas
# ==========================================

class FieldComparisonItem(BaseModel):
    field: str
    label: str
    extracted_value: Any
    reference_value: Any
    status: str  # EXACT_MATCH, POSSIBLE_MATCH, MISMATCH, UNAVAILABLE
    difference: str


class VerificationResultResponse(BaseModel):
    id: int
    document_id: int
    record_id: Optional[int] = None
    reference_parcel_id: Optional[int] = None
    final_status: str  # MATCH, NEEDS_REVIEW, MISMATCH_DETECTED, REFERENCE_UNAVAILABLE
    discrepancy_score: float
    field_comparisons: List[Dict[str, Any]]
    warnings: List[str]
    reference_source_details: Optional[str] = None
    verified_at: datetime
    reference_parcel: Optional[ReferenceParcelResponse] = None
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 📤 Document Upload Schemas
# ==========================================

class DocumentUploadResponse(BaseModel):
    id: int
    filename: str
    document_category: Optional[str] = "RTC / Pahani (Form 16)"
    document_type: Optional[str] = "RTC / Pahani (Form 16)"
    district: Optional[str] = None
    taluk: Optional[str] = None
    hobli: Optional[str] = None
    village: Optional[str] = None
    survey_number: Optional[str] = None
    surnoc: Optional[str] = "*"
    hissa_number: Optional[str] = "1"
    record_year: Optional[str] = "2024-2025"
    record_type: Optional[str] = "CURRENT_RTC"
    language: Optional[str] = "en"
    confidence_score: float
    processing_time_ms: int
    status: str
    created_at: datetime
    processed_image_url: Optional[str] = None
    original_image_url: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class ValidationIssueResponse(BaseModel):
    id: int
    record_id: Optional[int] = None
    document_id: Optional[int] = None
    field_name: str
    issue_type: str
    severity: str
    description: str
    suggested_fix: Optional[str] = None
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class GISCoordinate(BaseModel):
    corner: str
    lat: float
    lng: float
    marker_stone: str


class GISParcelResponse(BaseModel):
    record_id: int
    survey_number: str
    village: str
    district: str
    owner_name: str
    area_acres: float
    center_lat: float
    center_lng: float
    polygon: List[List[float]]
    corners: List[GISCoordinate]
    encroachment_flag: bool = False
    encroachment_details: Optional[str] = None
    status: str = "VALID"


class FieldInspectionCreate(BaseModel):
    record_id: int
    inspector_id: str
    inspector_name: str
    inspection_lat: float
    inspection_lng: float
    boundary_stones_verified: bool = True
    crop_status: str = "Standing Crop Verified"
    occupant_match: bool = True
    photo_url: Optional[str] = None
    notes: Optional[str] = None


class FieldInspectionResponse(BaseModel):
    id: int
    record_id: int
    inspector_id: str
    inspector_name: str
    inspection_lat: float
    inspection_lng: float
    distance_to_boundary_m: float
    within_geofence: bool
    boundary_stones_verified: bool
    crop_status: str
    occupant_match: bool
    photo_url: Optional[str] = None
    notes: Optional[str] = None
    verified_at: datetime
    model_config = ConfigDict(from_attributes=True)


class BlockchainBlockResponse(BaseModel):
    id: int
    block_index: int
    timestamp: datetime
    prev_hash: str
    current_hash: str
    merkle_root: str
    nonce: int
    action: str
    record_id: Optional[int] = None
    survey_number: Optional[str] = None
    village: Optional[str] = None
    owner_name: Optional[str] = None
    details: Optional[str] = None
    validator: str
    is_verified: bool
    model_config = ConfigDict(from_attributes=True)


class BlockchainVerifyResponse(BaseModel):
    is_valid: bool
    total_blocks: int
    latest_block_hash: Optional[str] = None
    message: str
    audit_duration_ms: float = 0.0


class LandRecordBase(BaseModel):
    state: str = "Karnataka"
    district: str
    taluk: Optional[str] = None
    hobli: Optional[str] = None
    village: str
    survey_number: str
    surnoc: Optional[str] = "*"
    hissa_number: Optional[str] = "1"
    record_year: Optional[str] = "2024-2025"
    record_type: Optional[str] = "CURRENT_RTC"
    owner_name: str
    relative_name: Optional[str] = None
    owner_share_percent: float = 100.0
    area_value: float
    area_unit: str = "Acres"
    area_in_acres: float
    land_type: Optional[str] = "Agricultural"
    mutation_number: Optional[str] = None
    registration_date: Optional[str] = None
    valuation_amount: Optional[float] = 0.0
    north_boundary: Optional[str] = None
    south_boundary: Optional[str] = None
    east_boundary: Optional[str] = None
    west_boundary: Optional[str] = None
    source_department: Optional[str] = "Revenue Department (RTC)"
    language: Optional[str] = "en"
    status: str = "VALID"


class LandRecordUpdate(BaseModel):
    owner_name: Optional[str] = None
    relative_name: Optional[str] = None
    survey_number: Optional[str] = None
    surnoc: Optional[str] = None
    hissa_number: Optional[str] = None
    record_year: Optional[str] = None
    village: Optional[str] = None
    hobli: Optional[str] = None
    taluk: Optional[str] = None
    district: Optional[str] = None
    area_value: Optional[float] = None
    area_unit: Optional[str] = None
    land_type: Optional[str] = None
    registration_date: Optional[str] = None
    valuation_amount: Optional[float] = None
    owner_share_percent: Optional[float] = None


class LandRecordResponse(LandRecordBase):
    id: int
    document_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    polygon_coordinates: Optional[str] = None
    gis_encroachment_flag: bool = False
    encroachment_details: Optional[str] = None
    blockchain_tx_hash: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    issues: List[ValidationIssueResponse] = []
    model_config = ConfigDict(from_attributes=True)


class DuplicateMatchResponse(BaseModel):
    id: int
    similarity_score: float
    match_type: str
    details: Optional[str] = None
    status: str
    created_at: datetime
    source_record: Optional[LandRecordResponse] = None
    target_record: Optional[LandRecordResponse] = None
    model_config = ConfigDict(from_attributes=True)


class MismatchLogResponse(BaseModel):
    id: int
    survey_number: str
    village: str
    dept_source_1: str
    dept_source_2: str
    field_name: str
    value_1: str
    value_2: str
    discrepancy_description: str
    discrepancy_percentage: float
    severity: str
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ExtractionResult(BaseModel):
    document_id: int
    document_category: str = "RTC / Pahani (Form 16)"
    document_type: str = "RTC / Pahani (Form 16)"
    language: str = "en"
    confidence_score: float
    processing_time_ms: int
    extracted_fields: Dict[str, Any]
    field_confidences: Dict[str, float]
    bounding_boxes: List[Dict[str, Any]]
    validation_issues: List[Dict[str, Any]]
    verification_result: Optional[Dict[str, Any]] = None
    duplicates_detected: List[Dict[str, Any]] = []
    mismatches_detected: List[Dict[str, Any]] = []
    gis_polygon_data: Optional[Dict[str, Any]] = None
    blockchain_block: Optional[Dict[str, Any]] = None
    record_id: Optional[int] = None
    processed_image_url: Optional[str] = None
    original_image_url: Optional[str] = None


class DashboardStatsResponse(BaseModel):
    total_documents: int
    successfully_processed: int
    awaiting_review: int
    possible_mismatches: int
    insufficient_reference_data: int
    total_records: int
    valid_records: int
    total_reference_parcels: int = 0
    records_with_issues: int
    potential_duplicates: int
    data_mismatches: int
    average_confidence: float
    total_blockchain_blocks: int = 1
    gis_encroachments_count: int = 0
    field_inspections_count: int = 0
    issues_by_severity: Dict[str, int]
    records_by_type: Dict[str, int]
    district_distribution: List[Dict[str, Any]]
    recent_activity: List[Dict[str, Any]]


# ==========================================
# 🗺️ Land Parcel & Spatial GIS Schemas
# ==========================================

class LandRecordDocumentResponse(BaseModel):
    id: int
    document_type: str
    secure_file_reference: str
    issuing_source: str
    document_date: Optional[str] = None
    ocr_status: str
    review_status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class LandParcelSummaryResponse(BaseModel):
    id: int
    district: str
    taluk: str
    hobli: str
    village: str
    survey_number: str
    hissa_number: str
    surnoc: str
    area_acres: float
    perimeter_meters: Optional[float] = None
    center_lat: float
    center_lng: float
    geometry_source: str
    verification_status: str
    is_synthetic: bool
    land_type: Optional[str] = "Agricultural"
    notes: Optional[str] = None
    created_by: Optional[str] = "User"
    model_config = ConfigDict(from_attributes=True)


class LandParcelDetailResponse(LandParcelSummaryResponse):
    boundary_geojson: Dict[str, Any]
    linked_records: List[Dict[str, Any]] = []
    documents: List[LandRecordDocumentResponse] = []


class LandParcelCreate(BaseModel):
    district: str = "Davanagere"
    district_code: Optional[str] = None
    taluk: str = "Davanagere"
    taluk_code: Optional[str] = None
    hobli: str = "Kasaba"
    hobli_code: Optional[str] = None
    village: str = "Avaragere"
    village_code: Optional[str] = None
    survey_number: str = "Custom"
    hissa_number: Optional[str] = "1"
    surnoc: Optional[str] = "*"
    boundary_geojson: Dict[str, Any]
    center_lat: Optional[float] = None
    center_lng: Optional[float] = None
    area_acres: Optional[float] = None
    perimeter_meters: Optional[float] = None
    land_type: Optional[str] = "Agricultural"
    owner_name: Optional[str] = None
    relative_name: Optional[str] = None
    notes: Optional[str] = None
    verification_status: Optional[str] = "USER_DRAWN_UNVERIFIED"
    geometry_source: Optional[str] = "User Drawn Boundary"
    created_by: Optional[str] = "User"


class LandParcelUpdate(BaseModel):
    survey_number: Optional[str] = None
    hissa_number: Optional[str] = None
    district: Optional[str] = None
    taluk: Optional[str] = None
    hobli: Optional[str] = None
    village: Optional[str] = None
    boundary_geojson: Optional[Dict[str, Any]] = None
    center_lat: Optional[float] = None
    center_lng: Optional[float] = None
    area_acres: Optional[float] = None
    perimeter_meters: Optional[float] = None
    land_type: Optional[str] = None
    owner_name: Optional[str] = None
    relative_name: Optional[str] = None
    notes: Optional[str] = None
    verification_status: Optional[str] = None


class PolygonIdentifyRequest(BaseModel):
    geometry: Optional[Dict[str, Any]] = None
    polygon: Optional[Dict[str, Any]] = None


class PolygonIdentifyResponse(BaseModel):
    match_status: str  # STRONG_MATCH, MULTIPLE_CANDIDATES, NO_MATCH
    match_type: Optional[str] = None
    message: str
    matching_parcels: List[Dict[str, Any]] = []
    candidates: Optional[List[Dict[str, Any]]] = None
    primary_match: Optional[Dict[str, Any]] = None
    matched_parcel: Optional[Dict[str, Any]] = None
    candidate_count: Optional[int] = 0
    drawn_polygon_area_acres: Optional[float] = 0.0
    disclaimer: str = "Arbitrary polygon selection does not establish legal boundaries or title. Independent verification against physical revenue registers is required."

