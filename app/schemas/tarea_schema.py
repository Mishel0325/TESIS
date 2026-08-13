from pydantic import BaseModel, Field, field_validator


class TareaCreate(BaseModel):
    id_fase: int = Field(..., gt=0)
    descripcion: str = Field(..., min_length=1)
    maquina: str = Field(..., min_length=1)
    orden: int = Field(..., gt=0)

    @field_validator("descripcion", "maquina")
    @classmethod
    def validar_textos_obligatorios(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor:
            raise ValueError("Este campo es obligatorio y no puede quedar vacío.")
        return valor


class TareaResponse(BaseModel):
    # Tolerante con registros antiguos que puedan tener campos vacíos/NULL.
    id_tarea: int
    id_fase: int
    descripcion: str | None = None
    maquina: str | None = None
    orden: int | None = None

    class Config:
        from_attributes = True
