from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.sql import func

from app.core.database import Base


class DrugEntry(Base):
    __tablename__ = "drug_database"

    id = Column(Integer, primary_key=True, index=True)

    # ── Legacy columns (keep for backward compat) ──
    brand_name = Column(String(500), nullable=True)
    generic_name = Column(String(500), nullable=False, index=True)
    drug_class = Column(String(255), nullable=True)
    indications = Column(Text, nullable=True)
    contraindications = Column(Text, nullable=True)
    side_effects = Column(Text, nullable=True)
    dosage_info = Column(Text, nullable=True)
    interactions = Column(Text, nullable=True)
    pregnancy_category = Column(String(10), nullable=True)
    rxcui = Column(String(50), nullable=True)
    embedding_id = Column(String(255), nullable=True)
    ingested_at = Column(DateTime(timezone=True), server_default=func.now())

    # ── NEW: Identity ──
    brand_names = Column(JSON, nullable=True)
    pharmacologic_class = Column(String(255), nullable=True)
    therapeutic_class = Column(String(255), nullable=True)
    rxnorm_id = Column(String(50), nullable=True, index=True)
    atc_code = Column(String(50), nullable=True)
    unii = Column(String(50), nullable=True)
    cas_number = Column(String(50), nullable=True)

    # ── NEW: Clinical ──
    off_label_uses = Column(Text, nullable=True)
    mechanism_of_action = Column(Text, nullable=True)
    pharmacodynamics = Column(Text, nullable=True)
    pharmacokinetics = Column(Text, nullable=True)
    onset_of_action = Column(String(200), nullable=True)
    duration_of_action = Column(String(200), nullable=True)
    half_life = Column(String(200), nullable=True)

    # ── NEW: Dosage ──
    adult_dose = Column(Text, nullable=True)
    pediatric_dose = Column(Text, nullable=True)
    geriatric_dose = Column(Text, nullable=True)
    renal_dose_adjustment = Column(Text, nullable=True)
    hepatic_dose_adjustment = Column(Text, nullable=True)
    maximum_dose = Column(Text, nullable=True)
    dose_forms = Column(JSON, nullable=True)
    available_strengths = Column(JSON, nullable=True)

    # ── NEW: Administration ──
    administration = Column(Text, nullable=True)
    storage_instructions = Column(Text, nullable=True)
    preparation = Column(Text, nullable=True)
    reconstitution = Column(Text, nullable=True)
    compatibility = Column(Text, nullable=True)
    administration_food_interactions = Column(Text, nullable=True)

    # ── NEW: Safety ──
    boxed_warning = Column(Text, nullable=True)
    warnings = Column(Text, nullable=True)
    precautions = Column(Text, nullable=True)
    pregnancy = Column(Text, nullable=True)
    breastfeeding = Column(Text, nullable=True)
    fertility = Column(Text, nullable=True)
    driving_warning = Column(Text, nullable=True)

    # ── NEW: Adverse Effects ──
    common_side_effects = Column(Text, nullable=True)
    serious_side_effects = Column(Text, nullable=True)
    side_effect_frequency = Column(Text, nullable=True)
    monitoring = Column(Text, nullable=True)

    # ── NEW: Interactions ──
    drug_interactions = Column(Text, nullable=True)
    food_interactions = Column(Text, nullable=True)
    alcohol_interactions = Column(Text, nullable=True)
    herbal_interactions = Column(Text, nullable=True)
    disease_interactions = Column(Text, nullable=True)

    # ── NEW: Monitoring ──
    required_monitoring = Column(Text, nullable=True)
    laboratory_tests = Column(Text, nullable=True)
    vital_signs = Column(Text, nullable=True)
    follow_up = Column(Text, nullable=True)

    # ── NEW: Patient Counseling ──
    patient_instructions = Column(Text, nullable=True)
    missed_dose_instructions = Column(Text, nullable=True)
    overdose_instructions = Column(Text, nullable=True)
    disposal_instructions = Column(Text, nullable=True)

    # ── NEW: Emergency ──
    toxicity = Column(Text, nullable=True)
    antidote = Column(Text, nullable=True)
    poisoning_management = Column(Text, nullable=True)

    # ── NEW: Evidence ──
    guidelines = Column(Text, nullable=True)
    clinical_trials = Column(Text, nullable=True)
    references = Column(Text, nullable=True)
    last_updated = Column(DateTime(timezone=True), nullable=True)
    evidence_level = Column(String(50), nullable=True)

    # ── NEW: Images ──
    tablet_image_url = Column(String(500), nullable=True)
    capsule_image_url = Column(String(500), nullable=True)
    package_image_url = Column(String(500), nullable=True)
    chemical_structure_url = Column(String(500), nullable=True)

    # ── NEW: Similar Drugs ──
    same_class = Column(JSON, nullable=True)
    same_mechanism = Column(JSON, nullable=True)
    alternatives = Column(JSON, nullable=True)
    biosimilars = Column(JSON, nullable=True)
    combination_products = Column(JSON, nullable=True)

    # ── NEW: Clinical Pearls ──
    clinical_pearls = Column(Text, nullable=True)
    common_mistakes = Column(Text, nullable=True)
    faq = Column(Text, nullable=True)
    monitoring_tips = Column(Text, nullable=True)
    high_yield_points = Column(Text, nullable=True)

    # ── NEW: Metadata ──
    data_sources = Column(JSON, nullable=True)


class DrugInteraction(Base):
    __tablename__ = "drug_interactions"

    id = Column(Integer, primary_key=True, index=True)
    drug_a_generic = Column(String(500), nullable=False, index=True)
    drug_b_generic = Column(String(500), nullable=False, index=True)
    severity = Column(String(20), nullable=False)
    mechanism = Column(Text, nullable=True)
    clinical_effect = Column(Text, nullable=True)
    management = Column(Text, nullable=True)
    references = Column(Text, nullable=True)
    evidence_level = Column(String(50), nullable=True)
    source = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
