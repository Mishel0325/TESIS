
from __future__ import annotations

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import inspect, text
from app.database import engine

TABLA = "maquilas"


def q(nombre: str) -> str:
    return engine.dialect.identifier_preparer.quote_identifier(nombre)


insp = inspect(engine)
if TABLA not in insp.get_table_names():
    raise SystemExit("No existe la tabla 'maquilas' en la base de datos configurada.")

columnas = {col["name"] for col in insp.get_columns(TABLA)}
pendientes = []
if "responsable" not in columnas:
    pendientes.append(("responsable", "VARCHAR(120) NULL"))
if "telefono" not in columnas:
    pendientes.append(("telefono", "VARCHAR(30) NULL"))

if not pendientes:
    print("La tabla maquilas ya tiene las columnas responsable y telefono. No se hicieron cambios.")
    raise SystemExit(0)

with engine.begin() as conn:
    for nombre, tipo in pendientes:
        conn.execute(text(f"ALTER TABLE {q(TABLA)} ADD COLUMN {q(nombre)} {tipo}"))
        print(f"Columna agregada: {nombre}")

print("Migración terminada. No se eliminó ni modificó ningún registro existente.")
