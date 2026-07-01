"""
Script to update the `fases` table with the pantalones workflow.
Run this from the project root: `python scripts/update_fases.py`
"""
# Commit note: updated on 2026-06-30 to include pantalones fases script
from app.database import SessionLocal
from app.models.fase_model import Fase

new_fases = [
    {"nombre_fase": "Armado de pinzas", "descripcion": "Proceso de armado de pinzas para pantalones"},
    {"nombre_fase": "Pegado pelon", "descripcion": "Aplicación y pegado de pelón"},
    {"nombre_fase": "Regresa a planta para bolsillos posteriores", "descripcion": "Reingreso a planta para agregar bolsillos posteriores"},
    {"nombre_fase": "Devolucion", "descripcion": "Control de devolución y correcciones"},
]


def main():
    db = SessionLocal()
    try:
        # Remove existing fases
        db.query(Fase).delete()
        # Insert new fases
        for f in new_fases:
            db_f = Fase(nombre_fase=f["nombre_fase"], descripcion=f["descripcion"])
            db.add(db_f)
        db.commit()
        print("Fases actualizadas correctamente.")
    except Exception as e:
        db.rollback()
        print("Error actualizando fases:", e)
    finally:
        db.close()


if __name__ == '__main__':
    main()
