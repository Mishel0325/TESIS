from pydantic import BaseModel
from datetime import datetime

class SeguimientoCreate(BaseModel):
    id_pedido: int | None = None
    id_fase: int | None = None
    porcentaje_avance: float | None = 0.00
    fecha_inicio: datetime | None = None
    fecha_fin: datetime | None = None
    estado: str | None = None
    observacion: str | None = None

class SeguimientoResponse(SeguimientoCreate):
    id_seguimiento: int

    class Config:
        from_attributes = True
