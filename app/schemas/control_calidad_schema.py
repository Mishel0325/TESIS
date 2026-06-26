from pydantic import BaseModel
from datetime import date

class ControlCalidadCreate(BaseModel):
    id_pedido: int | None = None
    fecha_revision: date | None = None
    cantidad_buena: int | None = None
    cantidad_defectuosa: int | None = None
    observaciones: str | None = None

class ControlCalidadResponse(ControlCalidadCreate):
    id_control: int

    class Config:
        from_attributes = True
