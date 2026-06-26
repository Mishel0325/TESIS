from pydantic import BaseModel

class RolPermisoCreate(BaseModel):
    id_rol: int
    id_permiso: int

class RolPermisoResponse(RolPermisoCreate):
    id: int

    class Config:
        from_attributes = True
