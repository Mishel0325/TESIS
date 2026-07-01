from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.fase_model import Fase
from app.schemas.fase_schema import FaseCreate, FaseResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/fases", tags=["fases"])

@router.post("/", response_model=FaseResponse)
def create_fase(fase: FaseCreate, db: Session = Depends(get_db), current_user=Depends(require_role([1]))):
    db_fase = Fase(id_prenda=fase.id_prenda, nombre_fase=fase.nombre_fase, orden=fase.orden)
    db.add(db_fase)
    db.commit()
    db.refresh(db_fase)
    return db_fase

@router.get("/", response_model=list[FaseResponse], dependencies=[Depends(require_role([1,2]))])
def list_fases(db: Session = Depends(get_db)):
    return db.query(Fase).all()

@router.get("/{id_fase}", response_model=FaseResponse, dependencies=[Depends(require_role([1,2]))])
def get_fase(id_fase: int, db: Session = Depends(get_db)):
    fase = db.query(Fase).filter(Fase.id_fase == id_fase).first()
    if not fase:
        raise ValueError("Fase no encontrada")
    return fase

@router.get("/prenda/{id_prenda}", response_model=list[FaseResponse], dependencies=[Depends(require_role([1,2]))])
def get_fases_by_prenda(id_prenda: int, db: Session = Depends(get_db)):
    return db.query(Fase).filter(Fase.id_prenda == id_prenda).order_by(Fase.orden).all()

@router.put("/{id_fase}", response_model=FaseResponse)
def update_fase(id_fase: int, fase: FaseCreate, db: Session = Depends(get_db), current_user=Depends(require_role([1]))):
    db_fase = db.query(Fase).filter(Fase.id_fase == id_fase).first()
    if not db_fase:
        raise ValueError("Fase no encontrada")
    db_fase.id_prenda = fase.id_prenda
    db_fase.nombre_fase = fase.nombre_fase
    db_fase.orden = fase.orden
    db.commit()
    db.refresh(db_fase)
    return db_fase

@router.delete("/{id_fase}")
def delete_fase(id_fase: int, db: Session = Depends(get_db), current_user=Depends(require_role([1]))):
    db_fase = db.query(Fase).filter(Fase.id_fase == id_fase).first()
    if not db_fase:
        raise ValueError("Fase no encontrada")
    db.delete(db_fase)
    db.commit()
    return {"message": "Fase eliminada"}
