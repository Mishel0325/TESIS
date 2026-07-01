from pydantic import BaseModel
from datetime import datetime
from app.schemas.pedido_schema import PedidoResponse
from app.schemas.maquila_schema import MaquilaResponse
from app.schemas.fase_schema import FaseResponse
from app.schemas.seguimiento_schema import SeguimientoResponse

class InformeCreate(BaseModel):
    id_pedido: int
    observaciones_generales: str | None = None
    tiempo_planificado: int | None = None
    tiempo_real: int | None = None
    porcentaje_cumplimiento: float | None = None
    ruta_pdf: str | None = None

class InformeCreateByCodigo(BaseModel):
    codigo_pedido: str
    ruta_pdf: str | None = None

class InformeResponse(InformeCreate):
    id_informe: int
    fecha_generacion: datetime | None

    class Config:
        from_attributes = True

class InformeDetailResponse(InformeResponse):
    pedido: PedidoResponse | None = None
    maquila: MaquilaResponse | None = None
    fase_actual: FaseResponse | None = None
    seguimientos: list[SeguimientoResponse] | None = None

    class Config:
        from_attributes = True
