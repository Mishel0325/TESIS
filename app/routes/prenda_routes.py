from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.prenda_model import Prenda
from app.schemas.prenda_schema import PrendaCreate, PrendaResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/prendas", tags=["prendas"])

@router.post("/", response_model=PrendaResponse)
def create_prenda(prenda: PrendaCreate, db: Session = Depends(get_db), current_user=Depends(require_role([1]))):
    db_prenda = Prenda(nombre=prenda.nombre, descripcion=prenda.descripcion)
    db.add(db_prenda)
    db.commit()
    db.refresh(db_prenda)
    return db_prenda

@router.get("/", response_model=list[PrendaResponse], dependencies=[Depends(require_role([1,2]))])
def list_prendas(db: Session = Depends(get_db)):
    return db.query(Prenda).all()

@router.get("/{id_prenda}", response_model=PrendaResponse, dependencies=[Depends(require_role([1,2]))])
def get_prenda(id_prenda: int, db: Session = Depends(get_db)):
    prenda = db.query(Prenda).filter(Prenda.id_prenda == id_prenda).first()
    if not prenda:
        raise ValueError("Prenda no encontrada")
    return prenda

@router.put("/{id_prenda}", response_model=PrendaResponse)
def update_prenda(id_prenda: int, prenda: PrendaCreate, db: Session = Depends(get_db), current_user=Depends(require_role([1]))):
    db_prenda = db.query(Prenda).filter(Prenda.id_prenda == id_prenda).first()
    if not db_prenda:
        raise ValueError("Prenda no encontrada")
    db_prenda.nombre = prenda.nombre
    db_prenda.descripcion = prenda.descripcion
    db.commit()
    db.refresh(db_prenda)
    return db_prenda

@router.delete("/{id_prenda}")
def delete_prenda(id_prenda: int, db: Session = Depends(get_db), current_user=Depends(require_role([1]))):
    db_prenda = db.query(Prenda).filter(Prenda.id_prenda == id_prenda).first()
    if not db_prenda:
        raise ValueError("Prenda no encontrada")
    db.delete(db_prenda)
    db.commit()
    return {"message": "Prenda eliminada"}
