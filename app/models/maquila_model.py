from sqlalchemy import Column, Enum, ForeignKey, Integer, String, TIMESTAMP
from sqlalchemy.sql import func

from app.database import Base


class Maquila(Base):
    __tablename__ = "maquilas"

    id_maquila = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    direccion = Column(String(255), nullable=False)

    # Datos de contacto del taller / maquila.
    responsable = Column(String(120), nullable=True)
    telefono = Column(String(30), nullable=True)

    # Cada registro pertenece a la cuenta que lo creó.
    id_cuenta = Column(
        Integer,
        ForeignKey("cuentas.id_cuenta"),
        nullable=False,
        index=True,
    )

    estado = Column(
        Enum("Activo", "Inactivo"),
        default="Activo",
        nullable=False,
    )

    fecha_creacion = Column(
        TIMESTAMP,
        server_default=func.now(),
        nullable=False,
    )
