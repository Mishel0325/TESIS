from datetime import datetime
from pydantic import BaseModel, Field


class ArchivoPedidoBase(BaseModel):
    id_pedido: int | None = Field(default=None, gt=0)
    nombre_archivo: str | None = None
    ruta_archivo: str | None = None


class ArchivoPedidoCreate(ArchivoPedidoBase):
    pass


class ArchivoPedidoUpdate(BaseModel):
    id_pedido: int | None = Field(default=None, gt=0)
    nombre_archivo: str | None = None
    ruta_archivo: str | None = None


class ArchivoPedidoResponse(ArchivoPedidoBase):
    id_archivo: int
    fecha_subida: datetime | None = None

    class Config:
        from_attributes = True
