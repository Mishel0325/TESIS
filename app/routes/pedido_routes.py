from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.database import Base, get_db

from app.models.pedido_model import Pedido
from app.models.user_model import User

from app.schemas.pedido_schema import (
    PedidoCreate,
    PedidoUpdate,
    PedidoResponse
)


router = APIRouter(
    prefix="/pedidos",
    tags=["Pedidos"]
)


# =====================================================
# CREAR PEDIDO
# =====================================================

@router.post(
    "/",
    response_model=PedidoResponse,
    status_code=201
)
def create_pedido(
    pedido: PedidoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([1, 2]))
):

    pedido_existente = (
        db.query(Pedido)
        .filter(
            Pedido.codigo_pedido == pedido.codigo_pedido
        )
        .first()
    )

    if pedido_existente:
        raise HTTPException(
            status_code=409,
            detail="Ya existe un pedido con ese código"
        )

    nuevo_pedido = Pedido(
        id_maquila=pedido.id_maquila,
        id_usuario=current_user.id_usuario,
        codigo_pedido=pedido.codigo_pedido,
        tipo_prenda=pedido.tipo_prenda,
        talla=pedido.talla,
        color=pedido.color,
        cantidad=pedido.cantidad,
        fecha_ingreso=pedido.fecha_ingreso,
        fecha_entrega=pedido.fecha_entrega,
        prioridad=pedido.prioridad,
        estado=pedido.estado,
        progreso=pedido.progreso,
        observaciones=pedido.observaciones,
        fecha_creacion=pedido.fecha_creacion or datetime.utcnow()
    )

    try:
        db.add(nuevo_pedido)
        db.commit()
        db.refresh(nuevo_pedido)
        return nuevo_pedido

    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"No se pudo registrar el pedido: {str(error)}"
        )


# =====================================================
# LISTAR PEDIDOS
# =====================================================

@router.get(
    "/",
    response_model=list[PedidoResponse]
)
def list_pedidos(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([1, 2]))
):

    return (
        db.query(Pedido)
        .order_by(
            Pedido.id_pedido.desc()
        )
        .all()
    )


# =====================================================
# PEDIDOS POR ESTADO
# =====================================================

@router.get("/estado")
def pedidos_estado(
    id_usuario: Optional[int] = None,
    id_maquila: Optional[int] = None,
    estado_filtro: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([1, 2]))
):

    consulta = db.query(Pedido)

    if id_usuario:
        consulta = consulta.filter(
            Pedido.id_usuario == id_usuario
        )

    if id_maquila:
        consulta = consulta.filter(
            Pedido.id_maquila == id_maquila
        )

    pedidos = consulta.all()

    resultado = []
    hoy = date.today()

    for pedido in pedidos:
        estado = pedido.estado

        if estado not in [
            "Finalizado",
            "Entregado"
        ]:
            if pedido.fecha_entrega:
                if pedido.fecha_entrega < hoy:
                    estado = "Retrasado"
                else:
                    estado = "A tiempo"

        if estado_filtro:
            if estado != estado_filtro:
                continue

        resultado.append({
            "id_pedido": pedido.id_pedido,
            "id_maquila": pedido.id_maquila,
            "id_usuario": pedido.id_usuario,
            "codigo_pedido": pedido.codigo_pedido,
            "tipo_prenda": pedido.tipo_prenda,
            "talla": pedido.talla,
            "color": pedido.color,
            "cantidad": pedido.cantidad,
            "fecha_ingreso": pedido.fecha_ingreso,
            "fecha_entrega": pedido.fecha_entrega,
            "prioridad": pedido.prioridad,
            "estado": estado,
            "progreso": pedido.progreso,
            "observaciones": pedido.observaciones,
            "fecha_creacion": pedido.fecha_creacion
        })

    return resultado


# =====================================================
# ESTADO POR CÓDIGO
# =====================================================

@router.get(
    "/codigo/{codigo_pedido}/estado"
)
def estado_codigo(
    codigo_pedido: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([1, 2]))
):

    pedido = (
        db.query(Pedido)
        .filter(
            Pedido.codigo_pedido == codigo_pedido
        )
        .first()
    )

    if not pedido:
        raise HTTPException(
            status_code=404,
            detail="Pedido no encontrado"
        )

    return {
        "codigo_pedido": pedido.codigo_pedido,
        "estado": pedido.estado,
        "progreso": pedido.progreso
    }


# =====================================================
# PEDIDOS RECIENTES
# =====================================================

@router.get(
    "/recientes",
    response_model=list[PedidoResponse]
)
def pedidos_recientes(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([1, 2]))
):

    return (
        db.query(Pedido)
        .order_by(
            Pedido.id_pedido.desc()
        )
        .limit(3)
        .all()
    )


# =====================================================
# BUSCAR PEDIDO
# =====================================================

@router.get(
    "/buscar",
    response_model=list[PedidoResponse]
)
def buscar_pedido(
    codigo: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([1, 2]))
):

    return (
        db.query(Pedido)
        .filter(
            Pedido.codigo_pedido.ilike(
                f"%{codigo}%"
            )
        )
        .all()
    )


# =====================================================
# OBTENER PEDIDO POR ID
# =====================================================

@router.get(
    "/{pedido_id}",
    response_model=PedidoResponse
)
def obtener_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([1, 2]))
):

    pedido = (
        db.query(Pedido)
        .filter(
            Pedido.id_pedido == pedido_id
        )
        .first()
    )

    if not pedido:
        raise HTTPException(
            status_code=404,
            detail="Pedido no encontrado"
        )

    return pedido


# =====================================================
# ACTUALIZAR PEDIDO
# =====================================================

@router.put(
    "/{pedido_id}",
    response_model=PedidoResponse
)
def actualizar_pedido(
    pedido_id: int,
    pedido_update: PedidoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([1, 2]))
):

    pedido = (
        db.query(Pedido)
        .filter(
            Pedido.id_pedido == pedido_id
        )
        .first()
    )

    if not pedido:
        raise HTTPException(
            status_code=404,
            detail="Pedido no encontrado"
        )

    datos = pedido_update.model_dump(
        exclude_unset=True
    )

    for campo, valor in datos.items():
        setattr(
            pedido,
            campo,
            valor
        )

    if pedido.progreso == 100:
        pedido.estado = "Finalizado"

    db.commit()
    db.refresh(pedido)

    return pedido


# =====================================================
# ELIMINAR DEPENDENCIAS DEL PEDIDO
# =====================================================

def _eliminar_dependencias_pedido(db: Session, pedido_id: int) -> dict[str, int]:
    """
    Elimina registros de tablas que tengan una FK directa hacia
    pedidos.id_pedido.

    Esto evita errores de integridad cuando el pedido ya tiene seguimiento,
    control de calidad, informes, archivos, envíos de insumos u otras tablas
    relacionadas registradas en Base.metadata.
    """
    eliminados: dict[str, int] = {}

    # El recorrido inverso ayuda a eliminar primero tablas dependientes.
    for tabla in reversed(Base.metadata.sorted_tables):
        if tabla.name == "pedidos":
            continue

        columnas_fk = []

        for fk in tabla.foreign_keys:
            try:
                if (
                    fk.column.table.name == "pedidos"
                    and fk.column.name == "id_pedido"
                ):
                    columnas_fk.append(fk.parent)
            except Exception:
                continue

        if not columnas_fk:
            continue

        total_tabla = 0

        for columna in columnas_fk:
            resultado = db.execute(
                delete(tabla).where(columna == pedido_id)
            )

            if resultado.rowcount and resultado.rowcount > 0:
                total_tabla += resultado.rowcount

        if total_tabla > 0:
            eliminados[tabla.name] = total_tabla

    return eliminados


# =====================================================
# ELIMINAR PEDIDO
# =====================================================

@router.delete(
    "/{pedido_id}"
)
def eliminar_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([1]))
):

    # Esta búsqueda pasa por el Session multicuenta.
    # Si el pedido pertenece a otra cuenta, no debe aparecer aquí.
    pedido = (
        db.query(Pedido)
        .filter(
            Pedido.id_pedido == pedido_id
        )
        .first()
    )

    if not pedido:
        raise HTTPException(
            status_code=404,
            detail="Pedido no encontrado o no pertenece a esta cuenta"
        )

    codigo = pedido.codigo_pedido

    try:
        dependencias_eliminadas = _eliminar_dependencias_pedido(
            db=db,
            pedido_id=pedido_id
        )

        db.delete(pedido)
        db.commit()

        return {
            "detail": "Pedido eliminado correctamente",
            "id_pedido": pedido_id,
            "codigo_pedido": codigo,
            "registros_relacionados_eliminados": dependencias_eliminadas
        }

    except IntegrityError as error:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "No se pudo eliminar el pedido porque todavía existe una "
                "relación protegida en la base de datos. "
                f"Detalle técnico: {str(error.orig) if error.orig else str(error)}"
            )
        )

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"No se pudo eliminar el pedido: {str(error)}"
        )
