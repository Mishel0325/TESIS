from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, Numeric, Enum, Text
from sqlalchemy.orm import relationship
from app.database import Base

class Seguimiento(Base):
    __tablename__ = "seguimiento"

    id_seguimiento = Column(Integer, primary_key=True, index=True)
    id_pedido = Column(Integer, ForeignKey("pedidos.id_pedido"), nullable=True)
    id_fase = Column(Integer, ForeignKey("fases.id_fase"), nullable=True)
    porcentaje_avance = Column(Numeric(5, 2), nullable=True, default=0.00)
    fecha_inicio = Column(DateTime, nullable=True)
    fecha_fin = Column(DateTime, nullable=True)
    estado = Column(Enum('Pendiente', 'En Proceso', 'Finalizado', 'Retrasado'), nullable=True)
    observacion = Column(Text, nullable=True)

    # Relaciones
    pedido = relationship("Pedido", backref="seguimientos")
    fase = relationship("Fase", backref="seguimientos")
