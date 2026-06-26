from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.seguimiento_model import Seguimiento
from app.schemas.seguimiento_schema import SeguimientoCreate, SeguimientoResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/seguimiento", tags=["seguimiento"])

@router.post("/", response_model=SeguimientoResponse)
def create_seg(s: SeguimientoCreate, db: Session = Depends(get_db), current_user=Depends(require_role([1]))):
    db_s = Seguimiento(
        id_pedido=s.id_pedido,
        id_fase=s.id_fase,
        porcentaje_avance=s.porcentaje_avance,
        fecha_inicio=s.fecha_inicio,
        fecha_fin=s.fecha_fin,
        estado=s.estado,
        observacion=s.observacion,
    )
    db.add(db_s)
    db.commit()
    db.refresh(db_s)
    return db_s

@router.get("/", response_model=list[SeguimientoResponse], dependencies=[Depends(require_role([1,2]))])
def list_seguimiento(db: Session = Depends(get_db)):
    return db.query(Seguimiento).all()
