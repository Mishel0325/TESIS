from datetime import date

from pydantic import BaseModel, Field, field_validator, model_validator


class ControlCalidadCreate(BaseModel):
    id_pedido: int = Field(..., gt=0)
    fecha_revision: date
    cantidad_buena: int = Field(..., ge=0)
    cantidad_defectuosa: int = Field(..., ge=0)
    observaciones: str = Field(..., min_length=1)

    @field_validator("observaciones")
    @classmethod
    def validar_observaciones(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor:
            raise ValueError("Las observaciones son obligatorias.")
        return valor

    @model_validator(mode="after")
    def validar_total_revisado(self):
        if self.cantidad_buena + self.cantidad_defectuosa <= 0:
            raise ValueError("Debe registrar al menos una unidad revisada.")
        return self


class ControlCalidadUpdate(BaseModel):
    id_pedido: int | None = Field(default=None, gt=0)
    fecha_revision: date | None = None
    cantidad_buena: int | None = Field(default=None, ge=0)
    cantidad_defectuosa: int | None = Field(default=None, ge=0)
    observaciones: str | None = Field(default=None, min_length=1)

    @field_validator("observaciones")
    @classmethod
    def validar_observaciones_si_se_envian(
        cls,
        valor: str | None,
    ) -> str | None:
        if valor is None:
            return None
        valor = valor.strip()
        if not valor:
            raise ValueError("Las observaciones no pueden quedar vacías.")
        return valor


class ControlCalidadResponse(BaseModel):
    id_control: int
    id_pedido: int
    fecha_revision: date
    cantidad_buena: int = 0
    cantidad_defectuosa: int = 0
    observaciones: str | None = None

    class Config:
        from_attributes = True
