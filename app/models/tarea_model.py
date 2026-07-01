from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Tarea(Base):
    __tablename__ = "tareas"

    id_tarea = Column(Integer, primary_key=True, index=True)
    id_fase = Column(Integer, ForeignKey("fases.id_fase"), nullable=False)
    descripcion = Column(Text, nullable=True)
    maquina = Column(String(50), nullable=True)
    orden = Column(Integer, nullable=True)
    
    fase = relationship("Fase", back_populates="tareas")
