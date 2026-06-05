from pydantic import BaseModel

class RoleResponse(BaseModel):
    id_rol: int
    nombre_rol: str
    descripcion: str | None = None

    class Config:
        from_attributes = True
