from datetime import datetime
from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    nombres: str
    apellidos: str
    correo: EmailStr
    password: str
    id_rol: int

class UserResponse(BaseModel):
    id_usuario: int
    nombres: str
    apellidos: str
    correo: EmailStr
    id_rol: int
    estado: str
    fecha_creacion: datetime | None

    class Config:
        from_attributes = True