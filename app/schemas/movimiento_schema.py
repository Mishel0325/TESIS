from pydantic import BaseModel
from datetime import datetime

class MovimientoCreate(BaseModel):
    id_insumo: int | None = None
    tipo: str | None = None
    cantidad: float | None = 0.0
    observacion: str | None = None

class MovimientoResponse(MovimientoCreate):
    id_movimiento: int
    fecha: datetime | None

    class Config:
        from_attributes = True
