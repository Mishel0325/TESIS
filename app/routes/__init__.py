from fastapi import APIRouter

router = APIRouter()

# Expose route modules so they can be imported from app.routes
from . import (
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
