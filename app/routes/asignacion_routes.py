from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.asignacion_model import AsignacionPedido
from app.models.pedido_model import Pedido
from app.schemas.asignacion_schema import AsignacionCreate, AsignacionResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/asignaciones", tags=["asignaciones"])

@router.post("/", response_model=AsignacionResponse)
def create_asignacion(a: AsignacionCreate, db: Session = Depends(get_db), current_user=Depends(require_role([1]))):
    # Validar que el pedido existe
    pedido = db.query(Pedido).filter(Pedido.id_pedido == a.id_pedido).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    # Si el pedido ya tiene una maquila asignada y se intenta asignar otra, validar coherencia
    if pedido.id_maquila and a.maquila_id and pedido.id_maquila != a.maquila_id:
        raise HTTPException(status_code=400, detail="La maquila asignada no coincide con la del pedido")
    
    # Si no se proporciona maquila_id, usar la del pedido si existe
    maquila_id_final = a.maquila_id or pedido.id_maquila
    
    db_a = AsignacionPedido(
        id_pedido=a.id_pedido,
        fecha_asignacion=a.fecha_asignacion,
        maquila_id=maquila_id_final,
    )
    db.add(db_a)
    db.commit()
    db.refresh(db_a)
    return db_a

@router.get("/", response_model=list[AsignacionResponse], dependencies=[Depends(require_role([1,2]))])
def list_asignaciones(db: Session = Depends(get_db)):
    return db.query(AsignacionPedido).all()
