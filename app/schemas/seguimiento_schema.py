from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


EstadoSeguimiento = Literal[
    "Pendiente",
    "En Producción",
    "Finalizado",
    "Retrasado",
]


class SeguimientoBase(BaseModel):
    id_pedido: int = Field(..., gt=0)
    id_fase: int = Field(..., gt=0)
    porcentaje_avance: float = Field(..., ge=0, le=100)
    fecha_inicio: datetime
    fecha_fin: datetime
    estado: EstadoSeguimiento
    observacion: str = Field(..., min_length=1, max_length=1000)

    @field_validator("observacion")
    @classmethod
    def limpiar_observacion(cls, valor: str):
        texto = valor.strip()
        if not texto:
            raise ValueError("La observación es obligatoria.")
        return texto

    @model_validator(mode="after")
    def validar_fechas(self):
        if self.fecha_fin < self.fecha_inicio:
            raise ValueError(
                "La fecha de fin no puede ser anterior a la fecha de inicio."
            )
        return self


class SeguimientoCreate(SeguimientoBase):
    pass


class SeguimientoUpdate(BaseModel):
    id_pedido: int | None = Field(default=None, gt=0)
    id_fase: int | None = Field(default=None, gt=0)
    porcentaje_avance: float | None = Field(default=None, ge=0, le=100)
    fecha_inicio: datetime | None = None
    fecha_fin: datetime | None = None
    estado: EstadoSeguimiento | None = None
    observacion: str | None = Field(default=None, min_length=1, max_length=1000)

    @field_validator("observacion")
    @classmethod
    def limpiar_observacion_si_se_envia(cls, valor: str | None):
        if valor is None:
            return None
        texto = valor.strip()
        if not texto:
            raise ValueError("La observación no puede quedar vacía.")
        return texto


class SeguimientoResponse(BaseModel):
    id_seguimiento: int
    id_pedido: int
    id_fase: int | None = None
    porcentaje_avance: float | None = None
    fecha_inicio: datetime | None = None
    fecha_fin: datetime | None = None
    estado: EstadoSeguimiento | None = None
    observacion: str | None = None

    class Config:
        from_attributes = True
