from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.maquila_model import Maquila

router = APIRouter(prefix="/maquilas", tags=["maquilas"])

@router.get("/")
def list_maquilas(db: Session = Depends(get_db)):
    return db.query(Maquila).all()