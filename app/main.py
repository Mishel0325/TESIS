from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine

from app.routes.auth_routes import router as auth_router
from app.routes.user_routes import router as user_router
from app.routes.maquila_routes import router as maquila_router
from app.routes.pedido_routes import router as pedido_router
from app.routes.role_routes import router as role_router
from app.routes.permiso_routes import router as permiso_router
from app.routes.rol_permiso_routes import router as rol_permiso_router
from app.routes.insumo_routes import router as insumo_router
from app.routes.movimiento_routes import router as movimiento_router
from app.routes.asignacion_routes import router as asignacion_router
from app.routes.archivo_routes import router as archivo_router
from app.routes.control_calidad_routes import router as control_calidad_router
from app.routes.envio_insumo_routes import router as envio_insumo_router
from app.routes.prenda_routes import router as prenda_router
from app.routes.fase_routes import router as fase_router
from app.routes.tarea_routes import router as tarea_router
from app.routes.historial_routes import router as historial_router
from app.routes.informe_routes import router as informe_router
from app.routes.seguimiento_routes import router as seguimiento_router


app = FastAPI(
    title="Maquila System API",
    version="1.0.0",
    description="Sistema integral de control de maquila"
)

# =========================
# CORS (FRONTEND REACT)
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# CREAR TABLAS
# =========================
Base.metadata.create_all(bind=engine)

# =========================
# ROUTERS
# =========================
app.include_router(auth_router)
app.include_router(user_router, prefix="/users", tags=["Users"])
app.include_router(maquila_router, prefix="/maquilas", tags=["Maquilas"])
app.include_router(pedido_router, prefix="/pedidos", tags=["Pedidos"])
app.include_router(role_router, prefix="/roles", tags=["Roles"])
app.include_router(permiso_router, prefix="/permisos", tags=["Permisos"])
app.include_router(rol_permiso_router, prefix="/roles-permisos", tags=["Roles-Permisos"])
app.include_router(insumo_router, prefix="/insumos", tags=["Insumos"])
app.include_router(movimiento_router, prefix="/movimientos", tags=["Movimientos"])
app.include_router(asignacion_router, prefix="/asignaciones", tags=["Asignaciones"])
app.include_router(archivo_router, prefix="/archivos", tags=["Archivos"])
app.include_router(control_calidad_router, prefix="/control-calidad", tags=["Control Calidad"])
app.include_router(envio_insumo_router, prefix="/envio-insumos", tags=["Envío Insumos"])
app.include_router(prenda_router, prefix="/prendas", tags=["Prendas"])
app.include_router(fase_router, prefix="/fases", tags=["Fases"])
app.include_router(tarea_router, prefix="/tareas", tags=["Tareas"])
app.include_router(historial_router, prefix="/historial", tags=["Historial"])
app.include_router(informe_router, prefix="/informes", tags=["Informes"])
app.include_router(seguimiento_router, prefix="/seguimiento", tags=["Seguimiento"])