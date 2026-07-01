from enum import Enum
from pydantic import BaseModel
from datetime import datetime

class SeguimientoEstado(str, Enum):
    PENDIENTE = 'Pendiente'
    EN_PROCESO = 'En Proceso'
    FINALIZADO = 'Finalizado'
    RETRASADO = 'Retrasado'

class SeguimientoCreate(BaseModel):
    id_pedido: int
    id_fase: int | None = None
    porcentaje_avance: float | None = 0.00
    fecha_inicio: datetime | None = None
    fecha_fin: datetime | None = None
    estado: SeguimientoEstado | None = None
    observacion: str | None = None

class SeguimientoResponse(SeguimientoCreate):
    id_seguimiento: int

    class Config:
        from_attributes = True
