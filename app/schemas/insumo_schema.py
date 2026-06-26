from pydantic import BaseModel

class InsumoCreate(BaseModel):
    nombre_insumo: str
    unidad_medida: str | None = None
    stock_actual: float | None = 0.0
    stock_minimo: float | None = 0.0

class InsumoResponse(InsumoCreate):
    id_insumo: int

    class Config:
        from_attributes = True
