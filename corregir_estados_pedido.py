from pathlib import Path
import re
import shutil
import sys

ESTADOS_VALIDOS = [
    "Pendiente",
    "En Produccion",
    "A tiempo",
    "Retrasado",
    "Finalizado",
    "Entregado",
]

ARCHIVOS_CANDIDATOS = [
    Path("src/pages/SupervisorDashboard.jsx"),
    Path("src/pages/EditarPedido.jsx"),
    Path("src/pages/CrearPedidoModal.jsx"),
    Path("src/components/EditarPedido.jsx"),
    Path("src/components/CrearPedidoModal.jsx"),
]

def respaldar(ruta: Path):
    copia = ruta.with_suffix(ruta.suffix + ".bak_estados")
    if not copia.exists():
        shutil.copy2(ruta, copia)
    return copia

def reemplazar_opciones_estado(texto: str):
    original = texto

    # Normaliza variantes que el backend NO acepta.
    texto = texto.replace(
        '<option value="En proceso">En proceso</option>',
        '<option value="En Produccion">En Produccion</option>'
    )
    texto = texto.replace(
        '<option value="En Producción">En Producción</option>',
        '<option value="En Produccion">En Produccion</option>'
    )

    # El backend no registra Cancelado.
    texto = re.sub(
        r'\s*<option\s+value=["\']Cancelado["\']\s*>\s*Cancelado\s*</option>',
        '',
        texto,
        flags=re.IGNORECASE
    )

    # Asegura que exista "A tiempo" una sola vez en cada bloque típico.
    patron_en_prod = '<option value="En Produccion">En Produccion</option>'
    patron_a_tiempo = '<option value="A tiempo">A tiempo</option>'

    if patron_en_prod in texto and patron_a_tiempo not in texto:
        texto = texto.replace(
            patron_en_prod,
            patron_en_prod + '\n          ' + patron_a_tiempo
        )

    # Si por versiones previas quedaron duplicados, elimina duplicados consecutivos.
    texto = re.sub(
        r'(<option value="A tiempo">A tiempo</option>\s*){2,}',
        '<option value="A tiempo">A tiempo</option>\n',
        texto
    )

    return texto, texto != original

def main():
    encontrados = []
    modificados = []

    for ruta in ARCHIVOS_CANDIDATOS:
        if not ruta.exists():
            continue

        encontrados.append(ruta)
        texto = ruta.read_text(encoding="utf-8")
        nuevo, cambio = reemplazar_opciones_estado(texto)

        if cambio:
            copia = respaldar(ruta)
            ruta.write_text(nuevo, encoding="utf-8")
            modificados.append((ruta, copia))

    print("")
    print("ESTADOS VÁLIDOS DEL BACKEND:")
    for estado in ESTADOS_VALIDOS:
        print(f"  - {estado}")

    print("")
    if not encontrados:
        print("No se encontró ninguno de los archivos esperados.")
        print("Ejecute este script desde la raíz del proyecto, donde están package.json y src.")
        sys.exit(1)

    if modificados:
        print("ARCHIVOS MODIFICADOS:")
        for ruta, copia in modificados:
            print(f"  OK  {ruta}")
            print(f"      respaldo: {copia}")
    else:
        print("No fue necesario modificar archivos; las opciones ya parecen estar corregidas.")

    print("")
    print("SE ELIMINÓ:")
    print("  - En proceso")
    print("  - Cancelado")
    print("")
    print("SE USA EXACTAMENTE:")
    print("  Pendiente, En Produccion, A tiempo, Retrasado, Finalizado, Entregado")
    print("")
    print("Reinicie Vite después del cambio.")

if __name__ == "__main__":
    main()
