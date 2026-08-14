from datetime import datetime
import re

from pydantic import BaseModel, validator


TELEFONO_RE = re.compile(r"^\d{10}$")
ESTADOS_VALIDOS = {"Activo", "Inactivo"}


def _texto_obligatorio(valor, campo: str) -> str:
    texto = "" if valor is None else str(valor).strip()
    if not texto:
        raise ValueError(f"{campo} es obligatorio")
    return texto


def _validar_telefono(valor) -> str:
    telefono = "" if valor is None else str(valor).strip()
    if not TELEFONO_RE.fullmatch(telefono):
        raise ValueError("El teléfono debe contener exactamente 10 números")
    return telefono


class MaquilaCreate(BaseModel):
    # Se aceptan ambos nombres para mantener compatibilidad con el frontend.
    nombre: str | None = None
    nombre_maquila: str | None = None
    responsable: str
    telefono: str
    direccion: str
    estado: str = "Activo"

    @validator("responsable", pre=True)
    def validar_responsable(cls, valor):
        return _texto_obligatorio(valor, "El responsable")

    @validator("direccion", pre=True)
    def validar_direccion(cls, valor):
        return _texto_obligatorio(valor, "La dirección")

    @validator("telefono", pre=True)
    def validar_telefono(cls, valor):
        return _validar_telefono(valor)

    @validator("estado", pre=True)
    def validar_estado(cls, valor):
        estado = "Activo" if valor is None else str(valor).strip()
        if estado not in ESTADOS_VALIDOS:
            raise ValueError("El estado debe ser Activo o Inactivo")
        return estado


class MaquilaUpdate(BaseModel):
    nombre: str | None = None
    nombre_maquila: str | None = None
    responsable: str | None = None
    telefono: str | None = None
    direccion: str | None = None
    estado: str | None = None

    @validator("responsable", pre=True)
    def validar_responsable(cls, valor):
        if valor is None:
            return None
        return _texto_obligatorio(valor, "El responsable")

    @validator("direccion", pre=True)
    def validar_direccion(cls, valor):
        if valor is None:
            return None
        return _texto_obligatorio(valor, "La dirección")

    @validator("telefono", pre=True)
    def validar_telefono(cls, valor):
        if valor is None:
            return None
        return _validar_telefono(valor)

    @validator("estado", pre=True)
    def validar_estado(cls, valor):
        if valor is None:
            return None
        estado = str(valor).strip()
        if estado not in ESTADOS_VALIDOS:
            raise ValueError("El estado debe ser Activo o Inactivo")
        return estado


class MaquilaResponse(BaseModel):
    id_maquila: int
    nombre: str
    direccion: str | None = None
    responsable: str | None = None
    telefono: str | None = None
    estado: str | None = None
    id_cuenta: int | None = None
    fecha_creacion: datetime

    class Config:
        from_attributes = True
