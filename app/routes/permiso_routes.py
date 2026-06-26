from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.permiso_model import Permiso
from app.schemas.permiso_schema import PermisoCreate, PermisoResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/permisos", tags=["permisos"])

@router.post("/", response_model=PermisoResponse)
def create_permiso(p: PermisoCreate, db: Session = Depends(get_db), current_user=Depends(require_role([1]))):
    db_p = Permiso(nombre_permiso=p.nombre_permiso, descripcion=p.descripcion)
    db.add(db_p)
    db.commit()
    db.refresh(db_p)
    return db_p

@router.get("/", response_model=list[PermisoResponse], dependencies=[Depends(require_role([1,2]))])
def list_permisos(db: Session = Depends(get_db)):
    return db.query(Permiso).all()
