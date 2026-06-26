from sqlalchemy import Column, Integer, String, Numeric
from app.database import Base

class Insumo(Base):
    __tablename__ = "insumos"

    id_insumo = Column(Integer, primary_key=True, index=True)
    nombre_insumo = Column(String(100), nullable=False)
    unidad_medida = Column(String(20), nullable=True)
    stock_actual = Column(Numeric(10, 2), nullable=True)
    stock_minimo = Column(Numeric(10, 2), nullable=True)
