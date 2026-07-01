"""
Script to update the `fases` table with the detailed workflow structure.
Run this from the project root: `python scripts/update_fases.py`
"""
import sys
from pathlib import Path

from sqlalchemy import text

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.database import SessionLocal
from app.models.fase_model import Fase

new_fases = [
    {
        "codigo_fase": "1",
        "nombre_fase": "1 CAMISA / BLUSA",
        "descripcion": "Categoría principal para camisa y blusa."
    },
    {
        "codigo_fase": "1.1",
        "nombre_fase": "1.1 FUSIONADO",
        "descripcion": "- Preparar y fusionar cuello una sola pieza derecho + izquierdo “papel” -M."
    },
    {
        "codigo_fase": "1.2",
        "nombre_fase": "1.2 CUELLO CAMISA 1 SOLA PIEZA",
        "descripcion": "- Sujetar talla en etiqueta + contar -B.\n- Doblar bajo de pie de cuello 3 piezas pelón completo -B.\n- Poner medida en cuello 1 sola pieza uno x uno.\n- Armar cuello camisa 1 sola pieza + pespunte de vencimiento “molde lija”.\n- Cortar puntas de cuello camisa completo + virar + piquete en esquinas x2.\n- Planchar cuello camisa 1 sola pieza + bajo para asentar + marcar cuello x3 -M."
    },
    {
        "codigo_fase": "1.3",
        "nombre_fase": "1.3 BLANDIS",
        "descripcion": "- Doblar blandís delantero + recoger “Folder” 75 cm a 77 cm.\n- Planchar blandís blusa camisa x2 -B.\n- Revisar + afinar blandís blusa camisera + igualar bajo -M."
    },
    {
        "codigo_fase": "1.4",
        "nombre_fase": "1.4 MANGA",
        "descripcion": "- Doblar bajo de manga corta 2 cm x2 abierta “Folder”."
    },
    {
        "codigo_fase": "1.5",
        "nombre_fase": "1.5 ENSAMBLE",
        "descripcion": "- Unir hombro grande 21 a 27 cm de blusa.\n- Cortar cadena x2 de hombro -B.\n- Pegar mangas blusa mg 3/4.\n- Sujetar costura de costado para overlock x2.\n- Cerrar costado blusa + marquilla sin tajo mg 3/4.\n- Rematar costura bajo de manga x2 + meter cadena.\n- Asentar cuello camisa 1 sola pieza costura recta.\n- Doblar bajo de blusa con medida 1.5 cm.\n- Pegar etiqueta 2 costuras en espalda puntada escondida -M."
    },
    {
        "codigo_fase": "1.6",
        "nombre_fase": "1.6 OJAL Y PULIDO",
        "descripcion": "- Hacer ojal x5 delantero.\n- Señalar para botón x5.\n- Pegar botón 4 huecos x5 + 1 de reserva.\n- Pulir + revisar blusa quimona manga corta."
    },
    {
        "codigo_fase": "1.7",
        "nombre_fase": "1.7 PLANCHAR Y CALIDAD",
        "descripcion": "- Planchar blusa kimona abierta cuello sport manga corta.\n- Revisado final blusa abrochando x8 botones -B."
    },
    {
        "codigo_fase": "2",
        "nombre_fase": "2 PANTALÓN",
        "descripcion": "Categoría principal para pantalón."
    },
    {
        "codigo_fase": "2.1",
        "nombre_fase": "2.1 FUSIONADO",
        "descripcion": "- Preparar y fusionar delantero pretina B con doble refuerzo derecho + lado izquierdo.\n- Preparar y fusionar posterior derecho + posterior izquierdo + vivo bolsillo x4 posterior + DESPEGAR -M."
    },
    {
        "codigo_fase": "2.2",
        "nombre_fase": "2.2 PRETINA B CON GANCHO",
        "descripcion": "- Pegar etiqueta en 2 costuras en pretina.\n- Señalar posterior derecho + izquierdo de pretina “Molde” -B.\n- Armar derecho + izquierdo de pretina 4 a 6 cm + unir izquierda + derecha + revisar -B.\n- Pespunte inferior de pretina -B.\n- Planchar pretina B -B.\n- Señalar pretina B + señalar para pegar gancho macho 2 puntos + puntas de cruce 4 a 5 cm, guía en mesa.\n- Cortar sesgo + unir tela diámetro 16 cm y radio 8 cm -B.\n- Repelar pretina B + ribetear izquierdo pretina B M08 básico + cortar cadena de sesgo x1 -B.\n- Pegar gancho macho 2 patitas x1 pretina -B."
    },
    {
        "codigo_fase": "2.3",
        "nombre_fase": "2.3 POSTERIOR",
        "descripcion": "- Armar pinza posterior largo 7 a 12 cm -B.\n- Planchar pinza + pegar pelón en bolsillo posterior x2 -B.\n- Pasar puntos para señalar vivos x8 puntos.\n- Unir tiro posterior pantalón cadera -B."
    },
    {
        "codigo_fase": "2.4",
        "nombre_fase": "2.4 BRAGUETA CON BOLSILLO EMBOLSADO",
        "descripcion": "- Unir tiro delantero + colocar pieza de bragueta -B.\n- Pegar pelón y planchar bragueta pantalón -B.\n- Rematar tiro + pegar cierre 15 a 18 cm pantalón cadera -B.\n- Señalar + figurar + rematar bragueta + embolsar bolsillo 12 a 18 cm -B."
    },
    {
        "codigo_fase": "2.5",
        "nombre_fase": "2.5 PRESILLA",
        "descripcion": "- Armar presilla x1 37 cm.\n- Virar presilla x1 37 cm.\n- Planchar presilla x1 30 cm.\n- Cortar presilla x2 largo 5,5 cm con guía.\n- Sujetar presilla + pegar en bolsillo posterior x2 + revisar."
    },
    {
        "codigo_fase": "2.6",
        "nombre_fase": "2.6 PASADOR X5",
        "descripcion": "- Unir tira de pasador x1 50 cm + acomodar -B.\n- Armar pasador x1 45 cm + recortar tiras 5 pasador con medida."
    },
    {
        "codigo_fase": "2.7",
        "nombre_fase": "2.7 BOLSILLO DELANTERO",
        "descripcion": "- Pegar pelón en bolsillo delantero inclinado -B.\n- Armar bolsillo delantero completo con funda -B.\n- Planchar boca de bolsillo inclinado -B.\n- Cerrar bolsillo delantero con forma -B."
    },
    {
        "codigo_fase": "2.8",
        "nombre_fase": "2.8 BOLSILLO SIMULADO DOBLE VIVO",
        "descripcion": "- Armar bolsillo simulado doble vivo x2 -B.\n- Piquete x8 + remate de costado x4 + sujetar falso x2 doble vivo + presilla.\n- Encandilar falso x8 de bolsillo con remate -B.\n- Pespunte bolsillo posterior x2 doble vivo."
    },
    {
        "codigo_fase": "2.9",
        "nombre_fase": "2.9 ENSAMBLE",
        "descripcion": "- Cerrar costados con marquilla y seguro bolsillo delantero con funda + entrepiernas pantalón Proyect.\n- Encandilar basta pantalón x2 + cortar cadena -B.\n- Sujetar pasador en delantero x2 y posterior x3 + revisar “Pantalón armado” -B.\n- Pegar pretina B + preparar cierre ya sujetado el pasador -B.\n- Señalar + pegar gancho hembra x1 pretina -B.\n- Cerrar puntas de pretina 1 a 2 ganchos con cruce 4 a 5 cm + preparar 1 punta -B.\n- Preparar puntas x1 pretina -B.\n- Planchar puntas de pretina x2 -B.\n- Asentar pretina sin doblar con sesgo + cruce -B.\n- Figurar puntas pretina B 2 lados 4 a 5 cm -B.\n- Atracar bolsillo delantero x4 atraques + pasador x5 atraques colocando argolla en un pasador sin marcar."
    },
    {
        "codigo_fase": "2.10",
        "nombre_fase": "2.10 OJAL Y PULIDO",
        "descripcion": "- Urle basta pantalón 15 a 20 cm -B.\n- Hacer ojal interno x1 pretina -B.\n- Señalar para botón x1 molde interno -B.\n- Pegar botón interno x1 pretina -B.\n- Pegar botón 2 huecos x2 bolsillo posterior con presilla + 1 de reserva.\n- Cortar pasador x5 -B.\n- Pulir + revisar pantalón bolsillo x4 + pasador hilachas."
    },
    {
        "codigo_fase": "2.11",
        "nombre_fase": "2.11 PLANCHA Y CALIDAD",
        "descripcion": "- Abrir costura de tiro + costado y entrepierna estándar.\n- Planchar pretina.\n- Sacar raya de pantalón.\n- Revisar final pantalón básico bolsillo delantero y posterior -B."
    },
    {
        "codigo_fase": "3",
        "nombre_fase": "3 CHAQUETA",
        "descripcion": "Categoría principal para chaqueta."
    },
    {
        "codigo_fase": "3.1",
        "nombre_fase": "3.1 FUSIONADO",
        "descripcion": "- Preparar y fusionar blandís escote en V + vivo x4 + asiento de forro + DESPEGAR -M."
    },
    {
        "codigo_fase": "3.2",
        "nombre_fase": "3.2 DELANTERO ESCOTE EN V SIN FORRO",
        "descripcion": "- Armar pinza en delantero largo 19 a 23 cm -B.\n- Cerrar costado sin manga con abertura de bolsillo + marquilla -B.\n- Planchar costadillo delantero + pinza + pegar pelón para vivo -B.\n- Encandilar blandís -B.\n- Pegar pelón en delantero frente -B.\n- Pegar blandís escote en V sin forro.\n- Igualar bajo recto de chaqueta sin forro -B.\n- Pespunte de vencimiento blandís escote V + coser bajo recto -B.\n- Preparar delantero escote en V bajo recto -B.\n- Planchar delantero escote en V bajo recto + bolsillo simulado -B.\n- Revisar + afinar delantero escote en V bajo recto sin forro doble vivo simulado -B."
    },
    {
        "codigo_fase": "3.3",
        "nombre_fase": "3.3 ESPALDA",
        "descripcion": "- Unir línea C -B.\n- Cortar sesgo + unir tela diámetro 16 cm y radio 8 cm -B.\n- Ribetear línea C espalda básico + separar -B.\n- Planchar línea C ribeteada costura cerrada -B.\n- Pegar etiqueta + talla 2 costuras -B.\n- Ribetear asiento redondo + separar -B.\n- Pegar asiento escote espalda + pespunte de vencimiento -B.\n- Planchar asiento ribeteado + espalda con asiento -B.\n- Revisar + afinar espalda con asiento + mover sticker de asiento -B."
    },
    {
        "codigo_fase": "3.4",
        "nombre_fase": "3.4 MANGA SASTRE",
        "descripcion": "- Unir corte de manga sin tajo x2 tela -B.\n- Planchar corte de manga + pegar pelón + planchar bajo -B.\n- Encandilar bajo de manga con guía -B.\n- Cerrar costado de manga -B.\n- Virar manga para pegar -B."
    },
    {
        "codigo_fase": "3.5",
        "nombre_fase": "3.5 BOLSILLO SIMULADO DOBLE VIVO",
        "descripcion": "- Armar bolsillo simulado doble vivo largo 12.5 a 14.5 cm cerrado -B.\n- Abrir + picar bolsillo simulado -B.\n- Rematar costado de bolsillo simulado doble vivo largo 12.5 a 16 cm cerrado -B.\n- Encandilar falso bolsillo simulado x8 lados con remate -B."
    },
    {
        "codigo_fase": "3.6",
        "nombre_fase": "3.6 HOMBRERA",
        "descripcion": "- Unir remiendo para hombrera + cortar cadena -B.\n- Armar hombrera con remate -B."
    },
    {
        "codigo_fase": "3.7",
        "nombre_fase": "3.7 ENSAMBLE",
        "descripcion": "- Unir hombro con asiento cuadrando.\n- Rematar falso en hombro + meter cadena -B.\n- Unir bretel a la sisa espalda cerrada sin forro -B.\n- Pegar manga sastre cerrada + revisar chaq sin forro -B.\n- Pegar hombreras N3, 6 remates con asiento de chaq -B.\n- Pegar pelón + planchar bajo completo -B.\n- Encandilar bajo completo con guía -B.\n- Rematar bajo de blandís + línea C y bolsillo x2 con blandís -B."
    },
    {
        "codigo_fase": "3.8",
        "nombre_fase": "3.8 OJAL Y PULIDO",
        "descripcion": "- Urle bajo de mangas sastre + cortar cadena -B.\n- Urle bajo de chaq sin forro U.M.\n- Pulir + revisar chaqueta básica sin forro."
    },
    {
        "codigo_fase": "3.9",
        "nombre_fase": "3.9 PLANCHA Y CALIDAD",
        "descripcion": "- Planchar chaq en V sin forro.\n- Revisado final chaqueta sastre sin forro -B."
    },
]


def main():
    db = SessionLocal()
    try:
        try:
            db.execute(text("ALTER TABLE fases ADD COLUMN codigo_fase VARCHAR(20)"))
        except Exception as e:
            if "Duplicate column name" not in str(e):
                raise

        db.execute(text("ALTER TABLE fases MODIFY descripcion LONGTEXT"))

        for f in new_fases:
            existing = db.query(Fase).filter(Fase.codigo_fase == f["codigo_fase"]).first()
            if existing:
                existing.nombre_fase = f["nombre_fase"]
                existing.descripcion = f["descripcion"]
            else:
                db.add(Fase(nombre_fase=f["nombre_fase"], descripcion=f["descripcion"], codigo_fase=f["codigo_fase"]))

        db.commit()
        print("Fases actualizadas correctamente.")
    except Exception as e:
        db.rollback()
        print("Error actualizando fases:", e)
    finally:
        db.close()


if __name__ == '__main__':
    main()
