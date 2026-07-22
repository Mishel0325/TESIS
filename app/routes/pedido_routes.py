from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.database import get_db
from app.models.pedido_model import Pedido
from app.models.user_model import User
from app.schemas.pedido_schema import PedidoCreate, PedidoResponse


# No colocamos prefix aquí porque ya se agrega en main.py
router = APIRouter(tags=["Pedidos"])


# =====================================================
# CREAR PEDIDO
# Administrador: rol 1
# Supervisora: rol 2
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
        .filter(Pedido.codigo_pedido == pedido.codigo_pedido)
        .first()
    )

    if pedido_existente:
        raise HTTPException(
            status_code=409,
            detail="Ya existe un pedido con ese código"
        )

    db_pedido = Pedido(
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
        observaciones=pedido.observaciones,
        fecha_creacion=pedido.fecha_creacion or datetime.utcnow()
    )

    try:
        db.add(db_pedido)
        db.commit()
        db.refresh(db_pedido)

        return db_pedido

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
    response_model=list[PedidoResponse],
    dependencies=[Depends(require_role([1, 2]))]
)
def list_pedidos(
    db: Session = Depends(get_db)
):
    return db.query(Pedido).all()


# =====================================================
# CONSULTAR ESTADO DE PEDIDOS
# =====================================================

@router.get("/estado")
def pedidos_estado(
    id_usuario: Optional[int] = None,
    id_maquila: Optional[int] = None,
    estado_filtro: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([1, 2]))
):
    pedidos_query = db.query(Pedido)

    if id_usuario is not None:
        pedidos_query = pedidos_query.filter(
            Pedido.id_usuario == id_usuario
        )

    if id_maquila is not None:
        pedidos_query = pedidos_query.filter(
            Pedido.id_maquila == id_maquila
        )

    pedidos = pedidos_query.all()
    hoy = date.today()
    resultado = []

    for pedido in pedidos:
        estado_calculado = "Pendiente"

        if pedido.fecha_entrega:
            if pedido.fecha_entrega > hoy:
                estado_calculado = "A tiempo"
            elif pedido.fecha_entrega < hoy:
                estado_calculado = "Retrasado"
            else:
                estado_calculado = "Pendiente"

        if (
            estado_filtro
            and estado_calculado != estado_filtro
        ):
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
            "estado": estado_calculado,
            "observaciones": pedido.observaciones,
            "fecha_creacion": pedido.fecha_creacion
        })

    return resultado


# =====================================================
# CONSULTAR ESTADO POR CÓDIGO
# =====================================================

@router.get(
    "/codigo/{codigo_pedido}/estado",
    dependencies=[Depends(require_role([1, 2]))]
)
def get_pedido_estado_by_codigo(
    codigo_pedido: str,
    db: Session = Depends(get_db)
):
    pedido = (
        db.query(Pedido)
        .filter(Pedido.codigo_pedido == codigo_pedido)
        .first()
    )

    if not pedido:
        raise HTTPException(
            status_code=404,
            detail="Pedido no encontrado"
        )

    hoy = date.today()
    estado_calculado = "Pendiente"

    if pedido.fecha_entrega:
        if pedido.fecha_entrega > hoy:
            estado_calculado = "A tiempo"
        elif pedido.fecha_entrega < hoy:
            estado_calculado = "Retrasado"

    return {
        "codigo_pedido": pedido.codigo_pedido,
        "estado": estado_calculado
    }


# =====================================================
# OBTENER PEDIDO POR ID
# =====================================================

@router.get(
    "/{pedido_id}",
    response_model=PedidoResponse,
    dependencies=[Depends(require_role([1, 2]))]
)
def get_pedido(
    pedido_id: int,
    db: Session = Depends(get_db)
):
    pedido = (
        db.query(Pedido)
        .filter(Pedido.id_pedido == pedido_id)
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
# Administrador y supervisora
# =====================================================

@router.put(
    "/{pedido_id}",
    response_model=PedidoResponse
)
def update_pedido(
    pedido_id: int,
    pedido_update: PedidoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([1, 2]))
):
    pedido = (
        db.query(Pedido)
        .filter(Pedido.id_pedido == pedido_id)
        .first()
    )

    if not pedido:
        raise HTTPException(
            status_code=404,
            detail="Pedido no encontrado"
        )

    pedido.id_maquila = pedido_update.id_maquila
    pedido.codigo_pedido = pedido_update.codigo_pedido
    pedido.tipo_prenda = pedido_update.tipo_prenda
    pedido.talla = pedido_update.talla
    pedido.color = pedido_update.color
    pedido.cantidad = pedido_update.cantidad
    pedido.fecha_ingreso = pedido_update.fecha_ingreso
    pedido.fecha_entrega = pedido_update.fecha_entrega
    pedido.prioridad = pedido_update.prioridad
    pedido.estado = pedido_update.estado
    pedido.observaciones = pedido_update.observaciones

    if pedido_update.fecha_creacion is not None:
        pedido.fecha_creacion = pedido_update.fecha_creacion

    try:
        db.commit()
        db.refresh(pedido)

        return pedido

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"No se pudo actualizar el pedido: {str(error)}"
        )


# =====================================================
# ELIMINAR PEDIDO
# Solo administrador
# =====================================================

@router.delete("/{pedido_id}")
def delete_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([1]))
):
    pedido = (
        db.query(Pedido)
        .filter(Pedido.id_pedido == pedido_id)
        .first()
    )

    if not pedido:
        raise HTTPException(
            status_code=404,
            detail="Pedido no encontrado"
        )

    try:
        db.delete(pedido)
        db.commit()

        return {
            "detail": "Pedido eliminado correctamente"
        }

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"No se pudo eliminar el pedido: {str(error)}"
        )