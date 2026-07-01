from pydantic import BaseModel

class PrendaCreate(BaseModel):
    nombre: str
    descripcion: str | None = None

class PrendaResponse(PrendaCreate):
    id_prenda: int

    class Config:
        from_attributes = True
