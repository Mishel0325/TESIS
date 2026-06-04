from pydantic import BaseModel
from datetime import datetime, date

class PedidoCreate(BaseModel):
    id_maquila: int
    id_usuario: int
    descripcion: str
    fecha_creacion: datetime | None = None
    fecha_entrega: date | None = None
    estado: str | None = "Pendiente"

class PedidoResponse(BaseModel):
    id_pedido: int
    id_maquila: int
    id_usuario: int
    descripcion: str
    estado: str
    fecha_creacion: datetime | None

    class Config:
        from_attributes = True