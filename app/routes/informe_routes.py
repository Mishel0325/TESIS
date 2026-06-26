from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.informe_model import Informe
from app.schemas.informe_schema import InformeCreate, InformeResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/informes", tags=["informes"])

@router.post("/", response_model=InformeResponse)
def create_informe(i: InformeCreate, db: Session = Depends(get_db), current_user=Depends(require_role([1]))):
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

@router.get("/", response_model=list[InformeResponse], dependencies=[Depends(require_role([1,2]))])
def list_informes(db: Session = Depends(get_db)):
    return db.query(Informe).all()
