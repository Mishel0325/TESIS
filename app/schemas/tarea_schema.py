from pydantic import BaseModel

class TareaCreate(BaseModel):
    id_fase: int
    descripcion: str | None = None
    maquina: str | None = None
    orden: int | None = None

class TareaResponse(TareaCreate):
    id_tarea: int

    class Config:
        from_attributes = True
