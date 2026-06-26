from pydantic import BaseModel
from datetime import date

class EnvioInsumoCreate(BaseModel):
    id_pedido: int | None = None
    id_insumo: int | None = None
    cantidad: float | None = 0.0
    fecha_envio: date | None = None

class EnvioInsumoResponse(EnvioInsumoCreate):
    id_envio: int

    class Config:
        from_attributes = True
