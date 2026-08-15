from pathlib import Path
import shutil

ROOT = Path.cwd()
RUTA_BACKEND = ROOT / "app" / "routes" / "informe_routes.py"
RUTA_FRONTEND = ROOT / "src" / "pages" / "SupervisorDashboard.jsx"


def backup(ruta):
    destino = ruta.with_suffix(ruta.suffix + ".bak_nombre_maquila")
    if not destino.exists():
        shutil.copy2(ruta, destino)
    return destino


def corregir_backend():
    if not RUTA_BACKEND.exists():
        print(f"AVISO: no se encontró {RUTA_BACKEND}")
        return False

    texto = RUTA_BACKEND.read_text(encoding="utf-8")
    original = texto

    if "from app.models.maquila_model import Maquila" not in texto:
        marcador = "from app.models.informe_model import Informe"
        if marcador in texto:
            texto = texto.replace(
                marcador,
                marcador + "\nfrom app.models.maquila_model import Maquila",
                1,
            )

    viejo = '    maquila = getattr(pedido, "maquila", None)\n'
    nuevo = (
        '    maquila = getattr(pedido, "maquila", None)\n\n'
        '    # Si la relación no está disponible, buscar la maquila por id.\n'
        '    if maquila is None and getattr(pedido, "id_maquila", None):\n'
        '        maquila = (\n'
        '            db.query(Maquila)\n'
        '            .filter(Maquila.id_maquila == pedido.id_maquila)\n'
        '            .first()\n'
        '        )\n'
    )

    if viejo in texto and "db.query(Maquila)" not in texto:
        texto = texto.replace(viejo, nuevo, 1)

    if texto != original:
        copia = backup(RUTA_BACKEND)
        RUTA_BACKEND.write_text(texto, encoding="utf-8")
        print(f"OK backend: {RUTA_BACKEND}")
        print(f"   respaldo: {copia}")
        return True

    print("Backend: no fue necesario modificar.")
    return False


def corregir_frontend():
    if not RUTA_FRONTEND.exists():
        print(f"AVISO: no se encontró {RUTA_FRONTEND}")
        return False

    texto = RUTA_FRONTEND.read_text(encoding="utf-8")
    original = texto

    texto = texto.replace(
        "maquila.nombre_maquila || maquila.nombre || pedido.id_maquila",
        "maquila.nombre_maquila || maquila.nombre",
    )

    texto = texto.replace(
        'informeDetalle.maquila?.nombre ||\n                    informeDetalle.pedido?.id_maquila ||',
        'informeDetalle.maquila?.nombre ||',
    )

    if texto != original:
        copia = backup(RUTA_FRONTEND)
        RUTA_FRONTEND.write_text(texto, encoding="utf-8")
        print(f"OK frontend: {RUTA_FRONTEND}")
        print(f"   respaldo: {copia}")
        return True

    print("Frontend: no fue necesario modificar.")
    return False


def main():
    print("CORRECCIÓN: NOMBRE DE MAQUILA EN INFORMES")
    print("----------------------------------------")
    print(f"Raíz detectada: {ROOT}")
    print()

    backend = corregir_backend()
    frontend = corregir_frontend()

    print()
    if backend or frontend:
        print("CAMBIO APLICADO.")
        print("Reinicie FastAPI y Vite y genere nuevamente el informe.")
    else:
        print("No se aplicaron cambios automáticos.")


if __name__ == "__main__":
    main()
