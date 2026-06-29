from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.services.drug_service import DrugService

router = APIRouter(prefix="/api/drugs", tags=["Drug Information"])


@router.get("/search")
def search_drug(
    q: str = Query(..., description="Drug name to search for"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = DrugService(db)
    results = service.search_drug(q)
    if results:
        return {"drugs": results, "source": "local"}

    fda_data = service.search_openfda(q)
    if fda_data.get("generic_name") or fda_data.get("brand_name"):
        stored = service.store_drug(fda_data)
        return {
            "drugs": [{
                "generic_name": fda_data.get("generic_name"),
                "brand_name": fda_data.get("brand_name"),
                "drug_class": fda_data.get("drug_class"),
                "indications": fda_data.get("indications"),
                "contraindications": fda_data.get("contraindications"),
                "side_effects": fda_data.get("side_effects"),
                "dosage_info": fda_data.get("dosage_info"),
                "interactions": fda_data.get("interactions"),
                "pregnancy_category": fda_data.get("pregnancy_category"),
            }],
            "source": "openfda",
        }

    return {"drugs": [], "source": "none"}


@router.get("/count")
def drug_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = DrugService(db)
    return {"count": service.count()}
