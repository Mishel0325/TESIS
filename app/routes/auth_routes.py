from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.database import get_db
from app.models.user_model import User
from app.core.security import create_access_token
from app.schemas.auth_schema import TokenResponse

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
router = APIRouter(prefix="/auth", tags=["auth"])

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return plain_password == hashed_password

@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    correo = form_data.username
    password = form_data.password

    db_user = db.query(User).filter(User.correo == correo).first()
    if not db_user:
        raise HTTPException(status_code=400, detail="Usuario no encontrado")
    if not verify_password(password, db_user.password):
        raise HTTPException(status_code=400, detail="Contraseña incorrecta")
    if db_user.password == password:
        db_user.password = pwd_context.hash(password)
        db.commit()
        db.refresh(db_user)
    if db_user.estado != "Activo":
        raise HTTPException(status_code=403, detail="Usuario inactivo")

    access_token = create_access_token({"sub": db_user.correo})
    return {"access_token": access_token, "token_type": "bearer"}