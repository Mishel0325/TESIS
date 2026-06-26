from sqlalchemy import Column, Integer, String, ForeignKey, TIMESTAMP, Date, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Pedido(Base):
    __tablename__ = "pedidos"

    id_pedido = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"))
    id_maquila = Column(Integer, ForeignKey("maquilas.id_maquila"))
    fecha_creacion = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    codigo_pedido = Column(String(50), nullable=False)
    tipo_prenda = Column(String(100), nullable=True)
    talla = Column(String(20), nullable=True)
    color = Column(String(50), nullable=True)
    cantidad = Column(Integer, nullable=False)
    fecha_ingreso = Column(Date, nullable=True)
    fecha_entrega = Column(Date, nullable=True)
    prioridad = Column(Enum('Baja', 'Media', 'Alta'), default='Media', nullable=True)
    estado = Column(Enum('Pendiente', 'A tiempo', 'Retrasado'), default='Pendiente', nullable=True)
    observaciones = Column(Text, nullable=True)

    # Relaciones
    maquila = relationship("Maquila", backref="pedidos")
    usuario = relationship("User", backref="pedidos")