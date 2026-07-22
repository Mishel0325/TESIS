from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
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
        "detail": (
            "Usa POST /auth/login con username y password "
            "en formato application/x-www-form-urlencoded"
        )
    }


@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    # OAuth2 utiliza el campo username.
    # En este sistema, username representa el correo electrónico.
    correo = form_data.username.strip().lower()
    password = form_data.password

    if not correo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe ingresar el correo electrónico"
        )

    if not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe ingresar la contraseña"
        )

    # Buscar al usuario sin distinguir mayúsculas y minúsculas
    db_user = (
        db.query(User)
        .filter(func.lower(User.correo) == correo)
        .first()
    )

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

    if not db_user.estado or db_user.estado.lower() != "activo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )

    nombre_completo = (
        f"{db_user.nombres} {db_user.apellidos}"
    ).strip()

    access_token = create_access_token(
        data={
            "sub": db_user.correo,
            "id_usuario": db_user.id_usuario,
            "id_rol": db_user.id_rol
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "usuario": {
            # Aquí se utiliza la columna real del modelo
            "id": db_user.id_usuario,
            "nombres": db_user.nombres,
            "apellidos": db_user.apellidos,
            "nombre": nombre_completo,
            "correo": db_user.correo,
            "id_rol": db_user.id_rol,

            "rol": None,

            "estado": db_user.estado
        }
    }