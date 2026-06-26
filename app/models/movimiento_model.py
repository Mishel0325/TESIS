from sqlalchemy import Column, Integer, ForeignKey, Enum, TIMESTAMP, Numeric, Text
from sqlalchemy.sql import func
from app.database import Base

class MovimientoInventario(Base):
    __tablename__ = "movimientos_inventario"

    id_movimiento = Column(Integer, primary_key=True, index=True)
    id_insumo = Column(Integer, ForeignKey("insumos.id_insumo"), nullable=True)
    tipo = Column(Enum('ENTRADA', 'SALIDA'), nullable=True)
    cantidad = Column(Numeric(10, 2), nullable=True)
    observacion = Column(Text, nullable=True)
    fecha = Column(TIMESTAMP, server_default=func.now(), nullable=True)
