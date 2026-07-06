from app.services.drug_sources.base import AbstractDrugSource, DrugSourceResult
from app.services.drug_sources.dailymed import DailyMedSource
from app.services.drug_sources.openfda import OpenFDASource
from app.services.drug_sources.rxnorm import RxNormSource
from app.services.drug_sources.medlineplus import MedlinePlusSource

# Priority order for merging (highest first)
SOURCE_PRIORITY = [
    DailyMedSource,
    OpenFDASource,
    RxNormSource,
    MedlinePlusSource,
]

__all__ = [
    "AbstractDrugSource",
    "DrugSourceResult",
    "DailyMedSource",
    "OpenFDASource",
    "RxNormSource",
    "MedlinePlusSource",
    "SOURCE_PRIORITY",
]
