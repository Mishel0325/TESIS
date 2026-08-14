from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from passlib.context import CryptContext
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.core.security import create_access_token, verify_password
from app.database import get_db
from app.models.cuenta_model import Cuenta
from app.models.user_model import User
from app.schemas.auth_schema import TokenResponse
from app.schemas.user_schema import (
    CambiarPasswordObligatorio,
    UserPublicCreate,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

PASSWORD_ERROR = (
    "La contraseña debe tener al menos 10 caracteres e incluir una mayúscula, "
    "una minúscula, un número y un símbolo."
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def validar_password_segura(password: str) -> None:
    if (
        len(password) < 10
        or not any(c.isupper() for c in password)
        or not any(c.islower() for c in password)
        or not any(c.isdigit() for c in password)
        or not any(not c.isalnum() and not c.isspace() for c in password)
    ):
        raise HTTPException(status_code=400, detail=PASSWORD_ERROR)


def serializar_usuario(usuario: User) -> dict:
    return {
        "id": usuario.id_usuario,
        "nombres": usuario.nombres,
        "apellidos": usuario.apellidos,
        "nombre": f"{usuario.nombres} {usuario.apellidos}".strip(),
        "correo": usuario.correo,
        "id_rol": usuario.id_rol,
        "id_cuenta": usuario.id_cuenta,
        "rol": "Supervisor" if usuario.id_rol == 1 else "Consultor",
        "estado": usuario.estado,
        "requiere_cambio_password": bool(usuario.requiere_cambio_password),
    }


def crear_token_usuario(usuario: User) -> str:
    return create_access_token(
        data={
            "sub": usuario.correo,
            "id_usuario": usuario.id_usuario,
            "id_rol": usuario.id_rol,
            "id_cuenta": usuario.id_cuenta,
            "requiere_cambio_password": bool(usuario.requiere_cambio_password),
        }
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
    db: Session = Depends(get_db),
):
    correo = form_data.username.strip().lower()
    password = form_data.password

    if not correo:
        raise HTTPException(status_code=400, detail="Debe ingresar el correo electrónico.")
    if not password:
        raise HTTPException(status_code=400, detail="Debe ingresar la contraseña.")

    # /auth/login no está tenant-filtrado: el correo sigue siendo único globalmente.
    db_user = db.query(User).filter(func.lower(User.correo) == correo).first()

    if not db_user or not verify_password(password, db_user.password):
        raise HTTPException(status_code=400, detail="Correo o contraseña incorrectos.")

    if not db_user.estado or db_user.estado.lower() != "activo":
        raise HTTPException(status_code=403, detail="Usuario inactivo.")

    if not db_user.id_cuenta:
        raise HTTPException(
            status_code=409,
            detail=(
                "La cuenta del usuario todavía no fue migrada. "
                "Ejecute scripts/migrar_multicuenta.py y vuelva a iniciar sesión."
            ),
        )

    return {
        "access_token": crear_token_usuario(db_user),
        "token_type": "bearer",
        "usuario": serializar_usuario(db_user),
    }


@router.post("/registro", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def registro_publico(datos: UserPublicCreate, db: Session = Depends(get_db)):
    """Crea una CUENTA NUEVA y su Supervisor desde el Login.

    Por diseño, esta cuenta comienza sin pedidos, maquilas, prendas, fases, tareas,
    insumos, revisiones, informes ni archivos.
    """

    nombres = datos.nombres.strip()
    apellidos = datos.apellidos.strip()
    correo = str(datos.correo).strip().lower()

    if not nombres:
        raise HTTPException(status_code=400, detail="Los nombres son obligatorios.")
    if not apellidos:
        raise HTTPException(status_code=400, detail="Los apellidos son obligatorios.")

    validar_password_segura(datos.password)

    existe = db.query(User).filter(func.lower(User.correo) == correo).first()
    if existe:
        raise HTTPException(status_code=409, detail="Correo ya registrado.")

    cuenta = Cuenta(
        codigo=f"ACC-{uuid4().hex[:16].upper()}",
        nombre=f"Espacio de {nombres} {apellidos}"[:150],
    )

    try:
        db.add(cuenta)
        db.flush()  # necesitamos id_cuenta antes de crear el Supervisor

        usuario = User(
            nombres=nombres,
            apellidos=apellidos,
            correo=correo,
            password=hash_password(datos.password),
            id_rol=1,
            id_cuenta=cuenta.id_cuenta,
            estado="Activo",
            requiere_cambio_password=False,
        )

        db.add(usuario)
        db.commit()
        db.refresh(usuario)
        return usuario
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Correo ya registrado.")
    except Exception:
        db.rollback()
        raise


@router.post("/cambiar-password", response_model=TokenResponse)
def cambiar_password_obligatorio(
    datos: CambiarPasswordObligatorio,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([1, 2])),
):
    usuario = (
        db.query(User)
        .filter(
            User.id_usuario == current_user.id_usuario,
            User.id_cuenta == current_user.id_cuenta,
        )
        .first()
    )
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    validar_password_segura(datos.nueva_password)

    if verify_password(datos.nueva_password, usuario.password):
        raise HTTPException(
            status_code=400,
            detail="La nueva contraseña debe ser diferente a la contraseña temporal.",
        )

    usuario.password = hash_password(datos.nueva_password)
    usuario.requiere_cambio_password = False

    try:
        db.commit()
        db.refresh(usuario)
    except Exception:
        db.rollback()
        raise

    return {
        "access_token": crear_token_usuario(usuario),
        "token_type": "bearer",
        "usuario": serializar_usuario(usuario),
    }
