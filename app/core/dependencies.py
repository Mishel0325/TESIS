from typing import Callable, List

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.database import get_db
from app.models.user_model import User


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/login"
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido, expirado o no enviado",
        headers={
            "WWW-Authenticate": "Bearer"
        }
    )

    payload = decode_access_token(token)

    if not payload:
        raise credentials_exception

    correo = payload.get("sub")

    if not correo:
        raise credentials_exception

    usuario = (
        db.query(User)
        .filter(
            func.lower(User.correo)
            == str(correo).strip().lower()
        )
        .first()
    )

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El usuario del token no existe",
            headers={
                "WWW-Authenticate": "Bearer"
            }
        )

    estado_usuario = getattr(
        usuario.estado,
        "value",
        usuario.estado
    )

    if (
        not estado_usuario
        or str(estado_usuario).lower() != "activo"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )

    return usuario


def require_role(
    roles_permitidos: List[int]
) -> Callable:
    def role_checker(
        current_user: User = Depends(
            get_current_user
        )
    ) -> User:
        if current_user.id_rol is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El usuario no tiene un rol asignado"
            )

        if current_user.id_rol not in roles_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para esta acción"
            )

        return current_user

    return role_checker