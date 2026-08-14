from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """Creación de usuario desde el panel administrativo."""

    nombres: str = Field(..., min_length=2, max_length=100)
    apellidos: str = Field(..., min_length=2, max_length=100)
    correo: EmailStr
    password: str = Field(..., min_length=10, max_length=128)
    id_rol: int = Field(..., ge=1)


class UserPublicCreate(BaseModel):
    """Registro desde Login. El cliente no elige rol ni cuenta."""

    nombres: str = Field(..., min_length=2, max_length=100)
    apellidos: str = Field(..., min_length=2, max_length=100)
    correo: EmailStr
    password: str = Field(..., min_length=10, max_length=128)


class UserUpdate(BaseModel):
    nombres: str | None = Field(default=None, min_length=2, max_length=100)
    apellidos: str | None = Field(default=None, min_length=2, max_length=100)
    correo: EmailStr | None = None
    id_rol: int | None = Field(default=None, ge=1)
    estado: str | None = None


class UserResetPassword(BaseModel):
    nueva_password_temporal: str = Field(..., min_length=10, max_length=128)


class CambiarPassword(BaseModel):
    password_actual: str = Field(..., min_length=1, max_length=128)
    nueva_password: str = Field(..., min_length=10, max_length=128)


class CambiarPasswordObligatorio(BaseModel):
    nueva_password: str = Field(..., min_length=10, max_length=128)


class UserResponse(BaseModel):
    id_usuario: int
    nombres: str
    apellidos: str
    correo: EmailStr
    id_rol: int | None
    id_cuenta: int
    estado: str
    requiere_cambio_password: bool
    fecha_creacion: datetime | None

    class Config:
        from_attributes = True
