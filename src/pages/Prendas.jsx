import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import "./Prendas.css";

const FORMULARIO_INICIAL = {
  nombre: "",
  descripcion: "",
};

function extraerLista(respuesta) {
  const data = respuesta?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function obtenerMensajeError(error, alternativo) {
  const detalle = error?.response?.data?.detail;

  if (Array.isArray(detalle)) {
    return detalle
      .map((item) => item?.msg || item?.message || String(item))
      .join(". ");
  }

  if (typeof detalle === "string" && detalle.trim()) return detalle;

  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.message) return error.message;

  return alternativo;
}

function Icono({ nombre, size = 18 }) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  switch (nombre) {
    case "plus":
      return (
        <svg {...props}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "search":
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...props}>
          <path d="M20 6v5h-5" />
          <path d="M4 18v-5h5" />
          <path d="M18.5 9A7 7 0 0 0 6.2 6.2L4 8M5.5 15A7 7 0 0 0 17.8 17.8L20 16" />
        </svg>
      );
    case "package":
      return (
        <svg {...props}>
          <path d="m21 8-9-5-9 5 9 5z" />
          <path d="M3 8v8l9 5 9-5V8M12 13v8" />
        </svg>
      );
    case "check":
      return (
        <svg {...props}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );
    case "close":
      return (
        <svg {...props}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Prendas({ onDatosActualizados }) {
  const [prendas, setPrendas] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);

  const cargarPrendas = useCallback(async (mostrarCarga = true) => {
    if (mostrarCarga) setCargando(true);
    setError("");

    try {
      const respuesta = await api.get("/prendas/");
      const lista = extraerLista(respuesta);
      setPrendas(lista);
      onDatosActualizados?.(lista);
    } catch (errorPeticion) {
      setError(
        obtenerMensajeError(
          errorPeticion,
          "No fue posible cargar el catálogo de prendas."
        )
      );
    } finally {
      if (mostrarCarga) setCargando(false);
    }
  }, [onDatosActualizados]);

  useEffect(() => {
    cargarPrendas();
  }, [cargarPrendas]);

  useEffect(() => {
    if (!modalAbierto) return undefined;

    const cerrarConEscape = (event) => {
      if (event.key === "Escape" && !guardando) setModalAbierto(false);
    };

    document.addEventListener("keydown", cerrarConEscape);
    return () => document.removeEventListener("keydown", cerrarConEscape);
  }, [modalAbierto, guardando]);

  const prendasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return prendas;

    return prendas.filter((prenda) => {
      const id = String(prenda.id_prenda ?? prenda.id ?? "");
      const nombre = String(prenda.nombre ?? "").toLowerCase();
      const descripcion = String(prenda.descripcion ?? "").toLowerCase();

      return (
        id.includes(termino) ||
        nombre.includes(termino) ||
        descripcion.includes(termino)
      );
    });
  }, [busqueda, prendas]);

  const abrirNuevaPrenda = () => {
    setFormulario(FORMULARIO_INICIAL);
    setError("");
    setMensaje("");
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModalAbierto(false);
    setFormulario(FORMULARIO_INICIAL);
  };

  const crearPrenda = async (event) => {
    event.preventDefault();

    const nombre = formulario.nombre.trim();
    const descripcion = formulario.descripcion.trim();

    if (!nombre) {
      setError("El nombre de la prenda es obligatorio.");
      return;
    }

    if (!descripcion) {
      setError("La descripción es obligatoria.");
      return;
    }

    const existe = prendas.some(
      (prenda) => String(prenda.nombre ?? "").trim().toLowerCase() === nombre.toLowerCase()
    );

    if (existe) {
      setError(`Ya existe una prenda registrada con el nombre “${nombre}”.`);
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      // Swagger de tu backend define POST /prendas/ con este cuerpo exacto.
      await api.post("/prendas/", {
        nombre,
        descripcion,
      });

      setModalAbierto(false);
      setFormulario(FORMULARIO_INICIAL);
      setMensaje(`Prenda “${nombre}” creada correctamente.`);
      await cargarPrendas(false);
    } catch (errorPeticion) {
      setError(
        obtenerMensajeError(
          errorPeticion,
          "No fue posible crear la prenda. Revise los datos e inténtelo nuevamente."
        )
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="prendas-page" aria-labelledby="prendas-title">
      <div className="prendas-heading">
        <div>
          <span className="prendas-eyebrow">OPERACIÓN / PRENDAS</span>
          <h2 id="prendas-title">Catálogo de Prendas</h2>
          <p>
            Administre los tipos de prenda que podrán utilizarse posteriormente
            en pedidos, fichas técnicas y producción.
          </p>
        </div>

        <button type="button" className="prendas-primary" onClick={abrirNuevaPrenda}>
          <Icono nombre="plus" />
          Nueva prenda
        </button>
      </div>

      {error && !modalAbierto && <div className="prendas-alert error">{error}</div>}
      {mensaje && <div className="prendas-alert success">{mensaje}</div>}

      <div className="prendas-kpi-grid">
        <article className="prendas-kpi-card">
          <span className="prendas-kpi-icon blue">
            <Icono nombre="package" size={22} />
          </span>
          <div>
            <small>Tipos de prenda</small>
            <strong>{prendas.length}</strong>
            <span>Registrados en base de datos</span>
          </div>
        </article>

        <article className="prendas-kpi-card">
          <span className="prendas-kpi-icon green">
            <Icono nombre="check" size={22} />
          </span>
          <div>
            <small>Catálogo</small>
            <strong>Activo</strong>
            <span>Conectado a GET /prendas/</span>
          </div>
        </article>
      </div>

      <article className="prendas-card">
        <div className="prendas-card-header">
          <div>
            <span>CATÁLOGO MAESTRO</span>
            <h3>Tipos de prenda registrados</h3>
          </div>

          <div className="prendas-toolbar">
            <label className="prendas-search">
              <Icono nombre="search" size={17} />
              <input
                type="search"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar por nombre o descripción"
                aria-label="Buscar prendas"
              />
            </label>

            <button
              type="button"
              className="prendas-icon-button"
              onClick={() => cargarPrendas(true)}
              disabled={cargando}
              title="Actualizar catálogo"
              aria-label="Actualizar catálogo"
            >
              <Icono nombre="refresh" />
            </button>
          </div>
        </div>

        <div className="prendas-table-wrap">
          <table className="prendas-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan="4" className="prendas-empty">
                    Cargando prendas...
                  </td>
                </tr>
              ) : prendasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="4" className="prendas-empty">
                    {busqueda
                      ? "No hay prendas que coincidan con la búsqueda."
                      : "Todavía no existen prendas registradas."}
                  </td>
                </tr>
              ) : (
                prendasFiltradas.map((prenda) => (
                  <tr key={prenda.id_prenda ?? prenda.id ?? prenda.nombre}>
                    <td>
                      <span className="prendas-id">
                        {prenda.id_prenda ?? prenda.id ?? "—"}
                      </span>
                    </td>
                    <td>
                      <strong>{prenda.nombre || "Sin nombre"}</strong>
                    </td>
                    <td>{prenda.descripcion || "Sin descripción"}</td>
                    <td>
                      <span className="prendas-status">Disponible</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      {modalAbierto && (
        <div
          className="prendas-modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) cerrarModal();
          }}
        >
          <section
            className="prendas-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="nueva-prenda-title"
          >
            <header className="prendas-modal-header">
              <div>
                <span>NUEVO REGISTRO</span>
                <h3 id="nueva-prenda-title">Crear tipo de prenda</h3>
              </div>

              <button
                type="button"
                onClick={cerrarModal}
                disabled={guardando}
                aria-label="Cerrar"
              >
                <Icono nombre="close" />
              </button>
            </header>

            <form onSubmit={crearPrenda} className="prendas-form">
              <p className="prendas-form-help">
                El campo <strong>ID</strong> no se envía: la base de datos lo genera
                automáticamente. El backend recibe únicamente <strong>nombre</strong> y
                <strong> descripción</strong>.
              </p>

              {error && <div className="prendas-alert error">{error}</div>}

              <label className="prendas-field">
                <span>Nombre de la prenda *</span>
                <input
                  type="text"
                  value={formulario.nombre}
                  onChange={(event) =>
                    setFormulario((actual) => ({
                      ...actual,
                      nombre: event.target.value,
                    }))
                  }
                  placeholder="Ej.: CAMISA"
                  maxLength={100}
                  disabled={guardando}
                  autoFocus
                  required
                />
                <small>Ejemplos: CHAQUETA, BLUSA, PANTALÓN, CAMISA.</small>
              </label>

              <label className="prendas-field">
                <span>Descripción *</span>
                <textarea
                  value={formulario.descripcion}
                  onChange={(event) =>
                    setFormulario((actual) => ({
                      ...actual,
                      descripcion: event.target.value,
                    }))
                  }
                  placeholder="Ej.: Camisa manga larga, cuello clásico"
                  rows={4}
                  maxLength={255}
                  disabled={guardando}
                  required
                />
              </label>

              <div className="prendas-modal-actions">
                <button
                  type="button"
                  className="prendas-secondary"
                  onClick={cerrarModal}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="prendas-primary"
                  disabled={guardando}
                >
                  {guardando ? "Guardando..." : "Crear prenda"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
