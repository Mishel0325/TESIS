from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.database import get_db
from app.models.envio_insumo_model import EnvioInsumo
from app.models.insumo_model import Insumo
from app.schemas.envio_insumo_schema import EnvioInsumoCreate, EnvioInsumoResponse

router = APIRouter(prefix="/envios_insumos", tags=["envios_insumos"])


@router.post(
    "/",
    response_model=EnvioInsumoResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_envio(
    e: EnvioInsumoCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role([1])),
):
    insumo = (
        db.query(Insumo)
        .filter(Insumo.id_insumo == e.id_insumo)
        .with_for_update()
        .first()
    )

    if not insumo:
        raise HTTPException(status_code=404, detail="Insumo no encontrado.")

    cantidad = Decimal(str(e.cantidad))
    stock_actual = Decimal(str(insumo.stock_actual or 0))

    if cantidad <= 0:
        raise HTTPException(status_code=400, detail="La cantidad debe ser mayor que cero.")

    if cantidad > stock_actual:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Stock insuficiente. Disponible: {stock_actual}. "
                f"Solicitado: {cantidad}."
            ),
        )

    db_e = EnvioInsumo(
        id_pedido=e.id_pedido,
        id_insumo=e.id_insumo,
        cantidad=cantidad,
        fecha_envio=e.fecha_envio,
    )

    # La salida de insumo descuenta automáticamente el inventario.
    insumo.stock_actual = stock_actual - cantidad

    try:
        db.add(db_e)
        db.commit()
        db.refresh(db_e)
        return db_e
    except Exception:
        db.rollback()
        raise


@router.get(
    "/",
    response_model=list[EnvioInsumoResponse],
    dependencies=[Depends(require_role([1, 2]))],
)
def list_envios(db: Session = Depends(get_db)):
    return db.query(EnvioInsumo).order_by(EnvioInsumo.id_envio.desc()).all()
