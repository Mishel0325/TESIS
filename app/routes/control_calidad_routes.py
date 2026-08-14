from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.database import get_db
from app.models.control_calidad_model import ControlCalidad
from app.models.pedido_model import Pedido
from app.schemas.control_calidad_schema import (
    ControlCalidadCreate,
    ControlCalidadResponse,
    ControlCalidadUpdate,
)

router = APIRouter(prefix="/control_calidad", tags=["control_calidad"])


def _validar_pedido(id_pedido: int, db: Session) -> Pedido:
    pedido = (
        db.query(Pedido)
        .filter(Pedido.id_pedido == id_pedido)
        .first()
    )
    if not pedido:
        raise HTTPException(
            status_code=404,
            detail="El pedido seleccionado no existe o no pertenece a esta cuenta.",
        )
    return pedido


def _get_control_or_404(id_control: int, db: Session) -> ControlCalidad:
    control = (
        db.query(ControlCalidad)
        .filter(ControlCalidad.id_control == id_control)
        .first()
    )
    if not control:
        raise HTTPException(
            status_code=404,
            detail="Control de calidad no encontrado.",
        )

    # Registros históricos incompletos no deben romper la API.
    if control.id_pedido is None or control.fecha_revision is None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Este control de calidad es un registro histórico incompleto "
                "y no está vinculado correctamente a un pedido."
            ),
        )

    return control


def _validar_cantidades(
    cantidad_buena: int | None,
    cantidad_defectuosa: int | None,
) -> None:
    buenas = int(cantidad_buena or 0)
    defectuosas = int(cantidad_defectuosa or 0)

    if buenas < 0 or defectuosas < 0:
        raise HTTPException(
            status_code=400,
            detail="Las cantidades no pueden ser negativas.",
        )

    if buenas + defectuosas <= 0:
        raise HTTPException(
            status_code=400,
            detail="Debe registrar al menos una unidad revisada.",
        )


def _serializar(control: ControlCalidad) -> dict:
    """Convierte NULL históricos de cantidades a cero antes de Pydantic."""
    return {
        "id_control": int(control.id_control),
        "id_pedido": int(control.id_pedido),
        "fecha_revision": control.fecha_revision,
        "cantidad_buena": int(control.cantidad_buena or 0),
        "cantidad_defectuosa": int(control.cantidad_defectuosa or 0),
        "observaciones": control.observaciones,
    }


@router.post(
    "/",
    response_model=ControlCalidadResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_control(
    c: ControlCalidadCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role([1])),
):
    _validar_pedido(c.id_pedido, db)
    _validar_cantidades(c.cantidad_buena, c.cantidad_defectuosa)

    db_c = ControlCalidad(
        id_pedido=c.id_pedido,
        fecha_revision=c.fecha_revision,
        cantidad_buena=c.cantidad_buena,
        cantidad_defectuosa=c.cantidad_defectuosa,
        observaciones=c.observaciones.strip(),
    )

    try:
        db.add(db_c)
        db.commit()
        db.refresh(db_c)
        return _serializar(db_c)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="No se pudo registrar la revisión. Verifique el pedido seleccionado.",
        )
    except Exception:
        db.rollback()
        raise


@router.get(
    "/",
    response_model=list[ControlCalidadResponse],
    dependencies=[Depends(require_role([1, 2]))],
)
def list_control(db: Session = Depends(get_db)):
    """
    Solo devuelve revisiones válidas.

    La base histórica permitía id_pedido/fecha_revision NULL. Un solo registro
    incompleto provocaba ResponseValidationError y hacía fallar TODO el GET.
    """
    controles = (
        db.query(ControlCalidad)
        .filter(
            ControlCalidad.id_pedido.isnot(None),
            ControlCalidad.fecha_revision.isnot(None),
        )
        .order_by(
            ControlCalidad.fecha_revision.desc(),
            ControlCalidad.id_control.desc(),
        )
        .all()
    )

    return [_serializar(control) for control in controles]


@router.get(
    "/pedido/{id_pedido}",
    response_model=list[ControlCalidadResponse],
    dependencies=[Depends(require_role([1, 2]))],
)
def list_control_por_pedido(
    id_pedido: int,
    db: Session = Depends(get_db),
):
    _validar_pedido(id_pedido, db)

    controles = (
        db.query(ControlCalidad)
        .filter(
            ControlCalidad.id_pedido == id_pedido,
            ControlCalidad.fecha_revision.isnot(None),
        )
        .order_by(
            ControlCalidad.fecha_revision.desc(),
            ControlCalidad.id_control.desc(),
        )
        .all()
    )

    return [_serializar(control) for control in controles]


@router.get(
    "/{id_control}",
    response_model=ControlCalidadResponse,
    dependencies=[Depends(require_role([1, 2]))],
)
def get_control(
    id_control: int,
    db: Session = Depends(get_db),
):
    return _serializar(_get_control_or_404(id_control, db))


@router.patch(
    "/{id_control}",
    response_model=ControlCalidadResponse,
)
@router.put(
    "/{id_control}",
    response_model=ControlCalidadResponse,
)
def update_control(
    id_control: int,
    c: ControlCalidadUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role([1])),
):
    control = _get_control_or_404(id_control, db)
    cambios = c.model_dump(exclude_unset=True)

    id_pedido = cambios.get("id_pedido", control.id_pedido)
    _validar_pedido(id_pedido, db)

    cantidad_buena = cambios.get(
        "cantidad_buena",
        int(control.cantidad_buena or 0),
    )
    cantidad_defectuosa = cambios.get(
        "cantidad_defectuosa",
        int(control.cantidad_defectuosa or 0),
    )
    _validar_cantidades(cantidad_buena, cantidad_defectuosa)

    if "observaciones" in cambios and cambios["observaciones"] is not None:
        cambios["observaciones"] = cambios["observaciones"].strip()

    for campo, valor in cambios.items():
        setattr(control, campo, valor)

    try:
        db.commit()
        db.refresh(control)
        return _serializar(control)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="No se pudo actualizar la revisión. Verifique el pedido seleccionado.",
        )
    except Exception:
        db.rollback()
        raise


@router.delete(
    "/{id_control}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_control(
    id_control: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role([1])),
):
    control = (
        db.query(ControlCalidad)
        .filter(ControlCalidad.id_control == id_control)
        .first()
    )
    if not control:
        raise HTTPException(
            status_code=404,
            detail="Control de calidad no encontrado.",
        )

    try:
        db.delete(control)
        db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception:
        db.rollback()
        raise
