from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.historial_pedido_model import HistorialPedido
from app.schemas.historial_pedido_schema import HistorialCreate, HistorialResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/historial", tags=["historial"])

@router.post("/", response_model=HistorialResponse)
def create_historial(h: HistorialCreate, db: Session = Depends(get_db), current_user=Depends(require_role([1]))):
    db_h = HistorialPedido(
        id_pedido=h.id_pedido,
        estado_anterior=h.estado_anterior,
        estado_nuevo=h.estado_nuevo,
        observacion=h.observacion,
    )
    db.add(db_h)
    db.commit()
    db.refresh(db_h)
    return db_h

@router.get("/", response_model=list[HistorialResponse], dependencies=[Depends(require_role([1,2]))])
def list_historial(db: Session = Depends(get_db)):
    return db.query(HistorialPedido).all()
