from fastapi import APIRouter, Depends, HTTPException, status
from passlib.context import CryptContext
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.database import get_db
from app.models.user_model import User
from app.schemas.user_schema import (
    CambiarPassword,
    UserCreate,
    UserResetPassword,
    UserResponse,
    UserUpdate,
)

router = APIRouter(prefix="/users", tags=["users"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

PASSWORD_ERROR = (
    "La contraseña debe tener al menos 10 caracteres e incluir una mayúscula, "
    "una minúscula, un número y un símbolo."
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verificar_password(password_plano: str, password_hash: str) -> bool:
    return pwd_context.verify(password_plano, password_hash)


def validar_password_segura(password: str) -> None:
    if (
        len(password) < 10
        or not any(c.isupper() for c in password)
        or not any(c.islower() for c in password)
        or not any(c.isdigit() for c in password)
        or not any(not c.isalnum() and not c.isspace() for c in password)
    ):
        raise HTTPException(status_code=400, detail=PASSWORD_ERROR)


def limpiar_texto(valor: str, campo: str) -> str:
    limpio = valor.strip()
    if not limpio:
        raise HTTPException(status_code=400, detail=f"{campo} es obligatorio.")
    return limpio


def correo_existente_global(db: Session, correo: str, excluir_id: int | None = None):
    # El correo es UNIQUE a nivel de toda la base, por eso esta comprobación
    # ignora deliberadamente el filtro multicuenta.
    consulta = (
        db.query(User)
        .execution_options(ignorar_cuenta=True)
        .filter(func.lower(User.correo) == correo.lower())
    )
    if excluir_id is not None:
        consulta = consulta.filter(User.id_usuario != excluir_id)
    return consulta.first()


def usuario_or_404(db: Session, id_usuario: int, id_cuenta: int) -> User:
    usuario = (
        db.query(User)
        .filter(
            User.id_usuario == id_usuario,
            User.id_cuenta == id_cuenta,
        )
        .first()
    )
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado en esta cuenta.")
    return usuario


def contar_supervisores_activos(db: Session, id_cuenta: int) -> int:
    return (
        db.query(User)
        .filter(
            User.id_cuenta == id_cuenta,
            User.id_rol == 1,
            func.lower(User.estado) == "activo",
        )
        .count()
    )


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([1])),
):
    """Crea un usuario DENTRO de la misma cuenta del Supervisor."""

    nombres = limpiar_texto(user.nombres, "Los nombres")
    apellidos = limpiar_texto(user.apellidos, "Los apellidos")
    correo = str(user.correo).strip().lower()

    if user.id_rol not in (1, 2):
        raise HTTPException(
            status_code=400,
            detail="El rol debe ser Supervisor (1) o Consultor (2).",
        )

    validar_password_segura(user.password)

    if correo_existente_global(db, correo):
        raise HTTPException(status_code=409, detail="Correo ya registrado.")

    usuario = User(
        nombres=nombres,
        apellidos=apellidos,
        correo=correo,
        password=hash_password(user.password),
        id_rol=user.id_rol,
        id_cuenta=current_user.id_cuenta,
        estado="Activo",
        requiere_cambio_password=True,
    )

    try:
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


@router.get("/", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([1])),
):
    return (
        db.query(User)
        .filter(User.id_cuenta == current_user.id_cuenta)
        .order_by(User.id_usuario.asc())
        .all()
    )


@router.get("/{id_usuario}", response_model=UserResponse)
def get_user(
    id_usuario: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([1])),
):
    return usuario_or_404(db, id_usuario, current_user.id_cuenta)


@router.patch("/{id_usuario}", response_model=UserResponse)
@router.put("/{id_usuario}", response_model=UserResponse)
def update_user(
    id_usuario: int,
    datos: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([1])),
):
    usuario = usuario_or_404(db, id_usuario, current_user.id_cuenta)
    cambios = datos.model_dump(exclude_unset=True)

    if "nombres" in cambios and cambios["nombres"] is not None:
        cambios["nombres"] = limpiar_texto(cambios["nombres"], "Los nombres")

    if "apellidos" in cambios and cambios["apellidos"] is not None:
        cambios["apellidos"] = limpiar_texto(cambios["apellidos"], "Los apellidos")

    if "correo" in cambios and cambios["correo"] is not None:
        nuevo_correo = str(cambios["correo"]).strip().lower()
        if correo_existente_global(db, nuevo_correo, excluir_id=id_usuario):
            raise HTTPException(status_code=409, detail="Ese correo ya pertenece a otro usuario.")
        cambios["correo"] = nuevo_correo

    if "id_rol" in cambios and cambios["id_rol"] is not None:
        if cambios["id_rol"] not in (1, 2):
            raise HTTPException(
                status_code=400,
                detail="El rol debe ser Supervisor (1) o Consultor (2).",
            )
        if (
            usuario.id_rol == 1
            and cambios["id_rol"] != 1
            and contar_supervisores_activos(db, current_user.id_cuenta) <= 1
        ):
            raise HTTPException(
                status_code=400,
                detail="No se puede quitar el rol al último Supervisor activo de esta cuenta.",
            )

    if "estado" in cambios and cambios["estado"] is not None:
        estado = cambios["estado"].strip().capitalize()
        if estado not in ("Activo", "Inactivo"):
            raise HTTPException(status_code=400, detail="El estado debe ser Activo o Inactivo.")
        if (
            usuario.id_rol == 1
            and estado == "Inactivo"
            and contar_supervisores_activos(db, current_user.id_cuenta) <= 1
        ):
            raise HTTPException(
                status_code=400,
                detail="No se puede desactivar al último Supervisor activo de esta cuenta.",
            )
        cambios["estado"] = estado

    for campo, valor in cambios.items():
        setattr(usuario, campo, valor)

    try:
        db.commit()
        db.refresh(usuario)
        return usuario
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Ese correo ya está registrado.")
    except Exception:
        db.rollback()
        raise


@router.post("/{id_usuario}/restablecer-password")
def reset_password(
    id_usuario: int,
    datos: UserResetPassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([1])),
):
    usuario = usuario_or_404(db, id_usuario, current_user.id_cuenta)
    validar_password_segura(datos.nueva_password_temporal)

    usuario.password = hash_password(datos.nueva_password_temporal)
    usuario.requiere_cambio_password = True

    try:
        db.commit()
        return {
            "mensaje": (
                "Contraseña temporal restablecida. El usuario deberá cambiarla "
                "en el próximo ingreso."
            ),
            "id_usuario": usuario.id_usuario,
        }
    except Exception:
        db.rollback()
        raise


@router.put("/cambiar-password/actual")
def cambiar_password_voluntario(
    datos: CambiarPassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([1, 2])),
):
    usuario = usuario_or_404(db, current_user.id_usuario, current_user.id_cuenta)

    if not verificar_password(datos.password_actual, usuario.password):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta.")

    validar_password_segura(datos.nueva_password)

    if verificar_password(datos.nueva_password, usuario.password):
        raise HTTPException(
            status_code=400,
            detail="La nueva contraseña debe ser diferente a la actual.",
        )

    usuario.password = hash_password(datos.nueva_password)
    usuario.requiere_cambio_password = False

    try:
        db.commit()
        return {"mensaje": "Contraseña actualizada correctamente."}
    except Exception:
        db.rollback()
        raise


@router.delete("/{id_usuario}")
def delete_user(
    id_usuario: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([1])),
):
    usuario = usuario_or_404(db, id_usuario, current_user.id_cuenta)

    if usuario.id_usuario == current_user.id_usuario:
        raise HTTPException(
            status_code=400,
            detail="No puede eliminar su propia cuenta mientras está autenticado.",
        )

    if (
        usuario.id_rol == 1
        and contar_supervisores_activos(db, current_user.id_cuenta) <= 1
    ):
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar al último Supervisor activo de esta cuenta.",
        )

    try:
        db.delete(usuario)
        db.commit()
        return {"mensaje": "Usuario eliminado correctamente.", "id_usuario": id_usuario}
    except Exception:
        db.rollback()
        raise
