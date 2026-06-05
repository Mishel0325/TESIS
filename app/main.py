from fastapi import FastAPI
from app.database import Base, engine, get_db

# Importar routers
from app.routes import auth_routes, user_routes, maquila_routes, pedido_routes, role_routes

# Crear aplicación FastAPI
app = FastAPI(title="Maquila System API")

# Crear todas las tablas si no existen
Base.metadata.create_all(bind=engine)

# Incluir routers
app.include_router(auth_routes.router)
app.include_router(user_routes.router)
app.include_router(maquila_routes.router)
app.include_router(pedido_routes.router)
app.include_router(role_routes.router)

