from pydantic import BaseModel
from datetime import datetime

class MaquilaCreate(BaseModel):
    nombre: str
    direccion: str | None = None
    estado: str | None = "Activo"

class MaquilaResponse(MaquilaCreate):
    id_maquila: int
    fecha_creacion: datetime

    class Config:
        from_attributes = True