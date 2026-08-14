from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine

# La tabla de cuentas debe formar parte del metadata antes de create_all.
from app.models.cuenta_model import Cuenta  # noqa: F401

# ============================================================
# ROUTERS
# ============================================================
from app.routes.auth_routes import router as auth_router
from app.routes.user_routes import router as user_router
from app.routes.maquila_routes import router as maquila_router
from app.routes.pedido_routes import router as pedido_router
from app.routes.seguimiento_routes import router as seguimiento_router

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

# Se instala DESPUÉS de importar los routers, para que todos sus modelos ya
# estén registrados en Base.registry y puedan recibir id_cuenta.
from app.core.tenant import instalar_multicuenta, middleware_multicuenta

instalar_multicuenta()


app = FastAPI(
    title="Maquila System API",
    version="1.1.0",
    description="Sistema integral de control de maquila con aislamiento por cuenta",
)

# Contexto de cuenta por cada petición autenticada.
app.middleware("http")(middleware_multicuenta)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=(
        r"^https?://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|"
        r"192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+):\d+$"
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# En una base ya existente, primero se debe ejecutar migrar_multicuenta.py.
Base.metadata.create_all(bind=engine)

# Routers con prefix interno.
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(maquila_router)
app.include_router(pedido_router)
app.include_router(seguimiento_router)

# Catálogos globales.
app.include_router(role_router, prefix="/roles", tags=["Roles"])
app.include_router(permiso_router, prefix="/permisos", tags=["Permisos"])
app.include_router(rol_permiso_router, prefix="/roles-permisos", tags=["Roles-Permisos"])

# Estos routers ya declaran sus prefixes internamente.
app.include_router(insumo_router)

app.include_router(movimiento_router, prefix="/movimientos", tags=["Movimientos"])
app.include_router(asignacion_router, prefix="/asignaciones", tags=["Asignaciones"])

app.include_router(archivo_router)
app.include_router(control_calidad_router)
app.include_router(envio_insumo_router)

app.include_router(prenda_router)
app.include_router(fase_router)
app.include_router(tarea_router)

app.include_router(historial_router, prefix="/historial", tags=["Historial"])
app.include_router(informe_router)


@app.get("/", tags=["Sistema"])
def inicio():
    return {
        "mensaje": "Maquila System API funcionando correctamente",
        "estado": "ok",
        "modo": "multicuenta",
    }


@app.get("/health", tags=["Sistema"])
def health():
    return {
        "status": "ok",
        "service": "Maquila System API",
        "multicuenta": True,
    }
