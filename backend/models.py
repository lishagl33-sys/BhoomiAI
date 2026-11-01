from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from database import Base

# ==========================================
# 🏛️ Karnataka Administrative Location Models
# ==========================================

class District(Base):
    __tablename__ = "districts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    state = Column(String(100), default="Karnataka")

    taluks = relationship("Taluk", back_populates="district", cascade="all, delete-orphan")


class Taluk(Base):
    __tablename__ = "taluks"

    id = Column(Integer, primary_key=True, index=True)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=False)
    name = Column(String(100), nullable=False, index=True)

    district = relationship("District", back_populates="taluks")
    hoblis = relationship("Hobli", back_populates="taluk", cascade="all, delete-orphan")


class Hobli(Base):
    __tablename__ = "hoblis"

    id = Column(Integer, primary_key=True, index=True)
    taluk_id = Column(Integer, ForeignKey("taluks.id"), nullable=False)
    name = Column(String(100), nullable=False, index=True)

    taluk = relationship("Taluk", back_populates="hoblis")
    villages = relationship("Village", back_populates="hobli", cascade="all, delete-orphan")


class Village(Base):
    __tablename__ = "villages"

    id = Column(Integer, primary_key=True, index=True)
    hobli_id = Column(Integer, ForeignKey("hoblis.id"), nullable=False)
    name = Column(String(100), nullable=False, index=True)

    hobli = relationship("Hobli", back_populates="villages")


# ==========================================
# 📑 Reference Dataset Model
# ==========================================

class ReferenceParcel(Base):
    """
    Authoritative reference land parcel against which uploaded documents are verified.
    Clearly records dataset source, retrieval date, and synthetic/authentic flag.
    """
    __tablename__ = "reference_parcels"

    id = Column(Integer, primary_key=True, index=True)
    district = Column(String(100), nullable=False, index=True)
    taluk = Column(String(100), nullable=False, index=True)
    hobli = Column(String(100), nullable=False)
    village = Column(String(100), nullable=False, index=True)

    survey_number = Column(String(100), nullable=False, index=True)
    surnoc = Column(String(50), default="*")
    hissa_number = Column(String(50), default="1")
    record_year = Column(String(50), default="2024-2025")
    record_type = Column(String(50), default="CURRENT_RTC")  # CURRENT_RTC or HISTORICAL_RTC

    owner_name = Column(String(200), nullable=False, index=True)
    relative_name = Column(String(200), nullable=True)  # Father / Husband name
    area_value = Column(Float, nullable=False)
    area_unit = Column(String(50), default="Acres")
    area_in_acres = Column(Float, nullable=False)
    land_type = Column(String(100), default="Dry Crop (Agricultural)")
    mutation_number = Column(String(100), nullable=True)

    # Dataset Source & Auditability
    dataset_source = Column(String(255), default="Government of Karnataka Bhoomi Baseline [SYNTHETIC / DEMO DATA]")
    retrieval_date = Column(String(50), default="2024-10-01")
    verification_status = Column(String(50), default="VERIFIED_BASELINE")
    is_synthetic = Column(Boolean, default=True)  # Clearly labels synthetic demo records
    created_at = Column(DateTime, default=datetime.utcnow)

    verification_results = relationship("VerificationResult", back_populates="reference_parcel")


# ==========================================
# 📤 Document Uploads & Metadata
# ==========================================

class DocumentUpload(Base):
    __tablename__ = "document_uploads"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_path = Column(String(500), nullable=False)
    processed_path = Column(String(500), nullable=True)
    file_type = Column(String(50), nullable=True)
    file_size_bytes = Column(Integer, default=0)
    document_category = Column(String(100), default="RTC / Pahani (Form 16)")

    # Associated Location & Parcel Identifiers
    district = Column(String(100), nullable=True)
    taluk = Column(String(100), nullable=True)
    hobli = Column(String(100), nullable=True)
    village = Column(String(100), nullable=True)
    survey_number = Column(String(100), nullable=True)
    surnoc = Column(String(50), default="*")
    hissa_number = Column(String(50), default="1")
    record_year = Column(String(50), default="2024-2025")
    record_type = Column(String(50), default="CURRENT_RTC")

    language = Column(String(20), default="en")  # en, kn, mr, hi, te, ta
    raw_ocr_text = Column(Text, nullable=True)
    page_number = Column(Integer, default=1)
    confidence_score = Column(Float, default=0.0)
    processing_time_ms = Column(Integer, default=0)
    status = Column(String(50), default="COMPLETED")  # PENDING, PROCESSING, COMPLETED, FAILED
    created_at = Column(DateTime, default=datetime.utcnow)

    records = relationship("LandRecord", back_populates="document", cascade="all, delete-orphan")
    issues = relationship("ValidationIssue", back_populates="document", cascade="all, delete-orphan")
    verification_results = relationship("VerificationResult", back_populates="document", cascade="all, delete-orphan")


# ==========================================
# 🌿 Extracted Land Records (Human-in-the-Loop)
# ==========================================

class LandRecord(Base):
    __tablename__ = "land_records"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("document_uploads.id"), nullable=True)
    state = Column(String(100), default="Karnataka")
    district = Column(String(100), nullable=False)
    taluk = Column(String(100), nullable=True)
    hobli = Column(String(100), nullable=True)
    village = Column(String(100), nullable=False)

    survey_number = Column(String(100), nullable=False, index=True)
    sub_division = Column(String(50), nullable=True, default="1")
    surnoc = Column(String(50), default="*")
    hissa_number = Column(String(50), default="1")
    record_year = Column(String(50), default="2024-2025")
    record_type = Column(String(50), default="CURRENT_RTC")

    owner_name = Column(String(200), nullable=False, index=True)
    relative_name = Column(String(200), nullable=True)
    owner_share_percent = Column(Float, default=100.0)
    area_value = Column(Float, nullable=False)
    area_unit = Column(String(50), default="Acres")
    area_in_acres = Column(Float, nullable=False)
    land_type = Column(String(100), default="Agricultural")
    mutation_number = Column(String(100), nullable=True)
    registration_date = Column(String(50), nullable=True)
    valuation_amount = Column(Float, default=0.0)
    north_boundary = Column(String(200), nullable=True)
    south_boundary = Column(String(200), nullable=True)
    east_boundary = Column(String(200), nullable=True)
    west_boundary = Column(String(200), nullable=True)
    source_department = Column(String(100), default="Revenue Department (RTC)")
    language = Column(String(20), default="en")

    # Geospatial (GIS) Attributes
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    polygon_coordinates = Column(Text, nullable=True)
    gis_encroachment_flag = Column(Boolean, default=False)
    encroachment_details = Column(String(255), nullable=True)

    # Blockchain Audit Reference
    blockchain_tx_hash = Column(String(100), nullable=True)

    status = Column(String(50), default="VALID")  # VALID, FLAGGED, PENDING_REVIEW
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    parcel_id = Column(Integer, ForeignKey("land_parcels.id"), nullable=True)
    document = relationship("DocumentUpload", back_populates="records")
    parcel = relationship("LandParcel", back_populates="records")
    documents = relationship("LandRecordDocument", back_populates="record", cascade="all, delete-orphan")
    issues = relationship("ValidationIssue", back_populates="record", cascade="all, delete-orphan")
    inspections = relationship("FieldInspectionLog", back_populates="record", cascade="all, delete-orphan")
    verification_results = relationship("VerificationResult", back_populates="record", cascade="all, delete-orphan")


# ==========================================
# 🔍 Verification Result Model
# ==========================================

class VerificationResult(Base):
    """
    Stores field-by-field verification analysis against ReferenceParcel.
    Statuses: Match, Needs Review, Mismatch Detected, Reference Data Unavailable.
    """
    __tablename__ = "verification_results"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("document_uploads.id"), nullable=False)
    record_id = Column(Integer, ForeignKey("land_records.id"), nullable=True)
    reference_parcel_id = Column(Integer, ForeignKey("reference_parcels.id"), nullable=True)

    final_status = Column(String(50), nullable=False)  # MATCH, NEEDS_REVIEW, MISMATCH_DETECTED, REFERENCE_UNAVAILABLE
    discrepancy_score = Column(Float, default=0.0)     # Computed variance %
    field_comparisons_json = Column(Text, nullable=False)  # JSON dictionary of side-by-side field comparisons
    warnings_json = Column(Text, nullable=False)          # JSON list of warnings & missing info
    reference_source_details = Column(String(255), nullable=True)
    verified_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("DocumentUpload", back_populates="verification_results")
    record = relationship("LandRecord", back_populates="verification_results")
    reference_parcel = relationship("ReferenceParcel", back_populates="verification_results")


# ==========================================
# 📋 Validation Issue Model
# ==========================================

class ValidationIssue(Base):
    __tablename__ = "validation_issues"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("land_records.id"), nullable=True)
    document_id = Column(Integer, ForeignKey("document_uploads.id"), nullable=True)
    field_name = Column(String(100), nullable=False)
    issue_type = Column(String(100), nullable=False)
    severity = Column(String(50), default="WARNING")  # CRITICAL, WARNING, INFO
    description = Column(Text, nullable=False)
    suggested_fix = Column(Text, nullable=True)
    status = Column(String(50), default="OPEN")  # OPEN, RESOLVED, IGNORED
    created_at = Column(DateTime, default=datetime.utcnow)

    record = relationship("LandRecord", back_populates="issues")
    document = relationship("DocumentUpload", back_populates="issues")


# ==========================================
# 📊 Admin Reference Import Audit Log
# ==========================================

class ReferenceImportAudit(Base):
    __tablename__ = "reference_import_audits"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    total_rows = Column(Integer, default=0)
    valid_rows = Column(Integer, default=0)
    invalid_rows = Column(Integer, default=0)
    errors_summary = Column(Text, nullable=True)
    dataset_source = Column(String(255), nullable=False)
    imported_by = Column(String(100), default="Revenue Admin")
    imported_at = Column(DateTime, default=datetime.utcnow)


# ==========================================
# ⛓️ Blockchain, Duplicates & Inspections
# ==========================================

class DuplicateMatch(Base):
    __tablename__ = "duplicate_matches"

    id = Column(Integer, primary_key=True, index=True)
    source_record_id = Column(Integer, ForeignKey("land_records.id"), nullable=False)
    target_record_id = Column(Integer, ForeignKey("land_records.id"), nullable=False)
    similarity_score = Column(Float, nullable=False)
    match_type = Column(String(100), default="FUZZY_NAME_AND_SURVEY")
    details = Column(Text, nullable=True)
    status = Column(String(50), default="UNRESOLVED")
    created_at = Column(DateTime, default=datetime.utcnow)


class MismatchLog(Base):
    __tablename__ = "mismatch_logs"

    id = Column(Integer, primary_key=True, index=True)
    survey_number = Column(String(100), nullable=False)
    village = Column(String(100), nullable=False)
    dept_source_1 = Column(String(100), nullable=False)
    dept_source_2 = Column(String(100), nullable=False)
    field_name = Column(String(100), nullable=False)
    value_1 = Column(String(200), nullable=False)
    value_2 = Column(String(200), nullable=False)
    discrepancy_description = Column(Text, nullable=False)
    discrepancy_percentage = Column(Float, default=0.0)
    severity = Column(String(50), default="HIGH")
    status = Column(String(50), default="FLAGGED")
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditReport(Base):
    __tablename__ = "audit_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_number = Column(String(100), unique=True, nullable=False)
    record_id = Column(Integer, ForeignKey("land_records.id"), nullable=True)
    document_id = Column(Integer, ForeignKey("document_uploads.id"), nullable=True)
    file_path = Column(String(500), nullable=True)
    summary_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class BlockchainBlock(Base):
    __tablename__ = "blockchain_blocks"

    id = Column(Integer, primary_key=True, index=True)
    block_index = Column(Integer, unique=True, nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    prev_hash = Column(String(64), nullable=False)
    current_hash = Column(String(64), unique=True, nullable=False, index=True)
    merkle_root = Column(String(64), nullable=False)
    nonce = Column(Integer, default=0)
    action = Column(String(100), nullable=False)
    record_id = Column(Integer, nullable=True)
    survey_number = Column(String(100), nullable=True)
    village = Column(String(100), nullable=True)
    owner_name = Column(String(200), nullable=True)
    details = Column(Text, nullable=True)
    validator = Column(String(150), default="National Cadastral Validator #01")
    is_verified = Column(Boolean, default=True)


class FieldInspectionLog(Base):
    __tablename__ = "field_inspection_logs"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("land_records.id"), nullable=False)
    inspector_id = Column(String(100), nullable=False)
    inspector_name = Column(String(200), nullable=False)
    inspection_lat = Column(Float, nullable=False)
    inspection_lng = Column(Float, nullable=False)
    distance_to_boundary_m = Column(Float, default=0.0)
    within_geofence = Column(Boolean, default=True)
    boundary_stones_verified = Column(Boolean, default=True)
    crop_status = Column(String(100), default="Standing Crop Verified")
    occupant_match = Column(Boolean, default=True)
    photo_url = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    verified_at = Column(DateTime, default=datetime.utcnow)

    record = relationship("LandRecord", back_populates="inspections")


# ==========================================
# 🗺️ Cadastral Land Parcel Model
# ==========================================

class LandParcel(Base):
    """
    Cadastral parcel entity storing verified boundary geometry (WGS84 GeoJSON polygon),
    administrative location hierarchy, and linkage to authorized ownership records.
    """
    __tablename__ = "land_parcels"

    id = Column(Integer, primary_key=True, index=True)
    district = Column(String(100), nullable=False, index=True)
    district_code = Column(String(50), nullable=True)
    taluk = Column(String(100), nullable=False, index=True)
    taluk_code = Column(String(50), nullable=True)
    hobli = Column(String(100), nullable=False, index=True)
    hobli_code = Column(String(50), nullable=True)
    village = Column(String(100), nullable=False, index=True)
    village_code = Column(String(50), nullable=True)

    survey_number = Column(String(100), nullable=False, index=True)
    hissa_number = Column(String(50), default="1", index=True)
    surnoc = Column(String(50), default="*")

    # WGS84 GeoJSON Polygon: {"type": "Polygon", "coordinates": [[[lng, lat], ...]]}
    boundary_geojson = Column(Text, nullable=False)
    center_lat = Column(Float, nullable=False)
    center_lng = Column(Float, nullable=False)
    area_acres = Column(Float, nullable=False)

    # Provenance & Audit
    geometry_source = Column(String(255), default="Government of Karnataka Survey Settlement & Land Records [SYNTHETIC / DEMO DATA]")
    source_record_id = Column(String(100), nullable=True)
    data_import_date = Column(DateTime, default=datetime.utcnow)
    verification_status = Column(String(50), default="VERIFIED_AUTHORIZED")  # VERIFIED_AUTHORIZED, USER_DRAWN_UNVERIFIED, IMPORTED_UNVERIFIED, OCR_REVIEW_REQUIRED
    is_synthetic = Column(Boolean, default=True)

    # Extended Plot & Measurement Attributes
    perimeter_meters = Column(Float, nullable=True)
    land_type = Column(String(100), default="Agricultural")
    notes = Column(Text, nullable=True)
    created_by = Column(String(100), default="User")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    records = relationship("LandRecord", back_populates="parcel", cascade="all, delete-orphan")


# ==========================================
# 📜 Land Record Documents
# ==========================================

class LandRecordDocument(Base):
    """
    Official document files (RTC scans, Mutation extracts, Tippan sketches) linked to a Land Record.
    """
    __tablename__ = "land_record_documents"

    id = Column(Integer, primary_key=True, index=True)
    land_record_id = Column(Integer, ForeignKey("land_records.id"), nullable=False)
    document_type = Column(String(100), nullable=False)  # RTC / Pahani (Form 16), Mutation Extract (Form 21/MR), Cadastral Survey Sketch (Tippan/FMB)
    secure_file_reference = Column(String(500), nullable=False)
    issuing_source = Column(String(255), default="Bhoomi Revenue Portal, Govt of Karnataka")
    document_date = Column(String(50), nullable=True)
    ocr_status = Column(String(50), default="COMPLETED")
    review_status = Column(String(50), default="VERIFIED")
    created_at = Column(DateTime, default=datetime.utcnow)

    record = relationship("LandRecord", back_populates="documents")


# ==========================================
# 💬 BhoomiAI Intelligent Assistant Chat Models
# ==========================================

class ChatConversation(Base):
    """
    ChatGPT-style conversation session with conversational title, user isolation,
    and automatic timestamp tracking.
    """
    __tablename__ = "chat_conversations"

    id = Column(String(50), primary_key=True, index=True)  # UUID4
    user_id = Column(String(100), default="guest-user", index=True)
    title = Column(String(255), default="New Conversation")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    messages = relationship(
        "ChatMessage", 
        back_populates="conversation", 
        cascade="all, delete-orphan", 
        order_by="ChatMessage.id"
    )


class ChatMessage(Base):
    """
    Individual chat turn (User or Assistant) with markdown text content,
    optional structured map action triggers, and token usage tracking.
    """
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(String(50), ForeignKey("chat_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # 'user', 'assistant', 'system'
    content = Column(Text, nullable=False)
    map_action = Column(Text, nullable=True)   # Serialized JSON map action payload
    tokens_used = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("ChatConversation", back_populates="messages")

