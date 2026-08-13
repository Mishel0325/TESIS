from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.database import get_db
from app.models.insumo_model import Insumo
from app.schemas.insumo_schema import InsumoCreate, InsumoResponse, InsumoUpdate

router = APIRouter(prefix="/insumos", tags=["insumos"])


def _get_insumo_or_404(id_insumo: int, db: Session) -> Insumo:
    insumo = db.query(Insumo).filter(Insumo.id_insumo == id_insumo).first()
    if not insumo:
        raise HTTPException(status_code=404, detail="Insumo no encontrado.")
    return insumo


@router.post(
    "/",
    response_model=InsumoResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_insumo(
    i: InsumoCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role([1])),
):
    nombre = i.nombre_insumo.strip()
    if not nombre:
        raise HTTPException(status_code=400, detail="El nombre del insumo es obligatorio.")

    existente = (
        db.query(Insumo)
        .filter(Insumo.nombre_insumo.ilike(nombre))
        .first()
    )
    if existente:
        raise HTTPException(
            status_code=409,
            detail="Ya existe un insumo registrado con ese nombre.",
        )

    db_i = Insumo(
        nombre_insumo=nombre,
        unidad_medida=i.unidad_medida.strip() if i.unidad_medida else None,
        stock_actual=i.stock_actual,
        stock_minimo=i.stock_minimo,
    )

    try:
        db.add(db_i)
        db.commit()
        db.refresh(db_i)
        return db_i
    except Exception:
        db.rollback()
        raise


@router.get(
    "/",
    response_model=list[InsumoResponse],
    dependencies=[Depends(require_role([1, 2]))],
)
def list_insumos(db: Session = Depends(get_db)):
    return db.query(Insumo).order_by(Insumo.id_insumo.asc()).all()


@router.get(
    "/{id_insumo}",
    response_model=InsumoResponse,
    dependencies=[Depends(require_role([1, 2]))],
)
def get_insumo(id_insumo: int, db: Session = Depends(get_db)):
    return _get_insumo_or_404(id_insumo, db)


@router.patch("/{id_insumo}", response_model=InsumoResponse)
@router.put("/{id_insumo}", response_model=InsumoResponse)
def update_insumo(
    id_insumo: int,
    i: InsumoUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role([1])),
):
    insumo = _get_insumo_or_404(id_insumo, db)
    cambios = i.model_dump(exclude_unset=True)

    if "nombre_insumo" in cambios and cambios["nombre_insumo"] is not None:
        nombre = cambios["nombre_insumo"].strip()
        if not nombre:
            raise HTTPException(status_code=400, detail="El nombre del insumo es obligatorio.")

        duplicado = (
            db.query(Insumo)
            .filter(
                Insumo.id_insumo != id_insumo,
                Insumo.nombre_insumo.ilike(nombre),
            )
            .first()
        )
        if duplicado:
            raise HTTPException(
                status_code=409,
                detail="Ya existe otro insumo registrado con ese nombre.",
            )
        cambios["nombre_insumo"] = nombre

    if "unidad_medida" in cambios and cambios["unidad_medida"] is not None:
        cambios["unidad_medida"] = cambios["unidad_medida"].strip() or None

    for campo, valor in cambios.items():
        setattr(insumo, campo, valor)

    try:
        db.commit()
        db.refresh(insumo)
        return insumo
    except Exception:
        db.rollback()
        raise
