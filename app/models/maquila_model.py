from sqlalchemy import Column, Integer, String, Enum, TIMESTAMP
from sqlalchemy.sql import func
from app.database import Base

class Maquila(Base):
    __tablename__ = "maquilas"

    id_maquila = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    direccion = Column(String(255))
    estado = Column(Enum('Activo','Inactivo'), default='Activo', nullable=True)
    fecha_creacion = Column(TIMESTAMP, server_default=func.now(), nullable=False)