from pydantic import BaseModel

class FaseCreate(BaseModel):
    id_prenda: int
    nombre_fase: str | None = None
    orden: int | None = None

class FaseResponse(FaseCreate):
    id_fase: int

    class Config:
        from_attributes = True
