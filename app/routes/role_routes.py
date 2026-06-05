from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.role_model import Role
from app.schemas.role_schema import RoleResponse
from app.core.security import require_role

router = APIRouter(prefix="/roles", tags=["roles"])

@router.get("/", response_model=list[RoleResponse], dependencies=[Depends(require_role([1,2]))])
def list_roles(db: Session = Depends(get_db)):
    return db.query(Role).all()
