from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.database import get_db
from app.models.user_model import User
from pydantic import BaseModel, EmailStr

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
router = APIRouter(prefix="/auth", tags=["auth"])

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

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return plain_password == hashed_password

@router.post("/login", response_model=UserResponse)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.correo == user.correo).first()
    if not db_user:
        raise HTTPException(status_code=400, detail="Usuario no encontrado")
    if not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=400, detail="Contraseña incorrecta")
    if db_user.password == user.password:
        db_user.password = pwd_context.hash(user.password)
        db.commit()
        db.refresh(db_user)
    if db_user.estado != "Activo":
        raise HTTPException(status_code=403, detail="Usuario inactivo")
    return db_user