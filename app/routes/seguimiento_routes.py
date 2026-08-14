from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.database import get_db
from app.models.fase_model import Fase
from app.models.pedido_model import Pedido
from app.models.seguimiento_model import Seguimiento
from app.schemas.seguimiento_schema import (
    SeguimientoCreate,
    SeguimientoResponse,
    SeguimientoUpdate,
)

router = APIRouter(prefix="/seguimiento", tags=["seguimiento"])


def _seguimiento_or_404(id_seguimiento: int, db: Session) -> Seguimiento:
    seguimiento = (
        db.query(Seguimiento)
        .filter(Seguimiento.id_seguimiento == id_seguimiento)
        .first()
    )
    if not seguimiento:
        raise HTTPException(status_code=404, detail="Seguimiento no encontrado.")
    return seguimiento


def _validar_relaciones(id_pedido: int, id_fase: int, db: Session) -> None:
    pedido = db.query(Pedido).filter(Pedido.id_pedido == id_pedido).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado.")

    fase = db.query(Fase).filter(Fase.id_fase == id_fase).first()
    if not fase:
        raise HTTPException(status_code=404, detail="Fase no encontrada.")


def _validar_fechas(fecha_inicio, fecha_fin) -> None:
    if fecha_inicio and fecha_fin and fecha_fin < fecha_inicio:
        raise HTTPException(
            status_code=400,
            detail="La fecha de fin no puede ser anterior a la fecha de inicio.",
        )


@router.post(
    "/",
    response_model=SeguimientoResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_seguimiento(
    datos: SeguimientoCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role([1])),
):
    _validar_relaciones(datos.id_pedido, datos.id_fase, db)
    _validar_fechas(datos.fecha_inicio, datos.fecha_fin)

    seguimiento = Seguimiento(
        id_pedido=datos.id_pedido,
        id_fase=datos.id_fase,
        porcentaje_avance=datos.porcentaje_avance,
        fecha_inicio=datos.fecha_inicio,
        fecha_fin=datos.fecha_fin,
        estado=datos.estado,
        observacion=datos.observacion,
    )

    try:
        db.add(seguimiento)
        db.commit()
        db.refresh(seguimiento)
        return seguimiento
    except Exception:
        db.rollback()
        raise


@router.get(
    "/",
    response_model=list[SeguimientoResponse],
    dependencies=[Depends(require_role([1, 2]))],
)
def list_seguimientos(db: Session = Depends(get_db)):
    return (
        db.query(Seguimiento)
        .order_by(Seguimiento.id_seguimiento.desc())
        .all()
    )


@router.get(
    "/pedido/{id_pedido}",
    response_model=list[SeguimientoResponse],
    dependencies=[Depends(require_role([1, 2]))],
)
def list_seguimientos_pedido(id_pedido: int, db: Session = Depends(get_db)):
    return (
        db.query(Seguimiento)
        .filter(Seguimiento.id_pedido == id_pedido)
        .order_by(Seguimiento.id_seguimiento.asc())
        .all()
    )


@router.get(
    "/{id_seguimiento}",
    response_model=SeguimientoResponse,
    dependencies=[Depends(require_role([1, 2]))],
)
def get_seguimiento(id_seguimiento: int, db: Session = Depends(get_db)):
    return _seguimiento_or_404(id_seguimiento, db)


@router.patch("/{id_seguimiento}", response_model=SeguimientoResponse)
@router.put("/{id_seguimiento}", response_model=SeguimientoResponse)
def update_seguimiento(
    id_seguimiento: int,
    datos: SeguimientoUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role([1])),
):
    seguimiento = _seguimiento_or_404(id_seguimiento, db)
    cambios = datos.model_dump(exclude_unset=True)

    id_pedido = cambios.get("id_pedido", seguimiento.id_pedido)
    id_fase = cambios.get("id_fase", seguimiento.id_fase)
    _validar_relaciones(id_pedido, id_fase, db)

    fecha_inicio = cambios.get("fecha_inicio", seguimiento.fecha_inicio)
    fecha_fin = cambios.get("fecha_fin", seguimiento.fecha_fin)
    _validar_fechas(fecha_inicio, fecha_fin)

    for campo, valor in cambios.items():
        setattr(seguimiento, campo, valor)

    try:
        db.commit()
        db.refresh(seguimiento)
        return seguimiento
    except Exception:
        db.rollback()
        raise


@router.delete("/{id_seguimiento}")
def delete_seguimiento(
    id_seguimiento: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role([1])),
):
    seguimiento = _seguimiento_or_404(id_seguimiento, db)
    try:
        db.delete(seguimiento)
        db.commit()
        return {
            "mensaje": "Seguimiento eliminado correctamente.",
            "id_seguimiento": id_seguimiento,
        }
    except Exception:
        db.rollback()
        raise
