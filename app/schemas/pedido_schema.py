from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, Field


class EstadoPedido(str, Enum):
    PENDIENTE = "Pendiente"
    EN_PRODUCCION = "En Produccion"
    A_TIEMPO = "A tiempo"
    RETRASADO = "Retrasado"
    FINALIZADO = "Finalizado"
    ENTREGADO = "Entregado"


class PedidoCreate(BaseModel):
    id_maquila: int = Field(gt=0)
    codigo_pedido: str = Field(min_length=1, max_length=50)

    tipo_prenda: str | None = None
    talla: str | None = None
    color: str | None = None

    cantidad: int = Field(gt=0)

    fecha_ingreso: date | None = None
    fecha_entrega: date | None = None

    prioridad: str | None = "Media"

    estado: EstadoPedido = EstadoPedido.PENDIENTE

    observaciones: str | None = None
    fecha_creacion: datetime | None = None

    class Config:
        use_enum_values = True


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
    estado: EstadoPedido

    observaciones: str | None = None
    fecha_creacion: datetime | None = None

    class Config:
        from_attributes = True
        use_enum_values = True