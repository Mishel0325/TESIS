from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date, datetime
from typing import Optional
from app.database import get_db
from app.models.pedido_model import Pedido
from app.schemas.pedido_schema import PedidoCreate, PedidoResponse

router = APIRouter(prefix="/pedidos", tags=["pedidos"])

# --- CRUD PEDIDOS ---

@router.post("/", response_model=PedidoResponse)
def create_pedido(pedido: PedidoCreate, db: Session = Depends(get_db)):
    db_pedido = Pedido(
        id_maquila=pedido.id_maquila,
        id_usuario=pedido.id_usuario,
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
    db.add(db_pedido)
    db.commit()
    db.refresh(db_pedido)
    return db_pedido

@router.get("/", response_model=list[PedidoResponse])
def list_pedidos(db: Session = Depends(get_db)):
    return db.query(Pedido).all()

@router.get("/estado")
def pedidos_estado(
    id_usuario: Optional[int] = None,
    id_maquila: Optional[int] = None,
    estado_filtro: Optional[str] = None,
    db: Session = Depends(get_db)
):
    pedidos_query = db.query(Pedido)

    if id_usuario is not None:
        pedidos_query = pedidos_query.filter(Pedido.id_usuario == id_usuario)
    if id_maquila is not None:
        pedidos_query = pedidos_query.filter(Pedido.id_maquila == id_maquila)

    pedidos = pedidos_query.all()
    hoy = date.today()
    result = []

    for p in pedidos:
        estado = "Pendiente"
        if getattr(p, "fecha_entrega", None):
            if p.fecha_entrega > hoy:
                estado = "A tiempo"
            elif p.fecha_entrega < hoy:
                estado = "Retrasado"
            else:
                estado = "Pendiente"

        # Filtrar por estado si se pasa
        if estado_filtro and estado != estado_filtro:
            continue

        result.append({
            "id_pedido": getattr(p, "id_pedido", None),
            "id_maquila": getattr(p, "id_maquila", None),
            "id_usuario": getattr(p, "id_usuario", None),
            "codigo_pedido": getattr(p, "codigo_pedido", None),
            "tipo_prenda": getattr(p, "tipo_prenda", None),
            "talla": getattr(p, "talla", None),
            "color": getattr(p, "color", None),
            "cantidad": getattr(p, "cantidad", None),
            "fecha_ingreso": getattr(p, "fecha_ingreso", None),
            "estado": estado,
            "fecha_creacion": getattr(p, "fecha_creacion", None),
            "fecha_entrega": getattr(p, "fecha_entrega", None),
            "prioridad": getattr(p, "prioridad", None),
            "observaciones": getattr(p, "observaciones", None)
        })

    return result

@router.get("/codigo/{codigo_pedido}/estado")
def get_pedido_estado_by_codigo(
    codigo_pedido: str,
    user_id: int = Query(..., description="ID del usuario que solicita la información"),
    db: Session = Depends(get_db)
):
    if user_id not in (1, 2):
        raise HTTPException(status_code=403, detail="Solo los usuarios 1 y 2 pueden ver el estado")

    pedido = db.query(Pedido).filter(Pedido.codigo_pedido == codigo_pedido).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    hoy = date.today()
    estado = "Pendiente"
    if getattr(pedido, "fecha_entrega", None):
        if pedido.fecha_entrega > hoy:
            estado = "A tiempo"
        elif pedido.fecha_entrega < hoy:
            estado = "Retrasado"
        else:
            estado = "Pendiente"

    return f"{pedido.codigo_pedido} {estado}"

@router.get("/{pedido_id}", response_model=PedidoResponse)
def get_pedido(pedido_id: int, db: Session = Depends(get_db)):
    pedido = db.query(Pedido).filter(Pedido.id_pedido == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return pedido

@router.put("/{pedido_id}", response_model=PedidoResponse)
def update_pedido(pedido_id: int, pedido_update: PedidoCreate, db: Session = Depends(get_db)):
    pedido = db.query(Pedido).filter(Pedido.id_pedido == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    pedido.id_maquila = pedido_update.id_maquila
    pedido.id_usuario = pedido_update.id_usuario
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
    db.commit()
    db.refresh(pedido)
    return pedido

@router.delete("/{pedido_id}")
def delete_pedido(pedido_id: int, db: Session = Depends(get_db)):
    pedido = db.query(Pedido).filter(Pedido.id_pedido == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    db.delete(pedido)
    db.commit()
    return {"detail": "Pedido eliminado correctamente"}
