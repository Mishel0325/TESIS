from typing import Optional

from pydantic import BaseModel


class UsuarioSesion(BaseModel):
    id: int
    nombres: str
    apellidos: str
    nombre: str
    correo: str
    id_rol: Optional[int] = None
    rol: Optional[str] = None
    estado: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    usuario: UsuarioSesion