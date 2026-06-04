# app/core/dependencies.py

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer

from app.database import get_db
from app.models.user_model import User
from app.core.security import verify_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    correo = verify_token(token)
    if correo is None:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    user = db.query(User).filter(User.correo == correo).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return user

def require_role(required_roles: list[int]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.id_rol not in required_roles:
            raise HTTPException(status_code=403, detail="No autorizado")
        return current_user
    return role_checker