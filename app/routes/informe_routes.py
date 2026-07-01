from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.informe_model import Informe
from app.models.pedido_model import Pedido
from app.models.seguimiento_model import Seguimiento
from app.schemas.informe_schema import InformeCreate, InformeCreateByCodigo, InformeResponse, InformeDetailResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/informes", tags=["informes"])

@router.post("/", response_model=InformeResponse)
def create_informe(i: InformeCreate, db: Session = Depends(get_db), current_user=Depends(require_role([1]))):
    pedido = db.query(Pedido).filter(Pedido.id_pedido == i.id_pedido).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    db_i = Informe(
        id_pedido=i.id_pedido,
        observaciones_generales=i.observaciones_generales,
        tiempo_planificado=i.tiempo_planificado,
        tiempo_real=i.tiempo_real,
        porcentaje_cumplimiento=i.porcentaje_cumplimiento,
        ruta_pdf=i.ruta_pdf,
    )
    db.add(db_i)
    db.commit()
    db.refresh(db_i)
    return db_i

@router.post("/codigo", response_model=InformeDetailResponse)
def create_informe_por_codigo(i: InformeCreateByCodigo, db: Session = Depends(get_db), current_user=Depends(require_role([1]))):
    pedido = db.query(Pedido).filter(Pedido.codigo_pedido == i.codigo_pedido).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    seguimientos = db.query(Seguimiento).filter(Seguimiento.id_pedido == pedido.id_pedido).order_by(Seguimiento.fecha_inicio).all()

    primeros = [seg for seg in seguimientos if seg.fecha_inicio]
    ultimos = [seg for seg in seguimientos if seg.fecha_fin]
    tiempo_real = 0
    if primeros and ultimos:
        tiempo_real = (ultimos[-1].fecha_fin - primeros[0].fecha_inicio).days
        if tiempo_real < 0:
            tiempo_real = 0

    tiempo_planificado = 0
    if pedido.fecha_ingreso and pedido.fecha_entrega:
        tiempo_planificado = (pedido.fecha_entrega - pedido.fecha_ingreso).days
        if tiempo_planificado < 0:
            tiempo_planificado = 0

    porcentaje_cumplimiento = float(seguimientos[-1].porcentaje_avance) if seguimientos else 0.0
    observaciones_generales = "\n".join(seg.observacion for seg in seguimientos if seg.observacion)

    db_i = Informe(
        id_pedido=pedido.id_pedido,
        observaciones_generales=observaciones_generales or None,
        tiempo_planificado=tiempo_planificado,
        tiempo_real=tiempo_real,
        porcentaje_cumplimiento=porcentaje_cumplimiento,
        ruta_pdf=i.ruta_pdf,
    )
    db.add(db_i)
    db.commit()
    db.refresh(db_i)

    fase_actual = seguimientos[-1].fase if seguimientos else None

    return {
        "id_informe": db_i.id_informe,
        "id_pedido": db_i.id_pedido,
        "fecha_generacion": db_i.fecha_generacion,
        "observaciones_generales": db_i.observaciones_generales,
        "tiempo_planificado": db_i.tiempo_planificado,
        "tiempo_real": db_i.tiempo_real,
        "porcentaje_cumplimiento": db_i.porcentaje_cumplimiento,
        "ruta_pdf": db_i.ruta_pdf,
        "pedido": pedido,
        "maquila": pedido.maquila,
        "fase_actual": fase_actual,
        "seguimientos": seguimientos,
    }

@router.get("/", response_model=list[InformeResponse], dependencies=[Depends(require_role([1,2]))])
def list_informes(db: Session = Depends(get_db)):
    return db.query(Informe).all()

@router.get("/pedido/{codigo_pedido}", response_model=InformeDetailResponse, dependencies=[Depends(require_role([1,2]))])
def informe_por_codigo(codigo_pedido: str, db: Session = Depends(get_db)):
    pedido = db.query(Pedido).filter(Pedido.codigo_pedido == codigo_pedido).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    informe = db.query(Informe).filter(Informe.id_pedido == pedido.id_pedido).order_by(desc(Informe.id_informe)).first()
    if not informe:
        raise HTTPException(status_code=404, detail="Informe no encontrado")

    fase_actual = db.query(Seguimiento).filter(Seguimiento.id_pedido == pedido.id_pedido).order_by(desc(Seguimiento.fecha_inicio), desc(Seguimiento.id_seguimiento)).first()
    seguimientos = db.query(Seguimiento).filter(Seguimiento.id_pedido == pedido.id_pedido).all()

    return {
        "id_informe": informe.id_informe,
        "id_pedido": informe.id_pedido,
        "fecha_generacion": informe.fecha_generacion,
        "observaciones_generales": informe.observaciones_generales,
        "tiempo_planificado": informe.tiempo_planificado,
        "tiempo_real": informe.tiempo_real,
        "porcentaje_cumplimiento": informe.porcentaje_cumplimiento,
        "ruta_pdf": informe.ruta_pdf,
        "pedido": pedido,
        "maquila": pedido.maquila,
        "fase_actual": fase_actual.fase if fase_actual else None,
        "seguimientos": seguimientos,
    }
