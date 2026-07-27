from sqlalchemy import Column, Integer, String, Date, DateTime, Enum, Text
from sqlalchemy.sql import func

from app.database import Base


class Pedido(Base):

    __tablename__ = "pedidos"


    id_pedido = Column(
        Integer,
        primary_key=True,
        index=True
    )


    id_maquila = Column(
        Integer,
        nullable=False
    )


    id_usuario = Column(
        Integer,
        nullable=False
    )


    codigo_pedido = Column(
        String(50),
        unique=True,
        nullable=False
    )


    tipo_prenda = Column(
        String(100),
        nullable=False
    )


    talla = Column(
        String(50),
        nullable=False
    )


    color = Column(
        String(50),
        nullable=False
    )


    cantidad = Column(
        Integer,
        nullable=False
    )


    fecha_ingreso = Column(
        Date,
        nullable=False
    )


    fecha_entrega = Column(
        Date,
        nullable=False
    )


    prioridad = Column(
        Enum(
            "Baja",
            "Media",
            "Alta",
            "Urgente"
        ),
        default="Media",
        nullable=False
    )


    estado = Column(
        Enum(
            "Pendiente",
            "En Produccion",
            "A tiempo",
            "Retrasado",
            "Finalizado",
            "Entregado"
        ),
        default="Pendiente",
        nullable=False
    )


    # Porcentaje de avance del pedido
    progreso = Column(
        Integer,
        default=0,
        nullable=False
    )


    observaciones = Column(
        Text,
        nullable=True
    )


    fecha_creacion = Column(
        DateTime,
        server_default=func.now(),
        nullable=False
    )