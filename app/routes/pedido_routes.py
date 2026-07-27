from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.database import get_db

from app.models.pedido_model import Pedido
from app.models.user_model import User

from app.schemas.pedido_schema import (
    PedidoCreate,
    PedidoUpdate,
    PedidoResponse
)


router = APIRouter(
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

        progreso=pedido.progreso,

        observaciones=pedido.observaciones,

        fecha_creacion=
        pedido.fecha_creacion or datetime.utcnow()

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
    dependencies=[
        Depends(require_role([1,2]))
    ]
)
def list_pedidos(
    db: Session = Depends(get_db)
):

    return (
        db.query(Pedido)
        .order_by(
            Pedido.id_pedido.desc()
        )
        .all()
    )



# =====================================================
# CONSULTAR ESTADO
# =====================================================

@router.get("/estado")
def pedidos_estado(

    id_usuario: Optional[int] = None,

    id_maquila: Optional[int] = None,

    estado_filtro: Optional[str] = None,

    db: Session = Depends(get_db),

    current_user: User = Depends(require_role([1,2]))

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


        # Respeta estados manuales
        if pedido.estado in [
            "Finalizado",
            "Entregado"
        ]:

            estado_calculado = pedido.estado


        else:

            estado_calculado = "Pendiente"


            if pedido.fecha_entrega:

                if pedido.fecha_entrega >= hoy:

                    estado_calculado = "A tiempo"


                elif pedido.fecha_entrega < hoy:

                    estado_calculado = "Retrasado"



        if estado_filtro:

            if estado_calculado != estado_filtro:

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

            "progreso": pedido.progreso,

            "observaciones": pedido.observaciones,

            "fecha_creacion": pedido.fecha_creacion

        })


    return resultado

# =====================================================
# ESTADO POR CÓDIGO
# =====================================================

@router.get(
    "/codigo/{codigo_pedido}/estado",
    dependencies=[
        Depends(require_role([1,2]))
    ]
)
def get_pedido_estado_by_codigo(

    codigo_pedido: str,

    db: Session = Depends(get_db)

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
# ÚLTIMOS 3 PEDIDOS
# =====================================================

@router.get(
    "/recientes",
    response_model=list[PedidoResponse],
    dependencies=[
        Depends(require_role([1,2]))
    ]
)
def get_pedidos_recientes(

    db: Session = Depends(get_db)

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
# BUSCAR POR CÓDIGO
# =====================================================

@router.get(
    "/buscar",
    response_model=list[PedidoResponse],
    dependencies=[
        Depends(require_role([1,2]))
    ]
)
def buscar_pedido_codigo(

    codigo: str,

    db: Session = Depends(get_db)

):

    return (

        db.query(Pedido)

        .filter(
            Pedido.codigo_pedido.ilike(
                f"%{codigo}%"
            )
        )

        .order_by(
            Pedido.id_pedido.desc()
        )

        .all()

    )



# =====================================================
# OBTENER POR ID
# =====================================================

@router.get(
    "/{pedido_id}",
    response_model=PedidoResponse,
    dependencies=[
        Depends(require_role([1,2]))
    ]
)
def get_pedido(

    pedido_id: int,

    db: Session = Depends(get_db)

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
def update_pedido(

    pedido_id: int,

    pedido_update: PedidoUpdate,

    db: Session = Depends(get_db),

    current_user: User = Depends(require_role([1,2]))

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



    # Si el progreso llega a 100,
    # cambia automáticamente a finalizado
    if pedido.progreso == 100:

        pedido.estado = "Finalizado"



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
# =====================================================

@router.delete("/{pedido_id}")
def delete_pedido(

    pedido_id: int,

    db: Session = Depends(get_db),

    current_user: User = Depends(require_role([1]))

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


    try:

        db.delete(pedido)

        db.commit()


        return {
            "detail":
            "Pedido eliminado correctamente"
        }



    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"No se pudo eliminar el pedido: {str(error)}"
        )