from pydantic import BaseModel
from datetime import datetime

class ArchivoPedidoCreate(BaseModel):
    id_pedido: int | None = None
    nombre_archivo: str | None = None
    ruta_archivo: str | None = None

class ArchivoPedidoResponse(ArchivoPedidoCreate):
    id_archivo: int
    fecha_subida: datetime | None

    class Config:
        from_attributes = True
