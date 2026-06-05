from pydantic import BaseModel
from datetime import datetime, date

class PedidoCreate(BaseModel):
    id_maquila: int
    id_usuario: int
    codigo_pedido: str
    tipo_prenda: str | None = None
    talla: str | None = None
    color: str | None = None
    cantidad: int
    fecha_ingreso: date | None = None
    fecha_entrega: date | None = None
    prioridad: str | None = "Media"
    estado: str | None = "Pendiente"
    observaciones: str | None = None
    fecha_creacion: datetime | None = None

class PedidoResponse(BaseModel):
    id_pedido: int
    id_maquila: int
    id_usuario: int
    codigo_pedido: str
    tipo_prenda: str | None = None
    talla: str | None = None
    color: str | None = None
    cantidad: int
    fecha_ingreso: date | None = None
    fecha_entrega: date | None = None
    prioridad: str | None = None
    estado: str
    observaciones: str | None = None
    fecha_creacion: datetime | None

    class Config:
        from_attributes = True