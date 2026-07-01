from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Fase(Base):
    __tablename__ = "fases"

    id_fase = Column(Integer, primary_key=True, index=True)
    id_prenda = Column(Integer, ForeignKey("prendas.id_prenda"), nullable=False)
    nombre_fase = Column(String(100), nullable=True)
    orden = Column(Integer, nullable=True)
    
    prenda = relationship("Prenda", back_populates="fases")
    tareas = relationship("Tarea", back_populates="fase", cascade="all, delete-orphan")
