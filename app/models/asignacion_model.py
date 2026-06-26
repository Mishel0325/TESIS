from sqlalchemy import Column, Integer, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.database import Base

class AsignacionPedido(Base):
    __tablename__ = "asignacion_pedidos"

    id_asignacion = Column(Integer, primary_key=True, index=True)
    id_pedido = Column(Integer, ForeignKey("pedidos.id_pedido"), nullable=False)
    fecha_asignacion = Column(Date, nullable=True)
    maquila_id = Column(Integer, ForeignKey("maquilas.id_maquila"), nullable=True)

    # Relaciones
    pedido = relationship("Pedido", backref="asignaciones")
    maquila = relationship("Maquila", backref="asignaciones")
