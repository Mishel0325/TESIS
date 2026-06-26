from pydantic import BaseModel
from datetime import datetime

class InformeCreate(BaseModel):
    id_pedido: int | None = None
    observaciones_generales: str | None = None
    tiempo_planificado: int | None = None
    tiempo_real: int | None = None
    porcentaje_cumplimiento: float | None = None
    ruta_pdf: str | None = None

class InformeResponse(InformeCreate):
    id_informe: int
    fecha_generacion: datetime | None

    class Config:
        from_attributes = True
