from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.tarea_model import Tarea
from app.schemas.tarea_schema import TareaCreate, TareaResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/tareas", tags=["tareas"])

@router.post("/", response_model=TareaResponse)
def create_tarea(tarea: TareaCreate, db: Session = Depends(get_db), current_user=Depends(require_role([1]))):
    db_tarea = Tarea(id_fase=tarea.id_fase, descripcion=tarea.descripcion, maquina=tarea.maquina, orden=tarea.orden)
    db.add(db_tarea)
    db.commit()
    db.refresh(db_tarea)
    return db_tarea

@router.get("/", response_model=list[TareaResponse], dependencies=[Depends(require_role([1,2]))])
def list_tareas(db: Session = Depends(get_db)):
    return db.query(Tarea).all()

@router.get("/{id_tarea}", response_model=TareaResponse, dependencies=[Depends(require_role([1,2]))])
def get_tarea(id_tarea: int, db: Session = Depends(get_db)):
    tarea = db.query(Tarea).filter(Tarea.id_tarea == id_tarea).first()
    if not tarea:
        raise ValueError("Tarea no encontrada")
    return tarea

@router.get("/fase/{id_fase}", response_model=list[TareaResponse], dependencies=[Depends(require_role([1,2]))])
def get_tareas_by_fase(id_fase: int, db: Session = Depends(get_db)):
    return db.query(Tarea).filter(Tarea.id_fase == id_fase).order_by(Tarea.orden).all()

@router.put("/{id_tarea}", response_model=TareaResponse)
def update_tarea(id_tarea: int, tarea: TareaCreate, db: Session = Depends(get_db), current_user=Depends(require_role([1]))):
    db_tarea = db.query(Tarea).filter(Tarea.id_tarea == id_tarea).first()
    if not db_tarea:
        raise ValueError("Tarea no encontrada")
    db_tarea.id_fase = tarea.id_fase
    db_tarea.descripcion = tarea.descripcion
    db_tarea.maquina = tarea.maquina
    db_tarea.orden = tarea.orden
    db.commit()
    db.refresh(db_tarea)
    return db_tarea

@router.delete("/{id_tarea}")
def delete_tarea(id_tarea: int, db: Session = Depends(get_db), current_user=Depends(require_role([1]))):
    db_tarea = db.query(Tarea).filter(Tarea.id_tarea == id_tarea).first()
    if not db_tarea:
        raise ValueError("Tarea no encontrada")
    db.delete(db_tarea)
    db.commit()
    return {"message": "Tarea eliminada"}
