from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.fase_model import Fase
from app.schemas.fase_schema import FaseCreate, FaseResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/fases", tags=["fases"])

@router.post("/", response_model=FaseResponse)
def create_fase(f: FaseCreate, db: Session = Depends(get_db), current_user=Depends(require_role([1]))):
    db_f = Fase(nombre_fase=f.nombre_fase, descripcion=f.descripcion)
    db.add(db_f)
    db.commit()
    db.refresh(db_f)
    return db_f

@router.get("/", response_model=list[FaseResponse], dependencies=[Depends(require_role([1,2]))])
def list_fases(db: Session = Depends(get_db)):
    return db.query(Fase).all()
