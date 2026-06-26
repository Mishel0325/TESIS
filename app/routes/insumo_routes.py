from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.insumo_model import Insumo
from app.schemas.insumo_schema import InsumoCreate, InsumoResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/insumos", tags=["insumos"])

@router.post("/", response_model=InsumoResponse)
def create_insumo(i: InsumoCreate, db: Session = Depends(get_db), current_user=Depends(require_role([1]))):
    db_i = Insumo(
        nombre_insumo=i.nombre_insumo,
        unidad_medida=i.unidad_medida,
        stock_actual=i.stock_actual,
        stock_minimo=i.stock_minimo,
    )
    db.add(db_i)
    db.commit()
    db.refresh(db_i)
    return db_i

@router.get("/", response_model=list[InsumoResponse], dependencies=[Depends(require_role([1,2]))])
def list_insumos(db: Session = Depends(get_db)):
    return db.query(Insumo).all()
