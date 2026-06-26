from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.control_calidad_model import ControlCalidad
from app.schemas.control_calidad_schema import ControlCalidadCreate, ControlCalidadResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/control_calidad", tags=["control_calidad"])

@router.post("/", response_model=ControlCalidadResponse)
def create_control(c: ControlCalidadCreate, db: Session = Depends(get_db), current_user=Depends(require_role([1]))):
    db_c = ControlCalidad(
        id_pedido=c.id_pedido,
        fecha_revision=c.fecha_revision,
        cantidad_buena=c.cantidad_buena,
        cantidad_defectuosa=c.cantidad_defectuosa,
        observaciones=c.observaciones,
    )
    db.add(db_c)
    db.commit()
    db.refresh(db_c)
    return db_c

@router.get("/", response_model=list[ControlCalidadResponse], dependencies=[Depends(require_role([1,2]))])
def list_control(db: Session = Depends(get_db)):
    return db.query(ControlCalidad).all()
