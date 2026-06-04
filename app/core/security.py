from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.models.user_model import User
from app.database import get_db

SECRET_KEY = "tu_clave_secreta_super_segura"
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Hash y verificación de contraseña
def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

# Crear JWT
def create_access_token(data: dict):
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        correo = payload.get("sub")
        if correo is None:
            return None
        return correo
    except JWTError:
        return None

# Obtener usuario actual
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    correo = verify_token(token)
    if not correo:
        raise HTTPException(status_code=401, detail="Token inválido")
    user = db.query(User).filter(User.correo == correo).first()
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return user

# Verificar rol
def require_role(roles: list[int]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.id_rol not in roles:
            raise HTTPException(status_code=403, detail="No tienes permisos")
        return current_user
    return role_checker