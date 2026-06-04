from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
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
        descripcion=pedido.descripcion,
        fecha_creacion=pedido.fecha_creacion,
        fecha_entrega=pedido.fecha_entrega,
        estado=pedido.estado
    )
    db.add(db_pedido)
    db.commit()
    db.refresh(db_pedido)
    return db_pedido

@router.get("/", response_model=list[PedidoResponse])
def list_pedidos(db: Session = Depends(get_db)):
    return db.query(Pedido).all()

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
    pedido.descripcion = pedido_update.descripcion
    pedido.fecha_creacion = pedido_update.fecha_creacion
    pedido.fecha_entrega = pedido_update.fecha_entrega
    pedido.estado = pedido_update.estado
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


# --- ENDPOINT ESTADO PEDIDOS ---

@router.get("/estado")
def pedidos_estado(
    id_usuario: int | None = Query(None, description="Filtrar por ID de usuario"),
    id_maquila: int | None = Query(None, description="Filtrar por ID de maquila"),
    estado_filtro: str | None = Query(None, description="Filtrar por estado: Pendiente, A tiempo, Retrasado"),
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
            "descripcion": getattr(p, "descripcion", None),
            "estado": estado,
            "fecha_creacion": getattr(p, "fecha_creacion", None),
            "fecha_entrega": getattr(p, "fecha_entrega", None)
        })

    return result