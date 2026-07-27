from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):

    nombres: str

    apellidos: str

    correo: EmailStr

    password: str | None = None

    id_rol: int


class UserResponse(BaseModel):

    id_usuario: int

    nombres: str

    apellidos: str

    correo: EmailStr

    id_rol: int | None

    estado: str

    requiere_cambio_password: bool

    fecha_creacion: datetime | None


    class Config:
        from_attributes = True

class CambiarPassword(BaseModel):

    password_actual: str

    nueva_password: str