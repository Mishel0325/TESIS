from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import get_current_user
from app.models.user_model import User


def get_current_user_dependency():
    return get_current_user


def require_role(roles: list[int]):
    def role_checker(current_user: User = Depends(get_current_user)):

        if current_user.id_rol not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos"
            )

        return current_user

    return role_checker