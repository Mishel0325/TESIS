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

        "http://localhost:5173"

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


# Auth
app.include_router(
    auth_router
)



# Usuarios
app.include_router(
    seguimiento_router
)

# Maquilas
app.include_router(
    maquila_router,
    prefix="/maquilas",
    tags=["Maquilas"]
)



# Pedidos
# Incluye:
# POST   /pedidos/
# GET    /pedidos/
# GET    /pedidos/recientes
# GET    /pedidos/buscar
# PUT    /pedidos/{pedido_id}

app.include_router(

    pedido_router,

    prefix="/pedidos",

    tags=["Pedidos"]

)



# Roles
app.include_router(
    role_router,
    prefix="/roles",
    tags=["Roles"]
)



# Permisos
app.include_router(
    permiso_router,
    prefix="/permisos",
    tags=["Permisos"]
)



# Roles permisos
app.include_router(
    rol_permiso_router,
    prefix="/roles-permisos",
    tags=["Roles-Permisos"]
)



# Insumos
app.include_router(
    insumo_router,
    prefix="/insumos",
    tags=["Insumos"]
)



# Movimientos
app.include_router(
    movimiento_router,
    prefix="/movimientos",
    tags=["Movimientos"]
)



# Asignaciones
app.include_router(
    asignacion_router,
    prefix="/asignaciones",
    tags=["Asignaciones"]
)



# Archivos
app.include_router(
    archivo_router,
    prefix="/archivos",
    tags=["Archivos"]
)



# Control calidad
app.include_router(
    control_calidad_router,
    prefix="/control-calidad",
    tags=["Control Calidad"]
)



# Envío insumos
app.include_router(
    envio_insumo_router,
    prefix="/envio-insumos",
    tags=["Envío Insumos"]
)



# =========================
# PRENDAS
# IMPORTANTE:
# prenda_routes.py YA TIENE:
# prefix="/prendas"
# =========================

app.include_router(
    prenda_router
)



# Fases
app.include_router(
    fase_router,
    prefix="/fases",
    tags=["Fases"]
)



# Tareas
app.include_router(
    tarea_router,
    prefix="/tareas",
    tags=["Tareas"]
)



# Historial
app.include_router(
    historial_router,
    prefix="/historial",
    tags=["Historial"]
)



# Informes
app.include_router(
    informe_router,
    prefix="/informes",
    tags=["Informes"]
)



# Seguimiento
app.include_router(
    seguimiento_router,
    prefix="/seguimiento",
    tags=["Seguimiento"]
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