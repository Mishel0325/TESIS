from pydantic import BaseModel, EmailStr

class UserLogin(BaseModel):
    correo: EmailStr
    password: str

class UserResponse(BaseModel):
    id_usuario: int
    nombres: str
    apellidos: str
    correo: EmailStr
    id_rol: int
    estado: str

    class Config:
        from_attributes = True