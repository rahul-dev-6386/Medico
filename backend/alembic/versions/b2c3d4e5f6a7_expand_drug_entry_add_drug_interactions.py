"""expand DrugEntry with comprehensive columns, add DrugInteraction table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-30 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── DrugInteraction table ──
    op.create_table(
        "drug_interactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("drug_a_generic", sa.String(500), nullable=False),
        sa.Column("drug_b_generic", sa.String(500), nullable=False),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("mechanism", sa.Text(), nullable=True),
        sa.Column("clinical_effect", sa.Text(), nullable=True),
        sa.Column("management", sa.Text(), nullable=True),
        sa.Column("references", sa.Text(), nullable=True),
        sa.Column("evidence_level", sa.String(50), nullable=True),
        sa.Column("source", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_drug_interactions_drug_a_generic"), "drug_interactions", ["drug_a_generic"])
    op.create_index(op.f("ix_drug_interactions_drug_b_generic"), "drug_interactions", ["drug_b_generic"])
    op.create_index(op.f("ix_drug_interactions_id"), "drug_interactions", ["id"])

    # ── New columns for drug_database ──
    # Identity
    op.add_column("drug_database", sa.Column("brand_names", postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column("drug_database", sa.Column("pharmacologic_class", sa.String(255), nullable=True))
    op.add_column("drug_database", sa.Column("therapeutic_class", sa.String(255), nullable=True))
    op.add_column("drug_database", sa.Column("rxnorm_id", sa.String(50), nullable=True))
    op.add_column("drug_database", sa.Column("atc_code", sa.String(50), nullable=True))
    op.add_column("drug_database", sa.Column("unii", sa.String(50), nullable=True))
    op.add_column("drug_database", sa.Column("cas_number", sa.String(50), nullable=True))
    op.create_index(op.f("ix_drug_database_rxnorm_id"), "drug_database", ["rxnorm_id"])

    # Clinical
    op.add_column("drug_database", sa.Column("off_label_uses", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("mechanism_of_action", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("pharmacodynamics", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("pharmacokinetics", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("onset_of_action", sa.String(200), nullable=True))
    op.add_column("drug_database", sa.Column("duration_of_action", sa.String(200), nullable=True))
    op.add_column("drug_database", sa.Column("half_life", sa.String(200), nullable=True))

    # Dosage
    op.add_column("drug_database", sa.Column("adult_dose", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("pediatric_dose", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("geriatric_dose", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("renal_dose_adjustment", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("hepatic_dose_adjustment", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("maximum_dose", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("dose_forms", postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column("drug_database", sa.Column("available_strengths", postgresql.JSON(astext_type=sa.Text()), nullable=True))

    # Administration
    op.add_column("drug_database", sa.Column("administration", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("storage_instructions", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("preparation", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("reconstitution", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("compatibility", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("administration_food_interactions", sa.Text(), nullable=True))

    # Safety
    op.add_column("drug_database", sa.Column("boxed_warning", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("warnings", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("precautions", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("pregnancy", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("breastfeeding", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("fertility", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("driving_warning", sa.Text(), nullable=True))

    # Adverse Effects
    op.add_column("drug_database", sa.Column("common_side_effects", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("serious_side_effects", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("side_effect_frequency", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("monitoring", sa.Text(), nullable=True))

    # Interactions
    op.add_column("drug_database", sa.Column("drug_interactions", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("food_interactions", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("alcohol_interactions", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("herbal_interactions", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("disease_interactions", sa.Text(), nullable=True))

    # Monitoring
    op.add_column("drug_database", sa.Column("required_monitoring", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("laboratory_tests", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("vital_signs", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("follow_up", sa.Text(), nullable=True))

    # Patient Counseling
    op.add_column("drug_database", sa.Column("patient_instructions", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("missed_dose_instructions", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("overdose_instructions", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("disposal_instructions", sa.Text(), nullable=True))

    # Emergency
    op.add_column("drug_database", sa.Column("toxicity", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("antidote", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("poisoning_management", sa.Text(), nullable=True))

    # Evidence
    op.add_column("drug_database", sa.Column("guidelines", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("clinical_trials", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("references", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("last_updated", sa.DateTime(timezone=True), nullable=True))
    op.add_column("drug_database", sa.Column("evidence_level", sa.String(50), nullable=True))

    # Images
    op.add_column("drug_database", sa.Column("tablet_image_url", sa.String(500), nullable=True))
    op.add_column("drug_database", sa.Column("capsule_image_url", sa.String(500), nullable=True))
    op.add_column("drug_database", sa.Column("package_image_url", sa.String(500), nullable=True))
    op.add_column("drug_database", sa.Column("chemical_structure_url", sa.String(500), nullable=True))

    # Similar Drugs
    op.add_column("drug_database", sa.Column("same_class", postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column("drug_database", sa.Column("same_mechanism", postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column("drug_database", sa.Column("alternatives", postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column("drug_database", sa.Column("biosimilars", postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column("drug_database", sa.Column("combination_products", postgresql.JSON(astext_type=sa.Text()), nullable=True))

    # Clinical Pearls
    op.add_column("drug_database", sa.Column("clinical_pearls", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("common_mistakes", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("faq", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("monitoring_tips", sa.Text(), nullable=True))
    op.add_column("drug_database", sa.Column("high_yield_points", sa.Text(), nullable=True))

    # Metadata
    op.add_column("drug_database", sa.Column("data_sources", postgresql.JSON(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    # Drop DrugInteraction table
    op.drop_index(op.f("ix_drug_interactions_id"), table_name="drug_interactions")
    op.drop_index(op.f("ix_drug_interactions_drug_b_generic"), table_name="drug_interactions")
    op.drop_index(op.f("ix_drug_interactions_drug_a_generic"), table_name="drug_interactions")
    op.drop_table("drug_interactions")

    # Drop new columns from drug_database
    columns_to_drop = [
        "brand_names", "pharmacologic_class", "therapeutic_class", "rxnorm_id",
        "atc_code", "unii", "cas_number",
        "off_label_uses", "mechanism_of_action", "pharmacodynamics", "pharmacokinetics",
        "onset_of_action", "duration_of_action", "half_life",
        "adult_dose", "pediatric_dose", "geriatric_dose", "renal_dose_adjustment",
        "hepatic_dose_adjustment", "maximum_dose", "dose_forms", "available_strengths",
        "administration", "storage_instructions", "preparation", "reconstitution",
        "compatibility", "administration_food_interactions",
        "boxed_warning", "warnings", "precautions", "pregnancy", "breastfeeding",
        "fertility", "driving_warning",
        "common_side_effects", "serious_side_effects", "side_effect_frequency", "monitoring",
        "drug_interactions", "food_interactions", "alcohol_interactions", "herbal_interactions",
        "disease_interactions",
        "required_monitoring", "laboratory_tests", "vital_signs", "follow_up",
        "patient_instructions", "missed_dose_instructions", "overdose_instructions",
        "disposal_instructions",
        "toxicity", "antidote", "poisoning_management",
        "guidelines", "clinical_trials", "references", "last_updated", "evidence_level",
        "tablet_image_url", "capsule_image_url", "package_image_url", "chemical_structure_url",
        "same_class", "same_mechanism", "alternatives", "biosimilars", "combination_products",
        "clinical_pearls", "common_mistakes", "faq", "monitoring_tips", "high_yield_points",
        "data_sources",
    ]
    for col in columns_to_drop:
        try:
            op.drop_column("drug_database", col)
        except Exception:
            pass
    try:
        op.drop_index(op.f("ix_drug_database_rxnorm_id"), table_name="drug_database")
    except Exception:
        pass
