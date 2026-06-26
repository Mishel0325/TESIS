from sqlalchemy import Column, Integer, ForeignKey, String, Text, TIMESTAMP, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Informe(Base):
    __tablename__ = "informes"

    id_informe = Column(Integer, primary_key=True, index=True)
    id_pedido = Column(Integer, ForeignKey("pedidos.id_pedido"), nullable=True)
    fecha_generacion = Column(TIMESTAMP, server_default=func.now(), nullable=True)
    observaciones_generales = Column(Text, nullable=True)
    tiempo_planificado = Column(Integer, nullable=True)
    tiempo_real = Column(Integer, nullable=True)
    porcentaje_cumplimiento = Column(Numeric(5, 2), nullable=True)
    ruta_pdf = Column(String(255), nullable=True)

    # Relaciones
    pedido = relationship("Pedido", backref="informes")
