from datetime import date

from pydantic import BaseModel, Field


class EnvioInsumoCreate(BaseModel):
    id_pedido: int | None = Field(default=None, gt=0)
    id_insumo: int = Field(..., gt=0)
    cantidad: float = Field(..., gt=0)
    fecha_envio: date


class EnvioInsumoResponse(BaseModel):
    id_envio: int
    id_pedido: int | None = None
    id_insumo: int | None = None
    cantidad: float | None = None
    fecha_envio: date | None = None

    class Config:
        from_attributes = True
