from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.database import get_db
from app.models.archivo_pedido_model import ArchivoPedido
from app.models.pedido_model import Pedido
from app.schemas.archivo_pedido_schema import (
    ArchivoPedidoCreate,
    ArchivoPedidoResponse,
    ArchivoPedidoUpdate,
)

router = APIRouter(prefix="/archivos", tags=["archivos"])


def _archivo_or_404(id_archivo: int, db: Session) -> ArchivoPedido:
    archivo = (
        db.query(ArchivoPedido)
        .filter(ArchivoPedido.id_archivo == id_archivo)
        .first()
    )
    if not archivo:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    return archivo


def _validar_pedido(id_pedido: int | None, db: Session) -> None:
    if id_pedido is None:
        return
    pedido = db.query(Pedido).filter(Pedido.id_pedido == id_pedido).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")


@router.post(
    "/",
    response_model=ArchivoPedidoResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_archivo(
    a: ArchivoPedidoCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role([1])),
):
    _validar_pedido(a.id_pedido, db)

    nombre = a.nombre_archivo.strip() if a.nombre_archivo else None
    ruta = a.ruta_archivo.strip() if a.ruta_archivo else None

    if not nombre:
        raise HTTPException(status_code=400, detail="El nombre del archivo es obligatorio")
    if not ruta:
        raise HTTPException(status_code=400, detail="La ruta o URL del archivo es obligatoria")

    db_a = ArchivoPedido(
        id_pedido=a.id_pedido,
        nombre_archivo=nombre,
        ruta_archivo=ruta,
    )

    try:
        db.add(db_a)
        db.commit()
        db.refresh(db_a)
        return db_a
    except Exception:
        db.rollback()
        raise


@router.get(
    "/",
    response_model=list[ArchivoPedidoResponse],
    dependencies=[Depends(require_role([1, 2]))],
)
def list_archivos(db: Session = Depends(get_db)):
    return db.query(ArchivoPedido).order_by(ArchivoPedido.id_archivo.desc()).all()


@router.get(
    "/pedido/{id_pedido}",
    response_model=list[ArchivoPedidoResponse],
    dependencies=[Depends(require_role([1, 2]))],
)
def list_archivos_pedido(id_pedido: int, db: Session = Depends(get_db)):
    _validar_pedido(id_pedido, db)
    return (
        db.query(ArchivoPedido)
        .filter(ArchivoPedido.id_pedido == id_pedido)
        .order_by(ArchivoPedido.id_archivo.desc())
        .all()
    )


@router.get(
    "/{id_archivo}",
    response_model=ArchivoPedidoResponse,
    dependencies=[Depends(require_role([1, 2]))],
)
def get_archivo(id_archivo: int, db: Session = Depends(get_db)):
    return _archivo_or_404(id_archivo, db)


@router.patch("/{id_archivo}", response_model=ArchivoPedidoResponse)
@router.put("/{id_archivo}", response_model=ArchivoPedidoResponse)
def update_archivo(
    id_archivo: int,
    a: ArchivoPedidoUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role([1])),
):
    archivo = _archivo_or_404(id_archivo, db)
    cambios = a.model_dump(exclude_unset=True)

    if "id_pedido" in cambios:
        _validar_pedido(cambios["id_pedido"], db)

    if "nombre_archivo" in cambios:
        nombre = cambios["nombre_archivo"]
        if nombre is not None:
            nombre = nombre.strip()
            if not nombre:
                raise HTTPException(status_code=400, detail="El nombre del archivo no puede quedar vacío")
        cambios["nombre_archivo"] = nombre

    if "ruta_archivo" in cambios:
        ruta = cambios["ruta_archivo"]
        if ruta is not None:
            ruta = ruta.strip()
            if not ruta:
                raise HTTPException(status_code=400, detail="La ruta del archivo no puede quedar vacía")
        cambios["ruta_archivo"] = ruta

    for campo, valor in cambios.items():
        setattr(archivo, campo, valor)

    try:
        db.commit()
        db.refresh(archivo)
        return archivo
    except Exception:
        db.rollback()
        raise


@router.delete("/{id_archivo}")
def delete_archivo(
    id_archivo: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role([1])),
):
    archivo = _archivo_or_404(id_archivo, db)
    try:
        db.delete(archivo)
        db.commit()
        return {"message": "Archivo eliminado correctamente", "id_archivo": id_archivo}
    except Exception:
        db.rollback()
        raise
