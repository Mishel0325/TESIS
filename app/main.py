from fastapi import FastAPI
from app.database import Base, engine, get_db

# Importar routers
from app.routes import (
	auth_routes,
	user_routes,
	maquila_routes,
	pedido_routes,
	role_routes,
	permiso_routes,
	rol_permiso_routes,
	insumo_routes,
	movimiento_routes,
	asignacion_routes,
	archivo_routes,
	control_calidad_routes,
	envio_insumo_routes,
	fase_routes,
	historial_routes,
	informe_routes,
	seguimiento_routes,
)

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
app.include_router(permiso_routes.router)
app.include_router(rol_permiso_routes.router)
app.include_router(insumo_routes.router)
app.include_router(movimiento_routes.router)
app.include_router(asignacion_routes.router)
app.include_router(archivo_routes.router)
app.include_router(control_calidad_routes.router)
app.include_router(envio_insumo_routes.router)
app.include_router(fase_routes.router)
app.include_router(historial_routes.router)
app.include_router(informe_routes.router)
app.include_router(seguimiento_routes.router)

