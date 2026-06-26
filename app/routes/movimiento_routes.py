from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from decimal import Decimal
from app.database import get_db
from app.models.movimiento_model import MovimientoInventario
from app.models.insumo_model import Insumo
from app.schemas.movimiento_schema import MovimientoCreate, MovimientoResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/movimientos", tags=["movimientos"])


@router.post("/", response_model=MovimientoResponse)
def create_mov(m: MovimientoCreate, db: Session = Depends(get_db), current_user=Depends(require_role([1]))):
    db_m = MovimientoInventario(
        id_insumo=m.id_insumo,
        tipo=(m.tipo or '').upper() if m.tipo else None,
        cantidad=m.cantidad,
        observacion=m.observacion,
    )

    db.add(db_m)

    # Si el movimiento está asociado a un insumo, actualizar su stock
    if m.id_insumo is not None:
        insumo = db.query(Insumo).filter(Insumo.id_insumo == m.id_insumo).first()
        if not insumo:
            raise HTTPException(status_code=404, detail="Insumo no encontrado")

        current_stock = Decimal(str(insumo.stock_actual)) if insumo.stock_actual is not None else Decimal('0')
        qty = Decimal(str(m.cantidad or 0))
        tipo = (m.tipo or '').upper()

        if tipo == 'ENTRADA':
            insumo.stock_actual = current_stock + qty
        elif tipo == 'SALIDA':
            insumo.stock_actual = current_stock - qty

        db.add(insumo)

    db.commit()
    db.refresh(db_m)
    return db_m


@router.get("/", response_model=list[MovimientoResponse], dependencies=[Depends(require_role([1,2]))])
def list_mov(db: Session = Depends(get_db)):
    return db.query(MovimientoInventario).all()
