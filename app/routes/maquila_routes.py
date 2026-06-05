from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.maquila_model import Maquila
from app.schemas.maquila_schema import MaquilaCreate, MaquilaResponse

router = APIRouter(prefix="/maquilas", tags=["maquilas"])

@router.post("/", response_model=MaquilaResponse)
def create_maquila(
    maquila: MaquilaCreate,
    user_id: int = Query(..., description="ID del usuario que crea la maquila"),
    db: Session = Depends(get_db)
):
    if user_id != 1:
        raise HTTPException(status_code=403, detail="Solo el usuario 1 puede crear maquilas")

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
def list_maquilas(db: Session = Depends(get_db)):
    return db.query(Maquila).all()