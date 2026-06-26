from sqlalchemy import Column, Integer, ForeignKey, Date, Text
from sqlalchemy.orm import relationship
from app.database import Base

class ControlCalidad(Base):
    __tablename__ = "control_calidad"

    id_control = Column(Integer, primary_key=True, index=True)
    id_pedido = Column(Integer, ForeignKey("pedidos.id_pedido"), nullable=True)
    fecha_revision = Column(Date, nullable=True)
    cantidad_buena = Column(Integer, nullable=True)
    cantidad_defectuosa = Column(Integer, nullable=True)
    observaciones = Column(Text, nullable=True)

    # Relaciones
    pedido = relationship("Pedido", backref="controles_calidad")
