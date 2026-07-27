from datetime import datetime
import secrets
import string

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.database import get_db
from app.models.user_model import User
from app.schemas.user_schema import (
    UserCreate,
    UserResponse,
    CambiarPassword
)

from app.core.dependencies import require_role

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)



router = APIRouter(
    prefix="/users",
    tags=["users"]
)



def hash_password(password: str):

    return pwd_context.hash(password)



def verificar_password(
    password_plano,
    password_hash
):

    return pwd_context.verify(
        password_plano,
        password_hash
    )



def generar_password_temporal():

    caracteres = (
        string.ascii_letters +
        string.digits
    )

    return "".join(
        secrets.choice(caracteres)
        for _ in range(10)
    )

# ==================================================
# CREAR USUARIO
# ==================================================

@router.post(
    "/",
    response_model=UserResponse
)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([1]))
):


    existe = db.query(User).filter(
        User.correo == user.correo
    ).first()


    if existe:

        raise HTTPException(
            status_code=400,
            detail="Correo ya registrado"
        )


    password_temporal = (
        user.password
        if user.password
        else generar_password_temporal()
    )


    usuario = User(

        nombres=user.nombres,

        apellidos=user.apellidos,

        correo=user.correo,

        password=hash_password(
            password_temporal
        ),

        id_rol=user.id_rol,

        estado="Activo",

        requiere_cambio_password=True,

        fecha_creacion=datetime.utcnow()

    )

    db.add(usuario)

    db.commit()

    db.refresh(usuario)



    return usuario

# ==================================================
# LISTAR USUARIOS
# ==================================================

@router.get(
    "/",
    response_model=list[UserResponse]
)
def list_users(

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_role([1,2])
    )

):

    return db.query(User).all()

# ==================================================
# CAMBIAR PASSWORD PRIMER INGRESO
# ==================================================

@router.put(
    "/cambiar-password"
)
def cambiar_password(

    datos: CambiarPassword,

    db: Session = Depends(get_db),

    current_user: User = Depends()

):


    usuario = db.query(User).filter(
        User.id_usuario ==
        current_user.id_usuario
    ).first()



    if not usuario:

        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado"
        )

    if not verificar_password(
        datos.password_actual,
        usuario.password
    ):
        raise HTTPException(
            status_code=400,
            detail="Contraseña actual incorrecta"
        )

    usuario.password = hash_password(
        datos.nueva_password
    )
    usuario.requiere_cambio_password = False

    db.commit()
    return {

        "mensaje":
        "Contraseña actualizada correctamente"

    }