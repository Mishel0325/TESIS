from pydantic import BaseModel

class PermisoCreate(BaseModel):
    nombre_permiso: str
    descripcion: str | None = None

class PermisoResponse(PermisoCreate):
    id_permiso: int

    class Config:
        from_attributes = True
