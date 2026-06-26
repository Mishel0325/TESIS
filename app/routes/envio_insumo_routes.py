from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.envio_insumo_model import EnvioInsumo
from app.schemas.envio_insumo_schema import EnvioInsumoCreate, EnvioInsumoResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/envios_insumos", tags=["envios_insumos"])

@router.post("/", response_model=EnvioInsumoResponse)
def create_envio(e: EnvioInsumoCreate, db: Session = Depends(get_db), current_user=Depends(require_role([1]))):
    db_e = EnvioInsumo(
        id_pedido=e.id_pedido,
        id_insumo=e.id_insumo,
        cantidad=e.cantidad,
        fecha_envio=e.fecha_envio,
    )
    db.add(db_e)
    db.commit()
    db.refresh(db_e)
    return db_e

@router.get("/", response_model=list[EnvioInsumoResponse], dependencies=[Depends(require_role([1,2]))])
def list_envios(db: Session = Depends(get_db)):
    return db.query(EnvioInsumo).all()
