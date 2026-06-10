from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.maquila_model import Maquila
from app.models.user_model import User
from app.schemas.maquila_schema import MaquilaCreate, MaquilaResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/maquilas", tags=["maquilas"])

@router.post("/", response_model=MaquilaResponse)
def create_maquila(
    maquila: MaquilaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([1]))
):
    db_maquila = Maquila(
        nombre=maquila.nombre,
        direccion=maquila.direccion,
        estado=maquila.estado
    )
    db.add(db_maquila)
    db.commit()
    db.refresh(db_maquila)
    return db_maquila

@router.get("/")
def list_maquilas(db: Session = Depends(get_db), current_user: User = Depends(require_role([1, 2]))):
    return db.query(Maquila).all()