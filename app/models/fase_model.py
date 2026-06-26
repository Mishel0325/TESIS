from sqlalchemy import Column, Integer, String
from app.database import Base

class Fase(Base):
    __tablename__ = "fases"

    id_fase = Column(Integer, primary_key=True, index=True)
    nombre_fase = Column(String(50), nullable=True)
    descripcion = Column(String(255), nullable=True)
