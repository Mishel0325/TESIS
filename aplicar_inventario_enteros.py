from pathlib import Path
import shutil
import re
import sys

def buscar_root():
    for base0 in [Path.cwd(), Path(__file__).resolve().parent]:
        for base in [base0,*base0.parents]:
            if (base/'src/pages/SupervisorDashboard.jsx').exists(): return base
            if (base/'frontend/src/pages/SupervisorDashboard.jsx').exists(): return base/'frontend'
    return None
root=buscar_root()
if not root: raise SystemExit('No encontré src/pages/SupervisorDashboard.jsx.')
p=root/'src/pages/SupervisorDashboard.jsx'
texto=p.read_text(encoding='utf-8')
if 'SOLO_ENTEROS_INVENTARIO' in texto:
    print('La validación de enteros ya está aplicada.')
    sys.exit(0)
shutil.copy2(p,p.with_suffix(p.suffix+'.bak'))

# Validación lógica del submit.
ant='''    if (Number.isNaN(stockActual) || Number.isNaN(stockMinimo) || stockActual < 0 || stockMinimo < 0) {\n      setErrorInsumo("Ingrese valores de stock válidos.");\n      return;\n    }'''
nue='''    // SOLO_ENTEROS_INVENTARIO\n    if (\n      !Number.isInteger(stockActual) ||\n      !Number.isInteger(stockMinimo) ||\n      stockActual < 0 ||\n      stockMinimo < 0\n    ) {\n      setErrorInsumo("Stock contado y stock mínimo deben ser números enteros iguales o mayores a 0.");\n      return;\n    }'''
if ant not in texto:
    raise SystemExit('No encontré la validación actual de guardarConteoInsumo; no se modificó el archivo.')
texto=texto.replace(ant,nue,1)

# Solo dentro del modal Contar inventario: usa texto numérico y sanea caracteres.
start=texto.find('titulo="Contar inventario"')
if start<0: raise SystemExit('No encontré el modal Contar inventario.')
end=texto.find('</ModalBase>',start)
if end<0: raise SystemExit('No encontré el cierre del modal Contar inventario.')
bloque=texto[start:end]

bloque=bloque.replace('''type="number"\n                min="0"\n                step="0.01"\n                value={formularioConteoInsumo.stock_actual}\n                onChange={(event) =>\n                  setFormularioConteoInsumo((actual) => ({ ...actual, stock_actual: event.target.value }))\n                }''','''type="text"\n                inputMode="numeric"\n                pattern="[0-9]*"\n                value={formularioConteoInsumo.stock_actual}\n                onChange={(event) => {\n                  const valor = event.target.value.replace(/\\D/g, "");\n                  setFormularioConteoInsumo((actual) => ({ ...actual, stock_actual: valor }));\n                }}''',1)
bloque=bloque.replace('''type="number"\n                min="0"\n                step="0.01"\n                value={formularioConteoInsumo.stock_minimo}\n                onChange={(event) =>\n                  setFormularioConteoInsumo((actual) => ({ ...actual, stock_minimo: event.target.value }))\n                }''','''type="text"\n                inputMode="numeric"\n                pattern="[0-9]*"\n                value={formularioConteoInsumo.stock_minimo}\n                onChange={(event) => {\n                  const valor = event.target.value.replace(/\\D/g, "");\n                  setFormularioConteoInsumo((actual) => ({ ...actual, stock_minimo: valor }));\n                }}''',1)
texto=texto[:start]+bloque+texto[end:]
p.write_text(texto,encoding='utf-8')
print(f'VALIDACIÓN DE INVENTARIO APLICADA: {p}')
print('Stock contado y stock mínimo ahora aceptan solo dígitos enteros >= 0.')
print('Se creó SupervisorDashboard.jsx.bak.')
