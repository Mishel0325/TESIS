from pydantic import BaseModel
from datetime import date
from app.schemas.maquila_schema import MaquilaResponse
from app.schemas.pedido_schema import PedidoResponse

class AsignacionCreate(BaseModel):
    id_pedido: int
    maquila_id: int | None = None
    fecha_asignacion: date | None = None

class AsignacionResponse(AsignacionCreate):
    id_asignacion: int
    maquila: MaquilaResponse | None = None
    pedido: PedidoResponse | None = None

    class Config:
        from_attributes = True
