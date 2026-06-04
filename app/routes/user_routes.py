from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user_model import User
from app.schemas.user_schema import UserCreate, UserResponse
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
router = APIRouter(prefix="/users", tags=["users"])

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

@router.post("/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.correo == user.correo).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Correo ya registrado")
    
    hashed_pwd = hash_password(user.password)
    db_user = User(
        nombres=user.nombres,
        apellidos=user.apellidos,
        correo=user.correo,
        password=hashed_pwd,
        id_rol=user.id_rol
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()