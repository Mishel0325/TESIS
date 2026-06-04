from sqlalchemy import Column, Integer, String, ForeignKey, TIMESTAMP
from app.database import Base

class Pedido(Base):
    __tablename__ = "pedidos"

    id_pedido = Column(Integer, primary_key=True, index=True)
    id_maquila = Column(Integer, ForeignKey("maquilas.id_maquila"))
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"))
    descripcion = Column(String(255))
    estado = Column(String(50))
    fecha_creacion = Column(TIMESTAMP)