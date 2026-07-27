from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine


# =========================
# IMPORTAR ROUTERS
# =========================

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



# =========================
# CREAR API
# =========================

app = FastAPI(

    title="Maquila System API",

    version="1.0.0",

    description="Sistema integral de control de maquila"

)



# =========================
# CORS FRONTEND REACT
# =========================

app.add_middleware(

    CORSMiddleware,

    allow_origins=[

        "http://localhost:5173",
        "http://127.0.0.1:5173"

    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],

)



# =========================
# CREAR TABLAS
# =========================

Base.metadata.create_all(
    bind=engine
)



# =========================
# REGISTRO ROUTERS
# =========================


# =========================
# AUTENTICACIÓN
# =========================

app.include_router(
    auth_router
)



# =========================
# USUARIOS
# =========================

app.include_router(
    user_router
)



# =========================
# MAQUILAS
# =========================

app.include_router(
    maquila_router
)



# =========================
# PEDIDOS
# pedido_routes.py tiene:
# prefix="/pedidos"
# =========================

app.include_router(
    pedido_router
)



# =========================
# SEGUIMIENTO
# seguimiento_routes.py tiene:
# prefix="/seguimiento"
# =========================

app.include_router(
    seguimiento_router
)



# =========================
# ROLES
# =========================

app.include_router(
    role_router,
    prefix="/roles",
    tags=["Roles"]
)



# =========================
# PERMISOS
# =========================

app.include_router(
    permiso_router,
    prefix="/permisos",
    tags=["Permisos"]
)



# =========================
# ROLES PERMISOS
# =========================

app.include_router(
    rol_permiso_router,
    prefix="/roles-permisos",
    tags=["Roles-Permisos"]
)



# =========================
# INSUMOS
# =========================

app.include_router(
    insumo_router,
    prefix="/insumos",
    tags=["Insumos"]
)



# =========================
# MOVIMIENTOS
# =========================

app.include_router(
    movimiento_router,
    prefix="/movimientos",
    tags=["Movimientos"]
)



# =========================
# ASIGNACIONES
# =========================

app.include_router(
    asignacion_router,
    prefix="/asignaciones",
    tags=["Asignaciones"]
)



# =========================
# ARCHIVOS
# =========================

app.include_router(
    archivo_router,
    prefix="/archivos",
    tags=["Archivos"]
)



# =========================
# CONTROL CALIDAD
# =========================

app.include_router(
    control_calidad_router,
    prefix="/control-calidad",
    tags=["Control Calidad"]
)



# =========================
# ENVÍO INSUMOS
# =========================

app.include_router(
    envio_insumo_router,
    prefix="/envio-insumos",
    tags=["Envío Insumos"]
)



# =========================
# PRENDAS
# prenda_routes.py ya tiene prefix
# =========================

app.include_router(
    prenda_router
)



# =========================
# FASES
# =========================

app.include_router(
    fase_router,
    prefix="/fases",
    tags=["Fases"]
)



# =========================
# TAREAS
# =========================

app.include_router(
    tarea_router,
    prefix="/tareas",
    tags=["Tareas"]
)



# =========================
# HISTORIAL
# =========================

app.include_router(
    historial_router,
    prefix="/historial",
    tags=["Historial"]
)



# =========================
# INFORMES
# =========================

app.include_router(
    informe_router,
    prefix="/informes",
    tags=["Informes"]
)



# =========================
# RUTA PRINCIPAL
# =========================

@app.get("/")
def inicio():

    return {

        "mensaje":
        "Maquila System API funcionando correctamente"

    }