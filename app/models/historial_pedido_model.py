from sqlalchemy import Column, Integer, ForeignKey, String, Text, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class HistorialPedido(Base):
    __tablename__ = "historial_pedidos"

    id_historial = Column(Integer, primary_key=True, index=True)
    id_pedido = Column(Integer, ForeignKey("pedidos.id_pedido"), nullable=True)
    estado_anterior = Column(String(50), nullable=True)
    estado_nuevo = Column(String(50), nullable=True)
    observacion = Column(Text, nullable=True)
    fecha = Column(TIMESTAMP, server_default=func.now(), nullable=True)

    # Relaciones
    pedido = relationship("Pedido", backref="historial")
