from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.archivo_pedido_model import ArchivoPedido
from app.schemas.archivo_pedido_schema import ArchivoPedidoCreate, ArchivoPedidoResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/archivos", tags=["archivos"])

@router.post("/", response_model=ArchivoPedidoResponse)
def upload_archivo(a: ArchivoPedidoCreate, db: Session = Depends(get_db), current_user=Depends(require_role([1]))):
    db_a = ArchivoPedido(
        id_pedido=a.id_pedido,
        nombre_archivo=a.nombre_archivo,
        ruta_archivo=a.ruta_archivo,
    )
    db.add(db_a)
    db.commit()
    db.refresh(db_a)
    return db_a

@router.get("/", response_model=list[ArchivoPedidoResponse], dependencies=[Depends(require_role([1,2]))])
def list_archivos(db: Session = Depends(get_db)):
    return db.query(ArchivoPedido).all()
