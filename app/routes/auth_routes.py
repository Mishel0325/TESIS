from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.database import get_db
from app.models.user_model import User
from app.schemas.auth_schema import TokenResponse

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)

@router.get("/login")
def login_info():
    return {
        "detail": "Usa POST /auth/login con username y password (form-data)"
    }

@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):

    correo = form_data.username
    password = form_data.password

    db_user = db.query(User).filter(User.correo == correo).first()

    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario no encontrado"
        )

    if not verify_password(password, db_user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contraseña incorrecta"
        )

    if db_user.estado is None or db_user.estado.lower() != "activo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )

    access_token = create_access_token(
        data={"sub": db_user.correo}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }