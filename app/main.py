from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine

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


# ============================================================
# APLICACIÓN
# ============================================================

app = FastAPI(
    title="Maquila System API",
    version="1.0.0",
    description="Sistema integral de control de maquila",
)


# ============================================================
# CORS - FRONTEND REACT / VITE
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    # También permite abrir Vite desde una IP privada de la red local
    # (por ejemplo 192.168.x.x:5173) sin provocar Axios "Network Error".
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+):\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# BASE DE DATOS
# ============================================================

Base.metadata.create_all(bind=engine)


# ============================================================
# REGISTRO DE ROUTERS
# ============================================================

# Routers que ya administran su propio prefix internamente.
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(maquila_router)
app.include_router(pedido_router)
app.include_router(seguimiento_router)

# Estos routers utilizan el prefix definido desde main.py.
app.include_router(
    role_router,
    prefix="/roles",
    tags=["Roles"],
)

app.include_router(
    permiso_router,
    prefix="/permisos",
    tags=["Permisos"],
)

app.include_router(
    rol_permiso_router,
    prefix="/roles-permisos",
    tags=["Roles-Permisos"],
)

# IMPORTANTE:
# insumo_routes.py ya declara prefix="/insumos".
# Si se vuelve a poner prefix="/insumos" aquí, la ruta queda
# incorrectamente como /insumos/insumos/.
app.include_router(insumo_router)

app.include_router(
    movimiento_router,
    prefix="/movimientos",
    tags=["Movimientos"],
)

app.include_router(
    asignacion_router,
    prefix="/asignaciones",
    tags=["Asignaciones"],
)

# archivo_routes.py ya declara prefix="/archivos".
app.include_router(archivo_router)

# IMPORTANTE:
# control_calidad_routes.py ya declara prefix="/control_calidad".
# No agregamos otro prefix aquí para evitar rutas duplicadas como
# /control-calidad/control_calidad/.
app.include_router(control_calidad_router)

# IMPORTANTE:
# envio_insumo_routes.py ya declara prefix="/envios_insumos".
# El frontend utiliza precisamente /envios_insumos/.
app.include_router(envio_insumo_router)

# Estos routers ya poseen su propio prefix interno.
app.include_router(prenda_router)
app.include_router(fase_router)
app.include_router(tarea_router)

app.include_router(
    historial_router,
    prefix="/historial",
    tags=["Historial"],
)

# informe_routes.py ya declara prefix="/informes".
app.include_router(informe_router)


# ============================================================
# RUTAS GENERALES
# ============================================================

@app.get("/", tags=["Sistema"])
def inicio():
    return {
        "mensaje": "Maquila System API funcionando correctamente",
        "estado": "ok",
    }


@app.get("/health", tags=["Sistema"])
def health():
    return {
        "status": "ok",
        "service": "Maquila System API",
    }
