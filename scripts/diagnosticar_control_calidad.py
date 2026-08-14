"""Diagnóstico NO destructivo de registros incompletos de control_calidad.

Ejecutar desde la raíz del proyecto:
    python scripts/diagnosticar_control_calidad.py
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import inspect, text
from app.database import engine


def main():
    insp = inspect(engine)

    if "control_calidad" not in insp.get_table_names():
        print("ERROR: no existe la tabla control_calidad.")
        return

    columnas = {c["name"] for c in insp.get_columns("control_calidad")}
    columnas_mostrar = [
        c for c in [
            "id_control",
            "id_pedido",
            "fecha_revision",
            "cantidad_buena",
            "cantidad_defectuosa",
            "observaciones",
            "id_cuenta",
        ]
        if c in columnas
    ]

    sql = (
        f"SELECT {', '.join(columnas_mostrar)} "
        "FROM control_calidad "
        "WHERE id_pedido IS NULL OR fecha_revision IS NULL "
        "ORDER BY id_control"
    )

    with engine.connect() as conn:
        filas = conn.execute(text(sql)).mappings().all()

    print("")
    print("REGISTROS HISTÓRICOS INCOMPLETOS DE CONTROL DE CALIDAD")
    print("------------------------------------------------------")

    if not filas:
        print("No existen registros con id_pedido o fecha_revision NULL.")
        return

    print(f"Encontrados: {len(filas)}")
    for fila in filas:
        print(dict(fila))

    print("")
    print("Este script NO elimina ni modifica nada.")
    print(
        "El control_calidad_routes.py corregido simplemente excluye estos "
        "registros incompletos del listado para que la API no vuelva a dar 500."
    )


if __name__ == "__main__":
    main()
