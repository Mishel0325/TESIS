from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.database import get_db
from app.models.maquila_model import Maquila
from app.models.user_model import User
from app.schemas.maquila_schema import MaquilaCreate, MaquilaResponse, MaquilaUpdate


router = APIRouter(prefix="/maquilas", tags=["maquilas"])


def _obtener_nombre(datos) -> str:
    nombre = (
        getattr(datos, "nombre", None)
        or getattr(datos, "nombre_maquila", None)
        or ""
    ).strip()

    if not nombre:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El nombre del taller / maquila es obligatorio.",
        )

    if len(nombre) > 100:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El nombre del taller / maquila no puede superar 100 caracteres.",
        )

    return nombre


def _validar_cuenta(current_user: User) -> int:
    id_cuenta = getattr(current_user, "id_cuenta", None)
    if not id_cuenta:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El usuario no tiene una cuenta de trabajo asignada.",
        )
    return int(id_cuenta)


@router.post(
    "/",
    response_model=MaquilaResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_maquila(
    maquila: MaquilaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([1])),
):
    id_cuenta = _validar_cuenta(current_user)
    nombre = _obtener_nombre(maquila)

    existente = (
        db.query(Maquila)
        .filter(
            Maquila.id_cuenta == id_cuenta,
            func.lower(Maquila.nombre) == nombre.lower(),
        )
        .first()
    )

    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una maquila / taller con ese nombre en esta cuenta.",
        )

    db_maquila = Maquila(
        nombre=nombre,
        responsable=maquila.responsable.strip(),
        telefono=maquila.telefono,
        direccion=maquila.direccion.strip(),
        estado=maquila.estado,
        id_cuenta=id_cuenta,
    )

    try:
        db.add(db_maquila)
        db.commit()
        db.refresh(db_maquila)
        return db_maquila

    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se pudo crear la maquila por un conflicto de datos.",
        ) from exc

    except Exception:
        db.rollback()
        raise


@router.get("/", response_model=list[MaquilaResponse])
def list_maquilas(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([1, 2])),
):
    id_cuenta = _validar_cuenta(current_user)

    return (
        db.query(Maquila)
        .filter(Maquila.id_cuenta == id_cuenta)
        .order_by(Maquila.id_maquila.asc())
        .all()
    )


@router.get("/{id_maquila}", response_model=MaquilaResponse)
def get_maquila(
    id_maquila: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([1, 2])),
):
    id_cuenta = _validar_cuenta(current_user)

    maquila = (
        db.query(Maquila)
        .filter(
            Maquila.id_maquila == id_maquila,
            Maquila.id_cuenta == id_cuenta,
        )
        .first()
    )

    if not maquila:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maquila no encontrada.",
        )

    return maquila


@router.put("/{id_maquila}", response_model=MaquilaResponse)
def update_maquila(
    id_maquila: int,
    datos: MaquilaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([1])),
):
    id_cuenta = _validar_cuenta(current_user)

    maquila = (
        db.query(Maquila)
        .filter(
            Maquila.id_maquila == id_maquila,
            Maquila.id_cuenta == id_cuenta,
        )
        .first()
    )

    if not maquila:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maquila no encontrada.",
        )

    nombre_recibido = (
        getattr(datos, "nombre", None)
        or getattr(datos, "nombre_maquila", None)
    )

    if nombre_recibido is not None:
        nuevo_nombre = _obtener_nombre(datos)

        duplicada = (
            db.query(Maquila)
            .filter(
                Maquila.id_cuenta == id_cuenta,
                Maquila.id_maquila != id_maquila,
                func.lower(Maquila.nombre) == nuevo_nombre.lower(),
            )
            .first()
        )

        if duplicada:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe otra maquila / taller con ese nombre.",
            )

        maquila.nombre = nuevo_nombre

    if datos.responsable is not None:
        maquila.responsable = datos.responsable.strip()

    if datos.telefono is not None:
        maquila.telefono = datos.telefono

    if datos.direccion is not None:
        maquila.direccion = datos.direccion.strip()

    if datos.estado is not None:
        maquila.estado = datos.estado

    try:
        db.commit()
        db.refresh(maquila)
        return maquila

    except Exception:
        db.rollback()
        raise


@router.delete("/{id_maquila}")
def delete_maquila(
    id_maquila: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([1])),
):
    """
    Elimina una maquila únicamente dentro de la cuenta activa.

    Si la maquila todavía está vinculada a pedidos u otros registros,
    MySQL impide la eliminación mediante las claves foráneas y se devuelve
    un 409 para proteger el historial de producción.
    """
    id_cuenta = _validar_cuenta(current_user)

    maquila = (
        db.query(Maquila)
        .filter(
            Maquila.id_maquila == id_maquila,
            Maquila.id_cuenta == id_cuenta,
        )
        .first()
    )

    if not maquila:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maquila no encontrada o no pertenece a esta cuenta.",
        )

    nombre = maquila.nombre

    try:
        db.delete(maquila)
        db.commit()

        return {
            "detail": "Maquila eliminada correctamente.",
            "id_maquila": id_maquila,
            "nombre": nombre,
        }

    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "No se puede eliminar esta maquila porque tiene pedidos "
                "u otros registros relacionados. Para conservar el historial "
                "de producción, cambie su estado a Inactivo en lugar de eliminarla."
            ),
        ) from exc

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No se pudo eliminar la maquila: {str(exc)}",
        ) from exc
