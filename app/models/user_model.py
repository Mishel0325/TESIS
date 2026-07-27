from sqlalchemy import Column, Integer, String, Enum, TIMESTAMP, Boolean
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "usuarios"

    id_usuario = Column(
        Integer,
        primary_key=True,
        index=True
    )

    nombres = Column(
        String(100),
        nullable=False
    )

    apellidos = Column(
        String(100),
        nullable=False
    )

    correo = Column(
        String(100),
        unique=True,
        nullable=False
    )

    password = Column(
        String(255),
        nullable=False
    )

    id_rol = Column(
        Integer,
        nullable=True
    )

    estado = Column(
        Enum(
            "Activo",
            "Inactivo"
        ),
        default="Activo",
        nullable=True
    )

    requiere_cambio_password = Column(
        Boolean,
        default=True,
        nullable=False
    )

    fecha_creacion = Column(
        TIMESTAMP,
        server_default=func.now(),
        nullable=False
    )