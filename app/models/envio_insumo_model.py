from sqlalchemy import Column, Integer, ForeignKey, Date, Numeric
from sqlalchemy.orm import relationship
from app.database import Base

class EnvioInsumo(Base):
    __tablename__ = "envio_insumos"

    id_envio = Column(Integer, primary_key=True, index=True)
    id_pedido = Column(Integer, ForeignKey("pedidos.id_pedido"), nullable=True)
    id_insumo = Column(Integer, ForeignKey("insumos.id_insumo"), nullable=True)
    cantidad = Column(Numeric(10, 2), nullable=True)
    fecha_envio = Column(Date, nullable=True)

    # Relaciones
    pedido = relationship("Pedido", backref="envios_insumos")
    insumo = relationship("Insumo", backref="envios")
