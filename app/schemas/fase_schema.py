from pydantic import BaseModel

class FaseCreate(BaseModel):
    nombre_fase: str | None = None
    descripcion: str | None = None

class FaseResponse(FaseCreate):
    id_fase: int

    class Config:
        from_attributes = True
