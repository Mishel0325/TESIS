from sqlalchemy import Column, Integer, ForeignKey, String, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class ArchivoPedido(Base):
    __tablename__ = "archivos_pedido"

    id_archivo = Column(Integer, primary_key=True, index=True)
    id_pedido = Column(Integer, ForeignKey("pedidos.id_pedido"), nullable=True)
    nombre_archivo = Column(String(255), nullable=True)
    ruta_archivo = Column(String(255), nullable=True)
    fecha_subida = Column(TIMESTAMP, server_default=func.now(), nullable=True)

    # Relaciones
    pedido = relationship("Pedido", backref="archivos")
