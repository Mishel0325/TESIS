from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.rol_permiso_model import RolPermiso
from app.schemas.rol_permiso_schema import RolPermisoCreate, RolPermisoResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/rol_permiso", tags=["rol_permiso"])

@router.post("/", response_model=RolPermisoResponse)
def create_rel(r: RolPermisoCreate, db: Session = Depends(get_db), current_user=Depends(require_role([1]))):
    db_r = RolPermiso(id_rol=r.id_rol, id_permiso=r.id_permiso)
    db.add(db_r)
    db.commit()
    db.refresh(db_r)
    return db_r

@router.get("/", response_model=list[RolPermisoResponse], dependencies=[Depends(require_role([1,2]))])
def list_rel(db: Session = Depends(get_db)):
    return db.query(RolPermiso).all()
