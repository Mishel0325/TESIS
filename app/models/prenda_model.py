from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship
from app.database import Base

class Prenda(Base):
    __tablename__ = "prendas"

    id_prenda = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(Text, nullable=True)
    
    fases = relationship("Fase", back_populates="prenda", cascade="all, delete-orphan")
