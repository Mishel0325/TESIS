from pydantic import BaseModel
from datetime import datetime

class HistorialCreate(BaseModel):
    id_pedido: int
    estado_anterior: str | None = None
    estado_nuevo: str | None = None
    observacion: str | None = None

class HistorialResponse(HistorialCreate):
    id_historial: int
    fecha: datetime | None

    class Config:
        from_attributes = True
