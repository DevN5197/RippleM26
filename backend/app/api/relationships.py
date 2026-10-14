from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_business
from app.models.business import Business
from app.services.relationships import get_relationships_graph

router = APIRouter(tags=["relationships"])

@router.get("/api/v1/relationships")
@router.get("/api/relationships")
def relationships_graph(
    search: str | None = None,
    riskOnly: bool = False,
    partnerId: str | None = None,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    return get_relationships_graph(
        business_id=business.id,
        db=db,
        search=search,
        risk_only=riskOnly,
        partner_id=partnerId,
    )
