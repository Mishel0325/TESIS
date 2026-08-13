from pydantic import BaseModel, Field, field_validator


class FaseCreate(BaseModel):
    id_prenda: int = Field(..., gt=0)
    nombre_fase: str = Field(..., min_length=1)
    orden: int = Field(..., gt=0)

    @field_validator("nombre_fase")
    @classmethod
    def validar_nombre_fase(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor:
            raise ValueError("El nombre de la fase es obligatorio.")
        return valor


class FaseResponse(BaseModel):
    # Tolerante con datos antiguos; las nuevas altas/ediciones sí usan FaseCreate estricto.
    id_fase: int
    id_prenda: int
    nombre_fase: str | None = None
    orden: int | None = None

    class Config:
        from_attributes = True
