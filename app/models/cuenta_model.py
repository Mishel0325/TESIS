from sqlalchemy import Column, Integer, String, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Cuenta(Base):
    """Espacio de trabajo independiente de una cuenta de Maquila System."""

    __tablename__ = "cuentas"

    id_cuenta = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    nombre = Column(String(150), nullable=False)
    fecha_creacion = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    usuarios = relationship("User", back_populates="cuenta")
