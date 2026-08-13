from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, inspect as sqlalchemy_inspect
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.database import get_db
from app.models.informe_model import Informe
from app.models.pedido_model import Pedido
from app.models.seguimiento_model import Seguimiento
from app.schemas.informe_schema import (
    InformeCreate,
    InformeCreateByCodigo,
    InformeDetailResponse,
    InformeResponse,
    InformeUpdate,
)

router = APIRouter(prefix="/informes", tags=["informes"])


def _pedido_por_id_or_404(id_pedido: int, db: Session) -> Pedido:
    pedido = db.query(Pedido).filter(Pedido.id_pedido == id_pedido).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return pedido


def _pedido_por_codigo_or_404(codigo_pedido: str, db: Session) -> Pedido:
    codigo = codigo_pedido.strip()
    pedido = db.query(Pedido).filter(Pedido.codigo_pedido == codigo).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return pedido


def _informe_or_404(id_informe: int, db: Session) -> Informe:
    informe = db.query(Informe).filter(Informe.id_informe == id_informe).first()
    if not informe:
        raise HTTPException(status_code=404, detail="Informe no encontrado")
    return informe


def _seguimientos_pedido(id_pedido: int, db: Session):
    return (
        db.query(Seguimiento)
        .filter(Seguimiento.id_pedido == id_pedido)
        .order_by(Seguimiento.fecha_inicio.asc(), Seguimiento.id_seguimiento.asc())
        .all()
    )


def _calcular_datos_informe(pedido: Pedido, seguimientos: list[Seguimiento]):
    con_inicio = [seg for seg in seguimientos if seg.fecha_inicio]
    con_fin = [seg for seg in seguimientos if seg.fecha_fin]

    tiempo_real = 0
    if con_inicio and con_fin:
        inicio = con_inicio[0].fecha_inicio
        fin = con_fin[-1].fecha_fin
        tiempo_real = max(0, (fin - inicio).days)

    tiempo_planificado = 0
    if pedido.fecha_ingreso and pedido.fecha_entrega:
        tiempo_planificado = max(0, (pedido.fecha_entrega - pedido.fecha_ingreso).days)

    porcentaje_cumplimiento = 0.0
    if seguimientos:
        porcentaje_cumplimiento = float(getattr(seguimientos[-1], "porcentaje_avance", 0) or 0)

    observaciones = []
    for seg in seguimientos:
        valor = getattr(seg, "observacion", None) or getattr(seg, "observaciones", None)
        if valor:
            observaciones.append(str(valor).strip())

    return {
        "tiempo_planificado": tiempo_planificado,
        "tiempo_real": tiempo_real,
        "porcentaje_cumplimiento": min(100.0, max(0.0, porcentaje_cumplimiento)),
        "observaciones_generales": "\n".join(observaciones) or None,
    }


def _modelo_a_dict(modelo):
    if modelo is None:
        return None

    try:
        mapper = sqlalchemy_inspect(modelo).mapper
        return {
            columna.key: getattr(modelo, columna.key)
            for columna in mapper.column_attrs
        }
    except Exception:
        return None


def _detalle(informe: Informe, pedido: Pedido, db: Session):
    seguimientos = _seguimientos_pedido(pedido.id_pedido, db)
    fase_actual = getattr(seguimientos[-1], "fase", None) if seguimientos else None
    maquila = getattr(pedido, "maquila", None)

    return {
        "id_informe": informe.id_informe,
        "id_pedido": informe.id_pedido,
        "fecha_generacion": informe.fecha_generacion,
        "observaciones_generales": informe.observaciones_generales,
        "tiempo_planificado": informe.tiempo_planificado,
        "tiempo_real": informe.tiempo_real,
        "porcentaje_cumplimiento": float(informe.porcentaje_cumplimiento or 0),
        "ruta_pdf": informe.ruta_pdf,
        "pedido": _modelo_a_dict(pedido),
        "maquila": _modelo_a_dict(maquila),
        "fase_actual": _modelo_a_dict(fase_actual),
        "seguimientos": [
            _modelo_a_dict(seg) for seg in seguimientos if seg is not None
        ],
    }


@router.post(
    "/",
    response_model=InformeResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_informe(
    i: InformeCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role([1])),
):
    _pedido_por_id_or_404(i.id_pedido, db)

    db_i = Informe(
        id_pedido=i.id_pedido,
        observaciones_generales=i.observaciones_generales,
        tiempo_planificado=i.tiempo_planificado,
        tiempo_real=i.tiempo_real,
        porcentaje_cumplimiento=i.porcentaje_cumplimiento,
        ruta_pdf=i.ruta_pdf,
    )
    try:
        db.add(db_i)
        db.commit()
        db.refresh(db_i)
        return db_i
    except Exception:
        db.rollback()
        raise


@router.post(
    "/codigo",
    response_model=InformeDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_informe_por_codigo(
    i: InformeCreateByCodigo,
    db: Session = Depends(get_db),
    current_user=Depends(require_role([1])),
):
    pedido = _pedido_por_codigo_or_404(i.codigo_pedido, db)
    seguimientos = _seguimientos_pedido(pedido.id_pedido, db)
    calculados = _calcular_datos_informe(pedido, seguimientos)

    db_i = Informe(
        id_pedido=pedido.id_pedido,
        observaciones_generales=calculados["observaciones_generales"],
        tiempo_planificado=calculados["tiempo_planificado"],
        tiempo_real=calculados["tiempo_real"],
        porcentaje_cumplimiento=calculados["porcentaje_cumplimiento"],
        ruta_pdf=i.ruta_pdf.strip() if i.ruta_pdf else None,
    )
    try:
        db.add(db_i)
        db.commit()
        db.refresh(db_i)
        return _detalle(db_i, pedido, db)
    except Exception:
        db.rollback()
        raise


@router.get(
    "/",
    response_model=list[InformeResponse],
    dependencies=[Depends(require_role([1, 2]))],
)
def list_informes(db: Session = Depends(get_db)):
    return db.query(Informe).order_by(Informe.id_informe.desc()).all()


@router.get(
    "/pedido/{codigo_pedido}",
    response_model=InformeDetailResponse,
    dependencies=[Depends(require_role([1, 2]))],
)
def informe_por_codigo(codigo_pedido: str, db: Session = Depends(get_db)):
    pedido = _pedido_por_codigo_or_404(codigo_pedido, db)
    informe = (
        db.query(Informe)
        .filter(Informe.id_pedido == pedido.id_pedido)
        .order_by(desc(Informe.id_informe))
        .first()
    )
    if not informe:
        raise HTTPException(status_code=404, detail="Informe no encontrado")
    return _detalle(informe, pedido, db)


@router.get(
    "/{id_informe}",
    response_model=InformeResponse,
    dependencies=[Depends(require_role([1, 2]))],
)
def get_informe(id_informe: int, db: Session = Depends(get_db)):
    return _informe_or_404(id_informe, db)


@router.patch("/{id_informe}", response_model=InformeResponse)
@router.put("/{id_informe}", response_model=InformeResponse)
def update_informe(
    id_informe: int,
    i: InformeUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role([1])),
):
    informe = _informe_or_404(id_informe, db)
    cambios = i.model_dump(exclude_unset=True)

    if "observaciones_generales" in cambios and cambios["observaciones_generales"] is not None:
        cambios["observaciones_generales"] = cambios["observaciones_generales"].strip() or None
    if "ruta_pdf" in cambios and cambios["ruta_pdf"] is not None:
        cambios["ruta_pdf"] = cambios["ruta_pdf"].strip() or None

    for campo, valor in cambios.items():
        setattr(informe, campo, valor)

    try:
        db.commit()
        db.refresh(informe)
        return informe
    except Exception:
        db.rollback()
        raise


@router.delete("/{id_informe}")
def delete_informe(
    id_informe: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role([1])),
):
    informe = _informe_or_404(id_informe, db)
    try:
        db.delete(informe)
        db.commit()
        return {"message": "Informe eliminado correctamente", "id_informe": id_informe}
    except Exception:
        db.rollback()
        raise
