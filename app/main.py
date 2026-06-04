from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from datetime import date
from app.database import Base, engine, get_db

# Importar routers
from app.routes import auth_routes, user_routes, maquila_routes, pedido_routes
from app.models.pedido_model import Pedido

# Crear aplicación FastAPI
app = FastAPI(title="Maquila System API")

# Crear todas las tablas si no existen
Base.metadata.create_all(bind=engine)

# Incluir routers
app.include_router(auth_routes.router)
app.include_router(user_routes.router)
app.include_router(maquila_routes.router)
app.include_router(pedido_routes.router)

# Endpoint global para estado de pedidos
@app.get("/pedidos/estado")
def pedidos_estado(
    id_usuario: int | None = None,
    id_maquila: int | None = None,
    estado_filtro: str | None = None,
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