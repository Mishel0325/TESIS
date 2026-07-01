"""
Script to populate the prendas, fases, and tareas tables.
Run this from the project root: `python scripts/init_prendas.py`
"""
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.database import SessionLocal
from app.models.prenda_model import Prenda
from app.models.fase_model import Fase
from app.models.tarea_model import Tarea

def main():
    db = SessionLocal()
    try:
        # Crear Prenda 1: CAMISA / BLUSA
        prenda_camisa = Prenda(nombre="CAMISA / BLUSA", descripcion="Proceso de confección de camisas y blusas")
        db.add(prenda_camisa)
        db.flush()
        
        # Fases para camisa
        fase1 = Fase(id_prenda=prenda_camisa.id_prenda, nombre_fase="FUSIONADO", orden=1)
        db.add(fase1)
        db.flush()
        db.add(Tarea(id_fase=fase1.id_fase, descripcion="Preparar y fusionar cuello derecho + izquierdo", maquina="Fusionadora", orden=1))
        
        fase2 = Fase(id_prenda=prenda_camisa.id_prenda, nombre_fase="CUELLO CAMISA", orden=2)
        db.add(fase2)
        db.flush()
        db.add(Tarea(id_fase=fase2.id_fase, descripcion="Sujetar talla en etiqueta", maquina="Mesa", orden=1))
        db.add(Tarea(id_fase=fase2.id_fase, descripcion="Doblar bajo de cuello", maquina="Mesa", orden=2))
        db.add(Tarea(id_fase=fase2.id_fase, descripcion="Armar cuello camisa", maquina="Cosedora", orden=3))
        
        fase3 = Fase(id_prenda=prenda_camisa.id_prenda, nombre_fase="BLANDIS", orden=3)
        db.add(fase3)
        db.flush()
        db.add(Tarea(id_fase=fase3.id_fase, descripcion="Doblar blandis delantero", maquina="Folder", orden=1))
        db.add(Tarea(id_fase=fase3.id_fase, descripcion="Planchar blandis", maquina="Planchadora", orden=2))
        
        fase4 = Fase(id_prenda=prenda_camisa.id_prenda, nombre_fase="MANGA", orden=4)
        db.add(fase4)
        db.flush()
        db.add(Tarea(id_fase=fase4.id_fase, descripcion="Doblar bajo de manga", maquina="Folder", orden=1))
        
        fase5 = Fase(id_prenda=prenda_camisa.id_prenda, nombre_fase="ENSAMBLE", orden=5)
        db.add(fase5)
        db.flush()
        db.add(Tarea(id_fase=fase5.id_fase, descripcion="Unir hombro", maquina="Cosedora", orden=1))
        db.add(Tarea(id_fase=fase5.id_fase, descripcion="Pegar mangas", maquina="Cosedora", orden=2))
        db.add(Tarea(id_fase=fase5.id_fase, descripcion="Cerrar costado", maquina="Cosedora", orden=3))
        
        fase6 = Fase(id_prenda=prenda_camisa.id_prenda, nombre_fase="OJAL Y PULIDO", orden=6)
        db.add(fase6)
        db.flush()
        db.add(Tarea(id_fase=fase6.id_fase, descripcion="Hacer ojal", maquina="Ojaleadora", orden=1))
        db.add(Tarea(id_fase=fase6.id_fase, descripcion="Pegar botones", maquina="Botonadora", orden=2))
        
        fase7 = Fase(id_prenda=prenda_camisa.id_prenda, nombre_fase="PLANCHAR Y CALIDAD", orden=7)
        db.add(fase7)
        db.flush()
        db.add(Tarea(id_fase=fase7.id_fase, descripcion="Planchar blusa", maquina="Planchadora", orden=1))
        db.add(Tarea(id_fase=fase7.id_fase, descripcion="Revisar final", maquina="Mesa", orden=2))
        
        # Crear Prenda 2: PANTALÓN
        prenda_pantalon = Prenda(nombre="PANTALÓN", descripcion="Proceso de confección de pantalones")
        db.add(prenda_pantalon)
        db.flush()
        
        # Fases para pantalón
        fase_p1 = Fase(id_prenda=prenda_pantalon.id_prenda, nombre_fase="FUSIONADO", orden=1)
        db.add(fase_p1)
        db.flush()
        db.add(Tarea(id_fase=fase_p1.id_fase, descripcion="Fusionar delantero pretina", maquina="Fusionadora", orden=1))
        db.add(Tarea(id_fase=fase_p1.id_fase, descripcion="Fusionar posterior", maquina="Fusionadora", orden=2))
        
        fase_p2 = Fase(id_prenda=prenda_pantalon.id_prenda, nombre_fase="PRETINA B", orden=2)
        db.add(fase_p2)
        db.flush()
        db.add(Tarea(id_fase=fase_p2.id_fase, descripcion="Pegar etiqueta", maquina="Cosedora", orden=1))
        db.add(Tarea(id_fase=fase_p2.id_fase, descripcion="Armar pretina", maquina="Cosedora", orden=2))
        
        fase_p3 = Fase(id_prenda=prenda_pantalon.id_prenda, nombre_fase="POSTERIOR", orden=3)
        db.add(fase_p3)
        db.flush()
        db.add(Tarea(id_fase=fase_p3.id_fase, descripcion="Armar pinza posterior", maquina="Cosedora", orden=1))
        
        # Crear Prenda 3: CHAQUETA
        prenda_chaqueta = Prenda(nombre="CHAQUETA", descripcion="Proceso de confección de chaquetas")
        db.add(prenda_chaqueta)
        db.flush()
        
        # Fases para chaqueta
        fase_ch1 = Fase(id_prenda=prenda_chaqueta.id_prenda, nombre_fase="FUSIONADO", orden=1)
        db.add(fase_ch1)
        db.flush()
        db.add(Tarea(id_fase=fase_ch1.id_fase, descripcion="Fusionar blandis escote", maquina="Fusionadora", orden=1))
        
        fase_ch2 = Fase(id_prenda=prenda_chaqueta.id_prenda, nombre_fase="DELANTERO ESCOTE", orden=2)
        db.add(fase_ch2)
        db.flush()
        db.add(Tarea(id_fase=fase_ch2.id_fase, descripcion="Armar pinza delantero", maquina="Cosedora", orden=1))
        db.add(Tarea(id_fase=fase_ch2.id_fase, descripcion="Cerrar costado", maquina="Cosedora", orden=2))
        
        fase_ch3 = Fase(id_prenda=prenda_chaqueta.id_prenda, nombre_fase="ESPALDA", orden=3)
        db.add(fase_ch3)
        db.flush()
        db.add(Tarea(id_fase=fase_ch3.id_fase, descripcion="Unir línea C", maquina="Cosedora", orden=1))
        db.add(Tarea(id_fase=fase_ch3.id_fase, descripcion="Ribetear línea C", maquina="Cosedora", orden=2))
        
        db.commit()
        print("Prendas, fases y tareas cargadas correctamente.")
    except Exception as e:
        db.rollback()
        print("Error cargando datos:", e)
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == '__main__':
    main()
