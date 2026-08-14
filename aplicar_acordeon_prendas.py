
from pathlib import Path
import shutil

CANDIDATOS = [
    Path("frontend/src/pages/Prendas.jsx"),
    Path("src/pages/Prendas.jsx"),
]

jsx = next((p for p in CANDIDATOS if p.exists()), None)
if jsx is None:
    raise SystemExit("No encontré Prendas.jsx. Ejecute este script desde la raíz del proyecto.")
css = jsx.with_name("Prendas.css")
if not css.exists():
    raise SystemExit(f"No encontré {css}")

texto = jsx.read_text(encoding="utf-8")
if "fasesAbiertas" in texto:
    print("El acordeón ya parece estar aplicado. No se hicieron cambios.")
    raise SystemExit(0)

shutil.copy2(jsx, jsx.with_suffix(jsx.suffix + ".bak"))
shutil.copy2(css, css.with_suffix(css.suffix + ".bak"))

cambios = 0

def reemplazar(antiguo, nuevo, nombre, cantidad=1):
    global texto, cambios
    if antiguo not in texto:
        raise SystemExit(f"No pude localizar el bloque: {nombre}. Se dejó la copia .bak intacta.")
    texto = texto.replace(antiguo, nuevo, cantidad)
    cambios += 1

reemplazar(
    '  const [formTarea, setFormTarea] = useState(TAREA_INICIAL);',
    '  const [formTarea, setFormTarea] = useState(TAREA_INICIAL);\n  const [fasesAbiertas, setFasesAbiertas] = useState(() => new Set());',
    "estado fasesAbiertas",
)

reemplazar(
    '''  const cerrarModal = () => {\n    if (!guardando) setModal(null);\n  };''',
    '''  const cerrarModal = () => {\n    if (!guardando) setModal(null);\n  };\n\n  const alternarFase = (idFase) => {\n    const clave = String(idFase);\n    setFasesAbiertas((actuales) => {\n      const siguiente = new Set(actuales);\n      if (siguiente.has(clave)) siguiente.delete(clave);\n      else siguiente.add(clave);\n      return siguiente;\n    });\n  };''',
    "función alternarFase",
)

reemplazar(
    '''                      const tareasFase = tareasAgrupadas.get(String(idFase)) || [];\n                      return (''',
    '''                      const tareasFase = tareasAgrupadas.get(String(idFase)) || [];\n                      const faseAbierta = fasesAbiertas.has(String(idFase));\n                      return (''',
    "faseAbierta",
)

reemplazar(
    '<div className="prendas-flow-card">',
    '<div className={`prendas-flow-card ${faseAbierta ? "is-open" : "is-collapsed"}`}>',
    "clase de tarjeta desplegable",
)

reemplazar(
    '<div className="prendas-phase-header">',
    '<div className="prendas-phase-header prendas-phase-toggle" role="button" tabIndex={0} aria-expanded={faseAbierta} onClick={() => alternarFase(idFase)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); alternarFase(idFase); } }}>',
    "cabecera desplegable",
)

reemplazar(
    '<div className="prendas-phase-actions">',
    '<div className="prendas-phase-actions" onClick={(event) => event.stopPropagation()}>',
    "acciones sin propagación",
)

reemplazar(
    '''                                </div>\n                              </div>\n                            </div>\n\n                            <div className="prendas-task-list">''',
    '''                                </div>\n                                <span className={`prendas-phase-chevron ${faseAbierta ? "is-open" : ""}`} aria-hidden="true"><Icono nombre="chevron" size={15} /></span>\n                              </div>\n                            </div>\n\n                            {faseAbierta && (\n                              <div className="prendas-task-list">''',
    "inicio contenido acordeón",
)

reemplazar(
    '''                              })}\n                            </div>\n                          </div>''',
    '''                              })}\n                              </div>\n                            )}\n                          </div>''',
    "cierre contenido acordeón",
)

jsx.write_text(texto, encoding="utf-8")

css_extra = r'''

/* =============================================================
   ACORDEÓN DE FASES - MAQUILA SYSTEM EC
   ============================================================= */
.prendas-phase-toggle {
  cursor: pointer;
  user-select: none;
}

.prendas-phase-toggle:hover {
  background: #f7fbff;
}

.prendas-flow-card.is-collapsed .prendas-phase-header {
  border-bottom-color: transparent;
}

.prendas-phase-chevron {
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  display: grid;
  place-items: center;
  color: #6c7c91;
  background: #f3f6fa;
  border: 1px solid #e4eaf1;
  border-radius: 7px;
  transition: transform .18s ease, background .18s ease;
}

.prendas-phase-chevron.is-open {
  color: #0757a6;
  background: #eaf3ff;
  transform: rotate(90deg);
}

.prendas-flow-card.is-collapsed {
  min-height: 0;
  margin-bottom: 8px;
}

.prendas-flow-card.is-open {
  margin-bottom: 14px;
}
'''
with css.open("a", encoding="utf-8") as f:
    f.write(css_extra)

print(f"Acordeón aplicado correctamente en: {jsx}")
print(f"CSS actualizado en: {css}")
print("Se crearon copias .bak de ambos archivos.")
