from pydantic import BaseModel, Field, field_validator


class InsumoCreate(BaseModel):
    nombre_insumo: str = Field(..., min_length=1, max_length=100)
    unidad_medida: str = Field(..., min_length=1, max_length=20)
    stock_actual: float = Field(..., ge=0)
    stock_minimo: float = Field(..., ge=0)

    @field_validator("nombre_insumo", "unidad_medida")
    @classmethod
    def validar_texto_obligatorio(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor:
            raise ValueError("Este campo es obligatorio y no puede contener solo espacios.")
        return valor


class InsumoUpdate(BaseModel):
    nombre_insumo: str | None = Field(default=None, min_length=1, max_length=100)
    unidad_medida: str | None = Field(default=None, min_length=1, max_length=20)
    stock_actual: float | None = Field(default=None, ge=0)
    stock_minimo: float | None = Field(default=None, ge=0)

    @field_validator("nombre_insumo", "unidad_medida")
    @classmethod
    def validar_texto_si_se_envia(cls, valor: str | None) -> str | None:
        if valor is None:
            return None
        valor = valor.strip()
        if not valor:
            raise ValueError("Este campo no puede quedar vacío.")
        return valor


class InsumoResponse(BaseModel):
    # Se mantiene tolerante para no romper registros antiguos que puedan tener NULL.
    id_insumo: int
    nombre_insumo: str
    unidad_medida: str | None = None
    stock_actual: float | None = 0.0
    stock_minimo: float | None = 0.0

    class Config:
        from_attributes = True
