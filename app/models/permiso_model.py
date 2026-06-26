from sqlalchemy import Column, Integer, String
from app.database import Base

class Permiso(Base):
    __tablename__ = "permisos"

    id_permiso = Column(Integer, primary_key=True, index=True)
    nombre_permiso = Column(String(100), nullable=False)
    descripcion = Column(String(255), nullable=True)
