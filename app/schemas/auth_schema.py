from pydantic import BaseModel, EmailStr, root_validator

class UserLogin(BaseModel):
    correo: EmailStr | None = None
    email: EmailStr | None = None
    password: str

    @root_validator(pre=True)
    def ensure_correo_or_email(cls, values):
        if isinstance(values, (bytes, str)):
            try:
                import json
                values = json.loads(values)
            except Exception:
                raise ValueError("Cuerpo JSON inválido")
        correo = values.get("correo") or values.get("email")
        if correo is None:
            raise ValueError("Se requiere 'correo' o 'email'")
        values["correo"] = correo
        return values

class UserResponse(BaseModel):
    id_usuario: int
    nombres: str
    apellidos: str
    correo: EmailStr
    id_rol: int
    estado: str

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

    class Config:
        from_attributes = True