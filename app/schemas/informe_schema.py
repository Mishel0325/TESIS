from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class InformeCreate(BaseModel):
    id_pedido: int = Field(..., gt=0)
    observaciones_generales: str | None = None
    tiempo_planificado: int | None = Field(default=None, ge=0)
    tiempo_real: int | None = Field(default=None, ge=0)
    porcentaje_cumplimiento: float | None = Field(default=None, ge=0, le=100)
    ruta_pdf: str | None = None


class InformeCreateByCodigo(BaseModel):
    codigo_pedido: str
    ruta_pdf: str | None = None


class InformeUpdate(BaseModel):
    observaciones_generales: str | None = None
    tiempo_planificado: int | None = Field(default=None, ge=0)
    tiempo_real: int | None = Field(default=None, ge=0)
    porcentaje_cumplimiento: float | None = Field(default=None, ge=0, le=100)
    ruta_pdf: str | None = None


class InformeResponse(InformeCreate):
    id_informe: int
    fecha_generacion: datetime | None = None

    class Config:
        from_attributes = True


class InformeDetailResponse(InformeResponse):
    # Se usan diccionarios tolerantes para evitar errores 500 de validación
    # cuando los modelos Pedido/Maquila/Fase cambian o agregan campos.
    pedido: dict[str, Any] | None = None
    maquila: dict[str, Any] | None = None
    fase_actual: dict[str, Any] | None = None
    seguimientos: list[dict[str, Any]] | None = None

    class Config:
        from_attributes = True
