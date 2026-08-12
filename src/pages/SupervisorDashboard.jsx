import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import api from "../api/axios";
import logoMaquila from "../assets/logo-maquila.png";
import CrearPedidoModal from "./CrearPedidoModal";
import "./SupervisorDashboard.css";

// Rediseño visual 2026: conserva la lógica/API existente y cambia únicamente la presentación.
import CrearMaquilaModal from "../components/CrearMaquilaModal";
import UsuariosModal from "../components/UsuariosModal";
import Prendas from "./Prendas";
/*
 * IMPORTANTE:
 * La primera ruta debe ser la ruta real de tu backend.
 * El código prueba las siguientes únicamente cuando recibe 404 o 405.
 */
const ENDPOINTS = {
  pedidos: ["/pedidos/"],
  seguimientos: ["/seguimiento/", "/seguimientos/"],
  insumos: ["/insumos/"],
  maquilas: ["/maquilas/"],
  controlCalidad: ["/control_calidad/"],
  archivos: ["/archivos/"],
  informes: ["/informes/"],
  fases: ["/fases/"],
  tareas: ["/tareas/"],
  prendas: ["/prendas/"],
};

const FORMULARIO_VACIO = {
  codigo_pedido: "",
  id_maquila: "",
  tipo_prenda: "",
  talla: "",
  color: "",
  cantidad: "",
  fecha_ingreso: "",
  fecha_entrega: "",
  prioridad: "Media",
  estado: "Pendiente",
  observaciones: "",
};

/* =====================================================
   FUNCIONES AUXILIARES
===================================================== */

function extraerLista(respuesta) {
  const data = respuesta?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;

  return [];
}

function limpiarRuta(ruta) {
  return ruta.endsWith("/") ? ruta.slice(0, -1) : ruta;
}

async function consultarPrimeraRutaDisponible(rutas) {
  let ultimoError = null;

  for (const ruta of rutas) {
    try {
      return await api.get(ruta);
    } catch (error) {
      ultimoError = error;

      if (error.response?.status !== 404) {
        throw error;
      }
    }
  }

  throw ultimoError || new Error("No se encontró un endpoint disponible.");
}

async function actualizarPedidoDisponible(idPedido, payload) {
  let ultimoError = null;

  for (const ruta of ENDPOINTS.pedidos) {
    const url = `${limpiarRuta(ruta)}/${idPedido}`;

    for (const metodo of ["put", "patch"]) {
      try {
        return await api[metodo](url, payload);
      } catch (error) {
        ultimoError = error;
        const estado = error.response?.status;

        if (estado !== 404 && estado !== 405) {
          throw error;
        }
      }
    }
  }

  throw ultimoError || new Error("No se encontró la ruta para editar pedidos.");
}

async function eliminarPedidoDisponible(idPedido) {
  let ultimoError = null;

  for (const ruta of ENDPOINTS.pedidos) {
    const url = `${limpiarRuta(ruta)}/${idPedido}`;

    try {
      return await api.delete(url);
    } catch (error) {
      ultimoError = error;
      const estado = error.response?.status;

      if (estado !== 404 && estado !== 405) {
        throw error;
      }
    }
  }

  throw ultimoError || new Error("No se encontró la ruta para eliminar pedidos.");
}

function obtenerMensajeError(error, mensajeAlternativo) {
  const detalle = error?.response?.data?.detail;

  if (Array.isArray(detalle)) {
    return detalle
      .map((item) => item?.msg || item?.message || String(item))
      .join(". ");
  }

  if (typeof detalle === "string" && detalle.trim()) {
    return detalle;
  }

  return error?.message || mensajeAlternativo;
}

function obtenerTexto(valor, valorAlternativo = "") {
  if (valor === null || valor === undefined) {
    return valorAlternativo;
  }

  return String(valor).trim() || valorAlternativo;
}

function obtenerTextoInsumo(insumo, campos, valorAlternativo = "Sin datos") {
  for (const campo of campos) {
    const valor = insumo?.[campo];
    if (valor !== null && valor !== undefined && String(valor).trim()) {
      return String(valor).trim();
    }
  }

  return valorAlternativo;
}

function obtenerStockInsumo(insumo) {
  return Number(
    insumo.stock_actual ?? insumo.stock ?? insumo.cantidad ?? insumo.cantidad_actual ?? 0
  );
}

function obtenerStockMinimoInsumo(insumo) {
  return Number(
    insumo.stock_minimo ?? insumo.minimo ?? insumo.stock_min ?? insumo.stock_minimo_actual ?? 0
  );
}

function obtenerObjetoPedido(item) {
  const pedidoAnidado =
    item?.pedido && typeof item.pedido === "object" ? item.pedido : {};

  return {
    ...pedidoAnidado,
    ...item,
  };
}

function obtenerNombreMaquila(item) {
  return obtenerTexto(
    item.maquila?.nombre ??
      item.maquila?.nombre_maquila ??
      item.taller?.nombre ??
      item.taller?.nombre_taller ??
      item.maquila_nombre ??
      item.nombre_maquila ??
      item.nombre_taller ??
      item.taller ??
      (typeof item.maquila === "string" ? item.maquila : null) ??
      item.id_maquila,
    "Sin asignar"
  );
}

function obtenerEstado(item) {
  return obtenerTexto(
    item.estado?.nombre ??
      item.estado_nombre ??
      item.estado ??
      item.status,
    "Pendiente"
  );
}

function obtenerProgreso(item) {
  const valor =
    item.progreso ??
    item.porcentaje ??
    item.avance ??
    item.porcentaje_avance ??
    0;

  const numero = Number(String(valor).replace("%", ""));

  if (Number.isNaN(numero)) return 0;

  return Math.min(100, Math.max(0, numero));
}

function fechaParaInput(fecha) {
  if (!fecha) return "";

  if (typeof fecha === "string") {
    const coincidencia = fecha.match(/^\d{4}-\d{2}-\d{2}/);
    if (coincidencia) return coincidencia[0];
  }

  const convertida = new Date(fecha);

  if (Number.isNaN(convertida.getTime())) return "";

  const anio = convertida.getFullYear();
  const mes = String(convertida.getMonth() + 1).padStart(2, "0");
  const dia = String(convertida.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function formatearFecha(fecha) {
  if (!fecha) return "Sin fecha";

  if (typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const [anio, mes, dia] = fecha.split("-");
    return `${dia}/${mes}/${anio}`;
  }

  const fechaConvertida = new Date(fecha);

  if (Number.isNaN(fechaConvertida.getTime())) {
    return String(fecha);
  }

  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(fechaConvertida);
}

function normalizarPedido(item, indice = 0) {
  const origen = obtenerObjetoPedido(item || {});

  const idPedido =
    origen.id_pedido ?? origen.id_prenda ?? origen.id ?? `temporal-${indice}`;

  const codigo = obtenerTexto(
    origen.codigo_pedido ??
      origen.codigo ??
      origen.numero_pedido ??
      (typeof origen.pedido === "string" ? origen.pedido : null) ??
      origen.numero,
    `PD-${idPedido}`
  );

  const fechaEntregaISO = fechaParaInput(
    origen.fecha_entrega ??
      origen.fecha_finalizacion ??
      origen.entrega ??
      origen.fecha
  );

  const fechaIngresoISO = fechaParaInput(
    origen.fecha_ingreso ?? origen.fecha_creacion
  );

  return {
    id: idPedido,
    idMaquila:
      origen.id_maquila ??
      origen.maquila?.id_maquila ??
      origen.maquila?.id ??
      origen.taller?.id_maquila ??
      origen.taller?.id ??
      "",
    codigo,
    maquila: obtenerNombreMaquila(origen),
    estado: obtenerEstado(origen),
    fechaEntregaISO,
    fechaEntrega: formatearFecha(fechaEntregaISO),
    fechaIngresoISO,
    fechaIngreso: formatearFecha(fechaIngresoISO),
    progreso: obtenerProgreso(origen),
    tipoPrenda: obtenerTexto(
      origen.tipo_prenda ??
        origen.nombre_prenda ??
        origen.modelo ??
        origen.prenda?.modelo,
      "Sin especificar"
    ),
    talla: obtenerTexto(origen.talla, "Sin especificar"),
    color: obtenerTexto(origen.color, "Sin especificar"),
    prioridad: obtenerTexto(origen.prioridad, "Media"),
    cantidad: Number(
      origen.cantidad ?? origen.total_unidades ?? origen.unidades ?? 0
    ),
    observaciones: obtenerTexto(origen.observaciones, "Sin observaciones"),
    original: origen,
  };
}

function pedidosCoinciden(pedidoA, pedidoB) {
  if (
    pedidoA.id !== null &&
    pedidoA.id !== undefined &&
    pedidoB.id !== null &&
    pedidoB.id !== undefined &&
    String(pedidoA.id) === String(pedidoB.id)
  ) {
    return true;
  }

  return (
    pedidoA.codigo &&
    pedidoB.codigo &&
    pedidoA.codigo.toLowerCase() === pedidoB.codigo.toLowerCase()
  );
}

function combinarPedidosConSeguimientos(pedidosBackend, seguimientosBackend) {
  const pedidosNormalizados = pedidosBackend.map(normalizarPedido);
  const seguimientosNormalizados = seguimientosBackend.map(normalizarPedido);

  const combinados = pedidosNormalizados.map((pedido) => {
    const seguimiento = seguimientosNormalizados.find((item) =>
      pedidosCoinciden(pedido, item)
    );

    if (!seguimiento) return pedido;

    return {
      ...pedido,
      estado: seguimiento.estado || pedido.estado,
      progreso: seguimiento.progreso,
      fechaEntregaISO: seguimiento.fechaEntregaISO || pedido.fechaEntregaISO,
      fechaEntrega:
        seguimiento.fechaEntregaISO !== ""
          ? seguimiento.fechaEntrega
          : pedido.fechaEntrega,
      maquila:
        seguimiento.maquila !== "Sin asignar"
          ? seguimiento.maquila
          : pedido.maquila,
      original: {
        ...pedido.original,
        ...seguimiento.original,
      },
    };
  });

  seguimientosNormalizados.forEach((seguimiento) => {
    const yaExiste = combinados.some((pedido) =>
      pedidosCoinciden(pedido, seguimiento)
    );

    if (!yaExiste) {
      combinados.push(seguimiento);
    }
  });

  return combinados.sort((a, b) => {
    const idA = Number(a.id);
    const idB = Number(b.id);

    if (!Number.isNaN(idA) && !Number.isNaN(idB) && idA !== idB) {
      return idB - idA;
    }

    return String(b.fechaIngresoISO || "").localeCompare(
      String(a.fechaIngresoISO || "")
    );
  });
}

function obtenerTipoEstado(pedido) {
  const estado = pedido.estado.toLowerCase();

  if (
    estado.includes("final") ||
    estado.includes("complet") ||
    estado.includes("entreg") ||
    estado.includes("termin")
  ) {
    return "finalizado";
  }

  if (
    estado.includes("retras") ||
    estado.includes("venc") ||
    estado.includes("atras")
  ) {
    return "retrasado";
  }

  if (pedido.fechaEntregaISO) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const entrega = new Date(`${pedido.fechaEntregaISO}T00:00:00`);

    if (!Number.isNaN(entrega.getTime()) && entrega < hoy) {
      return "retrasado";
    }
  }

  return "activo";
}

function crearFormularioDesdePedido(pedido) {
  return {
    codigo_pedido: pedido?.codigo || "",
    id_maquila:
      pedido?.idMaquila === null || pedido?.idMaquila === undefined
        ? ""
        : String(pedido.idMaquila),
    tipo_prenda:
      pedido?.tipoPrenda === "Sin especificar" ? "" : pedido?.tipoPrenda || "",
    talla: pedido?.talla === "Sin especificar" ? "" : pedido?.talla || "",
    color: pedido?.color === "Sin especificar" ? "" : pedido?.color || "",
    cantidad: pedido?.cantidad ? String(pedido.cantidad) : "",
    fecha_ingreso: pedido?.fechaIngresoISO || "",
    fecha_entrega: pedido?.fechaEntregaISO || "",
    prioridad: pedido?.prioridad || "Media",
    estado: pedido?.estado || "Pendiente",
    observaciones:
      pedido?.observaciones === "Sin observaciones"
        ? ""
        : pedido?.observaciones || "",
  };
}

function construirPayload(formulario) {
  const payload = {
    codigo_pedido: formulario.codigo_pedido.trim(),
    tipo_prenda: formulario.tipo_prenda.trim() || null,
    talla: formulario.talla.trim() || null,
    color: formulario.color.trim() || null,
    cantidad: Number(formulario.cantidad),
    fecha_ingreso: formulario.fecha_ingreso || null,
    fecha_entrega: formulario.fecha_entrega || null,
    prioridad: formulario.prioridad || "Media",
    estado: formulario.estado || "Pendiente",
    observaciones: formulario.observaciones.trim() || null,
  };

  if (formulario.id_maquila !== "") {
    payload.id_maquila = Number(formulario.id_maquila);
  }

  return payload;
}

function ModalBase({ abierto, titulo, onCerrar, children, ancho = "normal" }) {
  useEffect(() => {
    if (!abierto) return undefined;

    const cerrarConEscape = (event) => {
      if (event.key === "Escape") onCerrar();
    };

    document.addEventListener("keydown", cerrarConEscape);
    document.body.classList.add("dashboard-modal-open");

    return () => {
      document.removeEventListener("keydown", cerrarConEscape);
      document.body.classList.remove("dashboard-modal-open");
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      className="dashboard-modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCerrar();
      }}
    >
      <section
        className={`dashboard-modal dashboard-modal-${ancho}`}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
      >
        <header className="dashboard-modal-header">
          <div>
            <span>Gestión de pedidos</span>
            <h2>{titulo}</h2>
          </div>

          <button
            type="button"
            className="dashboard-modal-close"
            onClick={onCerrar}
            aria-label="Cerrar ventana"
          >
            ×
          </button>
        </header>

        <div className="dashboard-modal-body">{children}</div>
      </section>
    </div>
  );
}

function BuscadorPedidos({
  valor,
  onChange,
  pedidos,
  pedidoSeleccionado,
  onSeleccionar,
}) {
  return (
    <div className="pedido-selector">
      <label className="dashboard-field dashboard-field-full">
        <span>Buscar por código o tipo de prenda</span>
        <input
          type="search"
          value={valor}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Ejemplo: PED-001 o camiseta"
          autoFocus
        />
      </label>

      <div className="pedido-selector-list" role="listbox">
        {pedidos.length === 0 ? (
          <p className="dashboard-empty-message">
            No se encontraron pedidos con esa búsqueda.
          </p>
        ) : (
          pedidos.map((pedido) => (
            <button
              type="button"
              key={`${pedido.id}-${pedido.codigo}`}
              className={`pedido-selector-item ${
                pedidoSeleccionado && pedidosCoinciden(pedido, pedidoSeleccionado)
                  ? "is-selected"
                  : ""
              }`}
              onClick={() => onSeleccionar(pedido)}
              role="option"
              aria-selected={
                pedidoSeleccionado
                  ? pedidosCoinciden(pedido, pedidoSeleccionado)
                  : false
              }
            >
              <span>
                <strong>{pedido.codigo}</strong>
                <small>{pedido.tipoPrenda}</small>
              </span>

              <span>
                <strong>{pedido.maquila}</strong>
                <small>{pedido.estado}</small>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function CamposPedido({ formulario, onChange, deshabilitado = false }) {
  const manejarCambio = (event) => {
    const { name, value } = event.target;
    onChange((actual) => ({ ...actual, [name]: value }));
  };

  return (
    <div className="dashboard-form-grid">
      <label className="dashboard-field">
        <span>Código del pedido *</span>
        <input
          name="codigo_pedido"
          value={formulario.codigo_pedido}
          onChange={manejarCambio}
          disabled={deshabilitado}
          required
        />
      </label>

      <label className="dashboard-field">
        <span>ID de maquila *</span>
        <input
          type="number"
          min="1"
          name="id_maquila"
          value={formulario.id_maquila}
          onChange={manejarCambio}
          disabled={deshabilitado}
          required
        />
      </label>

      <label className="dashboard-field">
        <span>Tipo de prenda *</span>
        <input
          name="tipo_prenda"
          value={formulario.tipo_prenda}
          onChange={manejarCambio}
          disabled={deshabilitado}
          required
        />
      </label>

      <label className="dashboard-field">
        <span>Talla</span>
        <input
          name="talla"
          value={formulario.talla}
          onChange={manejarCambio}
          disabled={deshabilitado}
        />
      </label>

      <label className="dashboard-field">
        <span>Color</span>
        <input
          name="color"
          value={formulario.color}
          onChange={manejarCambio}
          disabled={deshabilitado}
        />
      </label>

      <label className="dashboard-field">
        <span>Cantidad *</span>
        <input
          type="number"
          min="1"
          name="cantidad"
          value={formulario.cantidad}
          onChange={manejarCambio}
          disabled={deshabilitado}
          required
        />
      </label>

      <label className="dashboard-field">
        <span>Fecha de ingreso</span>
        <input
          type="date"
          name="fecha_ingreso"
          value={formulario.fecha_ingreso}
          onChange={manejarCambio}
          disabled={deshabilitado}
        />
      </label>

      <label className="dashboard-field">
        <span>Fecha de entrega</span>
        <input
          type="date"
          name="fecha_entrega"
          value={formulario.fecha_entrega}
          onChange={manejarCambio}
          disabled={deshabilitado}
        />
      </label>

      <label className="dashboard-field">
        <span>Prioridad</span>
        <select
          name="prioridad"
          value={formulario.prioridad}
          onChange={manejarCambio}
          disabled={deshabilitado}
        >
          <option value="Baja">Baja</option>
          <option value="Media">Media</option>
          <option value="Alta">Alta</option>
          <option value="Urgente">Urgente</option>
        </select>
      </label>

      <label className="dashboard-field">
        <span>Estado</span>
        <select
          name="estado"
          value={formulario.estado}
          onChange={manejarCambio}
          disabled={deshabilitado}
        >
          <option value="Pendiente">Pendiente</option>
          <option value="En proceso">En proceso</option>
          <option value="Retrasado">Retrasado</option>
          <option value="Finalizado">Finalizado</option>
          <option value="Entregado">Entregado</option>
          <option value="Cancelado">Cancelado</option>
        </select>
      </label>

      <label className="dashboard-field dashboard-field-full">
        <span>Observaciones</span>
        <textarea
          name="observaciones"
          rows="4"
          value={formulario.observaciones}
          onChange={manejarCambio}
          disabled={deshabilitado}
        />
      </label>
    </div>
  );
}

function DetallesPedido({ pedido }) {
  if (!pedido) return null;

  return (
    <dl className="pedido-details-grid">
      <div>
        <dt>Código</dt>
        <dd>{pedido.codigo}</dd>
      </div>
      <div>
        <dt>Tipo de prenda</dt>
        <dd>{pedido.tipoPrenda}</dd>
      </div>
      <div>
        <dt>Maquila</dt>
        <dd>{pedido.maquila}</dd>
      </div>
      <div>
        <dt>ID de maquila</dt>
        <dd>{pedido.idMaquila || "Sin asignar"}</dd>
      </div>
      <div>
        <dt>Talla</dt>
        <dd>{pedido.talla}</dd>
      </div>
      <div>
        <dt>Color</dt>
        <dd>{pedido.color}</dd>
      </div>
      <div>
        <dt>Cantidad</dt>
        <dd>{pedido.cantidad}</dd>
      </div>
      <div>
        <dt>Estado</dt>
        <dd>{pedido.estado}</dd>
      </div>
      <div>
        <dt>Prioridad</dt>
        <dd>{pedido.prioridad}</dd>
      </div>
      <div>
        <dt>Fecha de ingreso</dt>
        <dd>{pedido.fechaIngreso}</dd>
      </div>
      <div>
        <dt>Fecha de entrega</dt>
        <dd>{pedido.fechaEntrega}</dd>
      </div>
      <div>
        <dt>Progreso</dt>
        <dd>{pedido.progreso}%</dd>
      </div>
      <div className="pedido-detail-full">
        <dt>Observaciones</dt>
        <dd>{pedido.observaciones}</dd>
      </div>
    </dl>
  );
}

/* =====================================================
   COMPONENTE PRINCIPAL
===================================================== */


function Icono({ nombre, size = 20, className = "" }) {
  const propiedades = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    "aria-hidden": true,
  };

  switch (nombre) {
    case "dashboard":
      return (
        <svg {...propiedades}>
          <rect x="3" y="3" width="7" height="7" rx="2" />
          <rect x="14" y="3" width="7" height="7" rx="2" />
          <rect x="3" y="14" width="7" height="7" rx="2" />
          <rect x="14" y="14" width="7" height="7" rx="2" />
        </svg>
      );
    case "orders":
      return (
        <svg {...propiedades}>
          <path d="M6 3h9l3 3v15H6z" />
          <path d="M14 3v4h4" />
          <path d="M9 11h6M9 15h6" />
        </svg>
      );
    case "plus":
      return (
        <svg {...propiedades}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "edit":
      return (
        <svg {...propiedades}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />
        </svg>
      );
    case "trash":
      return (
        <svg {...propiedades}>
          <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      );
    case "factory":
      return (
        <svg {...propiedades}>
          <path d="M3 21V9l6 3V8l6 4V5h6v16z" />
          <path d="M7 17h2M12 17h2M17 17h2" />
        </svg>
      );
    case "users":
      return (
        <svg {...propiedades}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...propiedades}>
          <path d="M20 6v5h-5" />
          <path d="M4 18v-5h5" />
          <path d="M18.5 9A7 7 0 0 0 6.2 6.2L4 8M5.5 15A7 7 0 0 0 17.8 17.8L20 16" />
        </svg>
      );
    case "search":
      return (
        <svg {...propiedades}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
      );
    case "bell":
      return (
        <svg {...propiedades}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );
    case "menu":
      return (
        <svg {...propiedades}>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
    case "chevron":
      return (
        <svg {...propiedades}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      );
    case "logout":
      return (
        <svg {...propiedades}>
          <path d="M10 17l5-5-5-5M15 12H3" />
          <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
        </svg>
      );
    case "package":
      return (
        <svg {...propiedades}>
          <path d="m21 8-9-5-9 5 9 5z" />
          <path d="M3 8v8l9 5 9-5V8M12 13v8" />
        </svg>
      );
    case "clock":
      return (
        <svg {...propiedades}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "alert":
      return (
        <svg {...propiedades}>
          <path d="M10.3 3.3 2.7 17a2 2 0 0 0 1.8 3h15a2 2 0 0 0 1.8-3L13.7 3.3a2 2 0 0 0-3.4 0z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
      );
    case "check":
      return (
        <svg {...propiedades}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 3 3 5-6" />
        </svg>
      );
    case "layers":
      return (
        <svg {...propiedades}>
          <path d="m12 2 9 5-9 5-9-5z" />
          <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
        </svg>
      );
    case "chart":
      return (
        <svg {...propiedades}>
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...propiedades}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
      );
    case "folder":
      return (
        <svg {...propiedades}>
          <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
        </svg>
      );
    case "tasks":
      return (
        <svg {...propiedades}>
          <path d="M4 7h4M4 12h4M4 17h4" />
          <path d="M11 7h9M11 12h9M11 17h9" />
          <path d="M9 6 7 8 5 6" />
          <path d="M9 11 7 13 5 11" />
          <path d="M9 16 7 18 5 16" />
        </svg>
      );
    case "more":
      return (
        <svg {...propiedades}>
          <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return null;
  }
}

function TarjetaKPI({ titulo, valor, detalle, icono, tono, onClick }) {
  const contenido = (
    <>
      <div className={`enterprise-kpi-icon enterprise-kpi-icon-${tono}`}>
        <Icono nombre={icono} size={23} />
      </div>
      <div className="enterprise-kpi-content">
        <span>{titulo}</span>
        <strong>{valor}</strong>
        <small>{detalle}</small>
      </div>
      {onClick && <Icono nombre="chevron" size={17} className="enterprise-kpi-arrow" />}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`enterprise-kpi-card enterprise-kpi-card-${tono}`}
        onClick={onClick}
      >
        {contenido}
      </button>
    );
  }

  return (
    <article className={`enterprise-kpi-card enterprise-kpi-card-${tono}`}>
      {contenido}
    </article>
  );
}

function GraficoDonutEstados({ activos, retrasados, finalizados }) {
  const total = activos + retrasados + finalizados;
  const porcentajeActivos = total ? (activos / total) * 100 : 0;
  const porcentajeRetrasados = total ? (retrasados / total) * 100 : 0;
  const limiteActivos = porcentajeActivos;
  const limiteRetrasados = porcentajeActivos + porcentajeRetrasados;

  const fondo = total
    ? `conic-gradient(
        #1677ff 0% ${limiteActivos}%,
        #f59e0b ${limiteActivos}% ${limiteRetrasados}%,
        #22a559 ${limiteRetrasados}% 100%
      )`
    : "conic-gradient(#e8ebf2 0% 100%)";

  return (
    <div className="enterprise-donut-layout">
      <div className="enterprise-donut" style={{ background: fondo }}>
        <div className="enterprise-donut-center">
          <strong>{total}</strong>
          <span>Pedidos</span>
        </div>
      </div>

      <div className="enterprise-chart-legend">
        <div>
          <span className="enterprise-legend-dot enterprise-legend-active" />
          <p>
            <strong>{activos}</strong>
            <small>Activos</small>
          </p>
        </div>
        <div>
          <span className="enterprise-legend-dot enterprise-legend-delayed" />
          <p>
            <strong>{retrasados}</strong>
            <small>Retrasados</small>
          </p>
        </div>
        <div>
          <span className="enterprise-legend-dot enterprise-legend-finished" />
          <p>
            <strong>{finalizados}</strong>
            <small>Finalizados</small>
          </p>
        </div>
      </div>
    </div>
  );
}

function construirDatosTendencia(pedidos, intervalo) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const crearRegistro = (clave, etiqueta) => ({
    clave,
    etiqueta,
    total: 0,
    unidades: 0,
  });

  let periodos = [];

  if (intervalo === "diario") {
    periodos = Array.from({ length: 7 }, (_, indice) => {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() - (6 - indice));
      const clave = fecha.toISOString().slice(0, 10);
      const etiqueta = new Intl.DateTimeFormat("es-EC", {
        weekday: "short",
      })
        .format(fecha)
        .replace(".", "");
      return crearRegistro(clave, etiqueta);
    });
  } else if (intervalo === "semanal") {
    periodos = Array.from({ length: 8 }, (_, indice) => {
      const fin = new Date(hoy);
      fin.setDate(hoy.getDate() - (7 - indice) * 7);
      const inicio = new Date(fin);
      inicio.setDate(fin.getDate() - 6);
      const clave = `${inicio.toISOString().slice(0, 10)}_${fin
        .toISOString()
        .slice(0, 10)}`;
      return crearRegistro(clave, `S${indice + 1}`);
    });
  } else {
    periodos = Array.from({ length: 6 }, (_, indice) => {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - (5 - indice), 1);
      const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      const etiqueta = new Intl.DateTimeFormat("es-EC", {
        month: "short",
      })
        .format(fecha)
        .replace(".", "");
      return crearRegistro(clave, etiqueta);
    });
  }

  pedidos.forEach((pedido) => {
    if (!pedido.fechaIngresoISO) return;

    const fecha = new Date(`${pedido.fechaIngresoISO}T00:00:00`);
    if (Number.isNaN(fecha.getTime())) return;

    let posicion = -1;

    if (intervalo === "diario") {
      posicion = periodos.findIndex(
        (periodo) => periodo.clave === pedido.fechaIngresoISO
      );
    } else if (intervalo === "semanal") {
      posicion = periodos.findIndex((periodo) => {
        const [inicio, fin] = periodo.clave.split("_");
        return pedido.fechaIngresoISO >= inicio && pedido.fechaIngresoISO <= fin;
      });
    } else {
      const clavePedido = `${fecha.getFullYear()}-${String(
        fecha.getMonth() + 1
      ).padStart(2, "0")}`;
      posicion = periodos.findIndex((periodo) => periodo.clave === clavePedido);
    }

    if (posicion >= 0) {
      periodos[posicion].total += 1;
      periodos[posicion].unidades += Number(pedido.cantidad || 0);
    }
  });

  return periodos;
}

function GraficoTendencia({ datos }) {
  const ancho = 620;
  const alto = 230;
  const margenX = 36;
  const margenSuperior = 24;
  const margenInferior = 46;
  const altoUtil = alto - margenSuperior - margenInferior;
  const maximo = Math.max(...datos.map((dato) => dato.total), 1);
  const separacion =
    datos.length > 1 ? (ancho - margenX * 2) / (datos.length - 1) : 0;

  const puntos = datos.map((dato, indice) => {
    const x = margenX + indice * separacion;
    const y = margenSuperior + altoUtil - (dato.total / maximo) * altoUtil;
    return { ...dato, x, y };
  });

  const ruta = puntos.map((punto) => `${punto.x},${punto.y}`).join(" ");

  return (
    <div className="enterprise-line-chart">
      <svg
        viewBox={`0 0 ${ancho} ${alto}`}
        role="img"
        aria-label="Tendencia de pedidos registrados"
      >
        {[0, 1, 2, 3].map((linea) => {
          const y = margenSuperior + (altoUtil / 3) * linea;
          return (
            <line
              key={linea}
              x1={margenX}
              y1={y}
              x2={ancho - margenX}
              y2={y}
              stroke="#e9ebf2"
              strokeWidth="1"
            />
          );
        })}

        <polyline
          points={ruta}
          fill="none"
          stroke="#5f67e8"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {puntos.map((punto) => (
          <g key={punto.clave}>
            <circle
              cx={punto.x}
              cy={punto.y}
              r="5"
              fill="#ffffff"
              stroke="#5f67e8"
              strokeWidth="3"
            />
            <text
              x={punto.x}
              y={punto.y - 13}
              textAnchor="middle"
              fontSize="12"
              fontWeight="700"
              fill="#252b42"
            >
              {punto.total}
            </text>
            <text
              x={punto.x}
              y={alto - 18}
              textAnchor="middle"
              fontSize="12"
              fill="#7a8299"
            >
              {punto.etiqueta}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function SupervisorDashboard({ usuario, onLogout }) {
  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false);
  const [menuCrearAbierto, setMenuCrearAbierto] = useState(false);
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const [busquedaGeneral, setBusquedaGeneral] = useState("");
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [busquedaInsumos, setBusquedaInsumos] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [rolNuevoUsuario, setRolNuevoUsuario] = useState(null);
  const [modalCrearPedidoAbierto, setModalCrearPedidoAbierto] = useState(false);
  const [modalMaquilaAbierto, setModalMaquilaAbierto] = useState(false);
  const [modalUsuariosAbierto, setModalUsuariosAbierto] = useState(false);
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false);
  const [modalEstadoAbierto, setModalEstadoAbierto] = useState(false);
  const [tipoEstadoModal, setTipoEstadoModal] = useState("");

  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [pedidosBackend, setPedidosBackend] = useState([]);
  const [seguimientos, setSeguimientos] = useState([]);
  const [insumosBackend, setInsumosBackend] = useState([]);
  const [maquilasBackend, setMaquilasBackend] = useState([]);
  const [controlCalidadBackend, setControlCalidadBackend] = useState([]);
  const [archivosBackend, setArchivosBackend] = useState([]);
  const [informesBackend, setInformesBackend] = useState([]);
  const [fasesBackend, setFasesBackend] = useState([]);
  const [tareasBackend, setTareasBackend] = useState([]);
  const [prendasBackend, setPrendasBackend] = useState([]);
  const [intervalo, setIntervalo] = useState("mensual");

  const [pedidoSeleccionadoId, setPedidoSeleccionadoId] = useState(null);

  const [busquedaEditar, setBusquedaEditar] = useState("");
  const [pedidoEditar, setPedidoEditar] = useState(null);
  const [formularioEditar, setFormularioEditar] = useState(FORMULARIO_VACIO);
  const [errorEditar, setErrorEditar] = useState("");

  const [busquedaEliminar, setBusquedaEliminar] = useState("");
  const [pedidoEliminar, setPedidoEliminar] = useState(null);
  const [etapaEliminar, setEtapaEliminar] = useState("seleccionar");
  const [errorEliminar, setErrorEliminar] = useState("");

  const menuRef = useRef(null);

  /* =====================================================
     CARGAR INFORMACIÓN DEL BACKEND
  ===================================================== */

  const cargarInformacion = useCallback(async (mostrarCargaPrincipal = true) => {
    if (mostrarCargaPrincipal) {
      setCargando(true);
    } else {
      setActualizando(true);
    }

    setError("");

    try {
      const [
        resultadoPedidos,
        resultadoSeguimientos,
        resultadoInsumos,
        resultadoMaquilas,
        resultadoControlCalidad,
        resultadoArchivos,
        resultadoInformes,
        resultadoFases,
        resultadoTareas,
        resultadoPrendas,
      ] = await Promise.allSettled([
        consultarPrimeraRutaDisponible(ENDPOINTS.pedidos),
        consultarPrimeraRutaDisponible(ENDPOINTS.seguimientos),
        consultarPrimeraRutaDisponible(ENDPOINTS.insumos),
        consultarPrimeraRutaDisponible(ENDPOINTS.maquilas),
        consultarPrimeraRutaDisponible(ENDPOINTS.controlCalidad),
        consultarPrimeraRutaDisponible(ENDPOINTS.archivos),
        consultarPrimeraRutaDisponible(ENDPOINTS.informes),
        consultarPrimeraRutaDisponible(ENDPOINTS.fases),
        consultarPrimeraRutaDisponible(ENDPOINTS.tareas),
        consultarPrimeraRutaDisponible(ENDPOINTS.prendas),
      ]);

      if (resultadoPedidos.status === "fulfilled") {
        setPedidosBackend(extraerLista(resultadoPedidos.value));
      } else {
        throw resultadoPedidos.reason;
      }

      if (resultadoSeguimientos.status === "fulfilled") {
        setSeguimientos(extraerLista(resultadoSeguimientos.value));
      } else {
        /*
         * Un pedido debe mostrarse aunque todavía no tenga seguimiento.
         * Por eso un error 404 en seguimiento no bloquea el dashboard.
         */
        setSeguimientos([]);
      }

      if (resultadoInsumos.status === "fulfilled") {
        setInsumosBackend(extraerLista(resultadoInsumos.value));
      } else {
        setInsumosBackend([]);
      }

      if (resultadoMaquilas.status === "fulfilled") {
        setMaquilasBackend(extraerLista(resultadoMaquilas.value));
      } else {
        setMaquilasBackend([]);
      }

      if (resultadoControlCalidad.status === "fulfilled") {
        setControlCalidadBackend(extraerLista(resultadoControlCalidad.value));
      } else {
        setControlCalidadBackend([]);
      }

      if (resultadoArchivos.status === "fulfilled") {
        setArchivosBackend(extraerLista(resultadoArchivos.value));
      } else {
        setArchivosBackend([]);
      }

      if (resultadoInformes.status === "fulfilled") {
        setInformesBackend(extraerLista(resultadoInformes.value));
      } else {
        setInformesBackend([]);
      }

      if (resultadoFases.status === "fulfilled") {
        setFasesBackend(extraerLista(resultadoFases.value));
      } else {
        setFasesBackend([]);
      }

      if (resultadoTareas.status === "fulfilled") {
        setTareasBackend(extraerLista(resultadoTareas.value));
      } else {
        setTareasBackend([]);
      }

      if (resultadoPrendas.status === "fulfilled") {
        setPrendasBackend(extraerLista(resultadoPrendas.value));
      } else {
        setPrendasBackend([]);
      }
    } catch (err) {
      console.error("Error al cargar pedidos:", err);
      setError(
        obtenerMensajeError(
          err,
          "No se pudieron cargar los pedidos. Revise que exista el endpoint /pedidos."
        )
      );
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useEffect(() => {
    cargarInformacion();
  }, [cargarInformacion]);

  /* Refresco silencioso para cambios hechos desde otra pantalla. */
  useEffect(() => {
    const intervaloActualizacion = window.setInterval(() => {
      cargarInformacion(false);
    }, 30000);

    return () => window.clearInterval(intervaloActualizacion);
  }, [cargarInformacion]);

  useEffect(() => {
    const cerrarMenu = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuUsuarioAbierto(false);
        setMenuCrearAbierto(false);
        setBuscadorAbierto(false);
      }
    };

    document.addEventListener("mousedown", cerrarMenu);

    return () => {
      document.removeEventListener("mousedown", cerrarMenu);
    };
  }, []);

  const pedidos = useMemo(
    () => combinarPedidosConSeguimientos(pedidosBackend, seguimientos),
    [pedidosBackend, seguimientos]
  );

  useEffect(() => {
    if (pedidos.length === 0) {
      setPedidoSeleccionadoId(null);
      return;
    }

    const seleccionadoExiste = pedidos.some(
      (pedido) => String(pedido.id) === String(pedidoSeleccionadoId)
    );

    if (!seleccionadoExiste) {
      setPedidoSeleccionadoId(pedidos[0].id);
    }
  }, [pedidos, pedidoSeleccionadoId]);

  const pedidosPorEstadoModal = useMemo(() => {
    return pedidos.filter((pedido) => {
      const tipo = obtenerTipoEstado(pedido);
      return tipo === tipoEstadoModal;
    });
  }, [pedidos, tipoEstadoModal]);

  const estadisticas = useMemo(() => {
    return pedidos.reduce(
      (resultado, pedido) => {
        const tipo = obtenerTipoEstado(pedido);

        if (tipo === "finalizado") resultado.finalizados += 1;
        else if (tipo === "retrasado") resultado.retrasados += 1;
        else resultado.activos += 1;

        return resultado;
      },
      { activos: 0, retrasados: 0, finalizados: 0 }
    );
  }, [pedidos]);

  const estadisticasMaquila = useMemo(() => {
    const grupos = {};

    pedidos.forEach((pedido) => {
      if (!grupos[pedido.maquila]) {
        grupos[pedido.maquila] = { total: 0, sumaProgreso: 0 };
      }

      grupos[pedido.maquila].total += 1;
      grupos[pedido.maquila].sumaProgreso += pedido.progreso;
    });

    return Object.entries(grupos)
      .map(([nombre, datos]) => ({
        nombre,
        progreso: Math.round(datos.sumaProgreso / datos.total),
      }))
      .sort((a, b) => b.progreso - a.progreso)
      .slice(0, 5);
  }, [pedidos]);

  const totalUnidades = useMemo(
    () => pedidos.reduce((total, pedido) => total + Number(pedido.cantidad || 0), 0),
    [pedidos]
  );

  const progresoPromedio = useMemo(() => {
    if (pedidos.length === 0) return 0;

    const suma = pedidos.reduce(
      (total, pedido) => total + Number(pedido.progreso || 0),
      0
    );

    return Math.round(suma / pedidos.length);
  }, [pedidos]);

  const maquilasActivas = useMemo(() => {
    return new Set(
      pedidos
        .map((pedido) => pedido.maquila)
        .filter((nombre) => nombre && nombre !== "Sin asignar")
    ).size;
  }, [pedidos]);

  const inventarioResumido = useMemo(() => {
    const totalStock = insumosBackend.reduce(
      (total, insumo) => total + obtenerStockInsumo(insumo),
      0
    );

    const bajos = insumosBackend.filter(
      (insumo) =>
        obtenerStockInsumo(insumo) <= obtenerStockMinimoInsumo(insumo)
    ).length;

    return {
      totalStock,
      totalInsumos: insumosBackend.length,
      insumosCriticos: bajos,
    };
  }, [insumosBackend]);

  const insumosCriticosDetalle = useMemo(() => {
    return insumosBackend
      .map((insumo) => ({
        codigo: obtenerTextoInsumo(insumo, ["codigo", "codigo_insumo", "codigo_pedido"], "Sin código"),
        nombre: obtenerTextoInsumo(insumo, ["nombre", "nombre_insumo", "descripcion", "descripcion_insumo"], "Sin nombre"),
        categoria: obtenerTextoInsumo(insumo, ["categoria", "tipo", "grupo"], "Sin categoría"),
        unidadMedida: obtenerTextoInsumo(insumo, ["unidad_medida", "unidad", "u_medida"], "und"),
        stockActual: obtenerStockInsumo(insumo),
        stockMinimo: obtenerStockMinimoInsumo(insumo),
        estado: obtenerTextoInsumo(insumo, ["estado", "status", "condicion"], "Sin estado"),
      }))
      .sort((a, b) => a.stockActual - b.stockActual)
      .slice(0, 8);
  }, [insumosBackend]);

  const insumosFiltrados = useMemo(() => {
    const termino = busquedaInsumos.trim().toLowerCase();
    if (!termino) return insumosCriticosDetalle;

    return insumosCriticosDetalle.filter((insumo) =>
      insumo.codigo.toLowerCase().includes(termino) ||
      insumo.nombre.toLowerCase().includes(termino) ||
      insumo.categoria.toLowerCase().includes(termino)
    );
  }, [insumosCriticosDetalle, busquedaInsumos]);

  const maquilasDisponibles = useMemo(
    () => maquilasBackend.length,
    [maquilasBackend]
  );

  const totalPrendas = useMemo(
    () => prendasBackend.length,
    [prendasBackend]
  );

  const totalFases = useMemo(
    () => fasesBackend.length,
    [fasesBackend]
  );

  const totalTareas = useMemo(
    () => tareasBackend.length,
    [tareasBackend]
  );

  const totalControlCalidad = useMemo(
    () => controlCalidadBackend.length,
    [controlCalidadBackend]
  );

  const totalInformes = useMemo(
    () => informesBackend.length,
    [informesBackend]
  );

  const totalArchivos = useMemo(
    () => archivosBackend.length,
    [archivosBackend]
  );

  const datosTendencia = useMemo(
    () => construirDatosTendencia(pedidos, intervalo),
    [pedidos, intervalo]
  );

  const pedidosTabla = useMemo(() => {
    const termino = busquedaGeneral.trim().toLowerCase();

    return pedidos.filter((pedido) => {
      const coincideBusqueda =
        !termino ||
        pedido.codigo.toLowerCase().includes(termino) ||
        pedido.tipoPrenda.toLowerCase().includes(termino) ||
        pedido.maquila.toLowerCase().includes(termino) ||
        pedido.estado.toLowerCase().includes(termino);

      const coincideEstado =
        filtroEstado === "todos" || obtenerTipoEstado(pedido) === filtroEstado;

      return coincideBusqueda && coincideEstado;
    });
  }, [pedidos, busquedaGeneral, filtroEstado]);

  const pedidosRecientes = useMemo(
    () => pedidosTabla.slice(0, 8),
    [pedidosTabla]
  );

  const resultadosBusqueda = useMemo(() => {
    const termino = busquedaGeneral.trim().toLowerCase();

    if (!termino) return [];

    return pedidos
      .filter(
        (pedido) =>
          pedido.codigo.toLowerCase().includes(termino) ||
          pedido.tipoPrenda.toLowerCase().includes(termino) ||
          pedido.maquila.toLowerCase().includes(termino) ||
          pedido.estado.toLowerCase().includes(termino)
      )
      .slice(0, 6);
  }, [pedidos, busquedaGeneral]);

  const alertasEntrega = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return pedidos
      .filter(
        (pedido) =>
          pedido.fechaEntregaISO && obtenerTipoEstado(pedido) !== "finalizado"
      )
      .map((pedido) => {
        const entrega = new Date(`${pedido.fechaEntregaISO}T00:00:00`);
        const diferencia = Math.round(
          (entrega.getTime() - hoy.getTime()) / 86400000
        );

        let tipo = "proxima";
        let mensajeAlerta = `Entrega en ${diferencia} días`;

        if (diferencia < 0) {
          tipo = "vencida";
          mensajeAlerta =
            diferencia === -1
              ? "La entrega venció ayer"
              : `La entrega venció hace ${Math.abs(diferencia)} días`;
        } else if (diferencia === 0) {
          tipo = "hoy";
          mensajeAlerta = "La entrega es hoy";
        } else if (diferencia === 1) {
          tipo = "manana";
          mensajeAlerta = "La entrega es mañana";
        }

        return { ...pedido, diferencia, tipo, mensajeAlerta };
      })
      .filter((pedido) => pedido.diferencia <= 1)
      .sort((a, b) => a.diferencia - b.diferencia);
  }, [pedidos]);

  const entregasManana = useMemo(
    () => alertasEntrega.filter((pedido) => pedido.tipo === "manana"),
    [alertasEntrega]
  );

  const calendarioActual = useMemo(() => {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = hoy.getMonth();
    const primerDia = new Date(anio, mes, 1).getDay();
    const totalDias = new Date(anio, mes + 1, 0).getDate();
    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);

    const entregasPorDia = pedidos.reduce((resultado, pedido) => {
      if (!pedido.fechaEntregaISO) return resultado;

      const fecha = new Date(`${pedido.fechaEntregaISO}T00:00:00`);

      if (
        Number.isNaN(fecha.getTime()) ||
        fecha.getFullYear() !== anio ||
        fecha.getMonth() !== mes
      ) {
        return resultado;
      }

      const dia = fecha.getDate();
      resultado[dia] = [...(resultado[dia] || []), pedido];
      return resultado;
    }, {});

    const celdas = [
      ...Array.from({ length: primerDia }, () => null),
      ...Array.from({ length: totalDias }, (_, indice) => indice + 1),
    ];

    while (celdas.length % 7 !== 0 || celdas.length < 35) {
      celdas.push(null);
    }

    return {
      titulo: new Intl.DateTimeFormat("es-EC", {
        month: "long",
        year: "numeric",
      }).format(hoy),
      celdas,
      hoy: hoy.getDate(),
      manana:
        manana.getFullYear() === anio && manana.getMonth() === mes
          ? manana.getDate()
          : null,
      entregasPorDia,
    };
  }, [pedidos]);

  const pedidoSeleccionado = useMemo(
    () =>
      pedidos.find(
        (pedido) => String(pedido.id) === String(pedidoSeleccionadoId)
      ) || pedidos[0] || null,
    [pedidos, pedidoSeleccionadoId]
  );

  const pedidosFiltradosEditar = useMemo(() => {
    const termino = busquedaEditar.trim().toLowerCase();

    if (!termino) return pedidos;

    return pedidos.filter(
      (pedido) =>
        pedido.codigo.toLowerCase().includes(termino) ||
        pedido.tipoPrenda.toLowerCase().includes(termino)
    );
  }, [pedidos, busquedaEditar]);

  const pedidosFiltradosEliminar = useMemo(() => {
    const termino = busquedaEliminar.trim().toLowerCase();

    if (!termino) return pedidos;

    return pedidos.filter(
      (pedido) =>
        pedido.codigo.toLowerCase().includes(termino) ||
        pedido.tipoPrenda.toLowerCase().includes(termino)
    );
  }, [pedidos, busquedaEliminar]);

  const nombreUsuario =
    usuario?.nombre ||
    `${usuario?.nombres || ""} ${usuario?.apellidos || ""}`.trim() ||
    usuario?.correo ||
    "Usuario";

  const nombreRol =
    usuario?.rol ||
    (Number(usuario?.id_rol) === 1 ? "Supervisor" : "Consulta");

  const reiniciarEditar = useCallback(() => {
    setModalEditarAbierto(false);
    setBusquedaEditar("");
    setPedidoEditar(null);
    setFormularioEditar(FORMULARIO_VACIO);
    setErrorEditar("");
  }, []);

  const cerrarEditar = useCallback(() => {
    if (!guardando) reiniciarEditar();
  }, [guardando, reiniciarEditar]);

  const reiniciarEliminar = useCallback(() => {
    setModalEliminarAbierto(false);
    setBusquedaEliminar("");
    setPedidoEliminar(null);
    setEtapaEliminar("seleccionar");
    setErrorEliminar("");
  }, []);

  const cerrarEliminar = useCallback(() => {
    if (!eliminando) reiniciarEliminar();
  }, [eliminando, reiniciarEliminar]);


  const abrirEditarPedido = (pedido = null) => {
    setModalEditarAbierto(true);
    setBusquedaEditar("");
    setPedidoEditar(pedido);
    setFormularioEditar(
      pedido ? crearFormularioDesdePedido(pedido) : FORMULARIO_VACIO
    );
    setErrorEditar("");
    setSidebarAbierto(false);
  };

  const abrirEliminarPedido = (pedido = null) => {
    setModalEliminarAbierto(true);
    setBusquedaEliminar("");
    setPedidoEliminar(pedido);
    setEtapaEliminar(pedido ? "confirmar" : "seleccionar");
    setErrorEliminar("");
    setSidebarAbierto(false);
  };

  const irASeccion = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setSidebarAbierto(false);
  };

  const abrirCrearUsuario = (rol) => {
    setRolNuevoUsuario(rol);
    setModalUsuariosAbierto(true);
  };

  const abrirModalEstado = (tipo) => {
    setTipoEstadoModal(tipo);
    setModalEstadoAbierto(true);
  };

  const cerrarModalEstado = useCallback(() => {
    setModalEstadoAbierto(false);
    setTipoEstadoModal("");
  }, []);

  const tituloModalEstado = {
    activo: "Pedidos activos",
    retrasado: "Pedidos retrasados",
    finalizado: "Pedidos finalizados",
  };

  /* =====================================================
     ACTUALIZAR PROGRESO DEL PEDIDO
  ===================================================== */

  const actualizarProgreso = async (pedido, porcentaje) => {
    const nuevoProgreso = Number(porcentaje);

    if (Number.isNaN(nuevoProgreso)) {
      setError("El porcentaje de progreso no es válido.");
      return;
    }

    setError("");

    try {
      const payload = {
        ...construirPayload(crearFormularioDesdePedido(pedido)),
        progreso: nuevoProgreso,
      };

      await actualizarPedidoDisponible(pedido.id, payload);

      setMensaje(
        `El progreso del pedido ${pedido.codigo} fue actualizado correctamente.`
      );

      await cargarInformacion(false);
    } catch (err) {
      console.error("Error actualizando progreso:", err);
      setError(
        obtenerMensajeError(
          err,
          "No se pudo actualizar el progreso del pedido."
        )
      );
    }
  };

  const manejarPedidoCreado = useCallback(
    async (pedidoCreado) => {
      setModalCrearPedidoAbierto(false);

      if (pedidoCreado && typeof pedidoCreado === "object") {
        const pedidoNormalizado = normalizarPedido(pedidoCreado);

        setPedidosBackend((actuales) => {
          const yaExiste = actuales.some((item, indice) =>
            pedidosCoinciden(
              normalizarPedido(item, indice),
              pedidoNormalizado
            )
          );

          return yaExiste ? actuales : [pedidoCreado, ...actuales];
        });

        setPedidoSeleccionadoId(pedidoNormalizado.id);
        setMensaje(
          `El pedido ${pedidoNormalizado.codigo} fue creado correctamente.`
        );
      } else {
        setMensaje("El pedido fue creado correctamente.");
      }

      await cargarInformacion(false);
    },
    [cargarInformacion]
  );

  const seleccionarPedidoEditar = (pedido) => {
    setPedidoEditar(pedido);
    setFormularioEditar(crearFormularioDesdePedido(pedido));
    setErrorEditar("");
  };

  const guardarEdicion = async (event) => {
    event.preventDefault();

    if (!pedidoEditar) {
      setErrorEditar("Primero seleccione el pedido que desea editar.");
      return;
    }

    if (!formularioEditar.codigo_pedido.trim()) {
      setErrorEditar("El código del pedido es obligatorio.");
      return;
    }

    if (!formularioEditar.tipo_prenda.trim()) {
      setErrorEditar("El tipo de prenda es obligatorio.");
      return;
    }

    if (
      !formularioEditar.cantidad ||
      Number(formularioEditar.cantidad) <= 0
    ) {
      setErrorEditar("La cantidad debe ser mayor que cero.");
      return;
    }

    if (
      formularioEditar.id_maquila !== "" &&
      Number(formularioEditar.id_maquila) <= 0
    ) {
      setErrorEditar("El ID de maquila debe ser mayor que cero.");
      return;
    }

    setGuardando(true);
    setErrorEditar("");

    try {
      const payload = construirPayload(formularioEditar);
      await actualizarPedidoDisponible(pedidoEditar.id, payload);
      await cargarInformacion(false);
      reiniciarEditar();
      setMensaje(
        `El pedido ${payload.codigo_pedido} fue actualizado correctamente.`
      );
    } catch (err) {
      console.error("Error al editar pedido:", err);
      setErrorEditar(
        obtenerMensajeError(err, "No se pudo actualizar el pedido.")
      );
    } finally {
      setGuardando(false);
    }
  };

  const seleccionarPedidoEliminar = (pedido) => {
    setPedidoEliminar(pedido);
    setEtapaEliminar("confirmar");
    setErrorEliminar("");
  };

  const eliminarPedido = async () => {
    if (!pedidoEliminar) return;

    setEliminando(true);
    setErrorEliminar("");

    try {
      await eliminarPedidoDisponible(pedidoEliminar.id);
      const codigoEliminado = pedidoEliminar.codigo;
      await cargarInformacion(false);
      reiniciarEliminar();
      setMensaje(`El pedido ${codigoEliminado} fue eliminado correctamente.`);
    } catch (err) {
      console.error("Error al eliminar pedido:", err);
      setErrorEliminar(
        obtenerMensajeError(err, "No se pudo eliminar el pedido.")
      );
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className={`enterprise-dashboard ${sidebarAbierto ? "sidebar-open" : ""}`}>
      <button
        type="button"
        className="enterprise-sidebar-overlay"
        onClick={() => setSidebarAbierto(false)}
        aria-label="Cerrar menú lateral"
      />

      <aside className="enterprise-sidebar">
        <div className="enterprise-sidebar-brand">
          <img src={logoMaquila} alt="Maquila System EC" />
          <div>
            <strong>Maquila System EC</strong>
            <span>Control y seguimiento de producción</span>
          </div>
        </div>

        <nav className="enterprise-sidebar-nav" aria-label="Menú principal">
          <span className="enterprise-sidebar-label">PRINCIPAL</span>

          <button
            type="button"
            className="enterprise-nav-item is-active"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              setSidebarAbierto(false);
            }}
          >
            <Icono nombre="dashboard" />
            <span>Panel General</span>
          </button>

          <button
            type="button"
            className="enterprise-nav-item"
            onClick={() => irASeccion("pedidos-recientes")}
          >
            <Icono nombre="orders" />
            <span>Pedidos</span>
            <span className="enterprise-nav-count">{pedidos.length}</span>
          </button>

          <button
            type="button"
            className="enterprise-nav-item"
            onClick={() => irASeccion("analitica-produccion")}
          >
            <Icono nombre="chart" />
            <span>Seguimiento</span>
          </button>

          <span className="enterprise-sidebar-label">GESTIÓN</span>

          <button
            type="button"
            className="enterprise-nav-item"
            onClick={() => {
              setModalCrearPedidoAbierto(true);
              setSidebarAbierto(false);
            }}
          >
            <Icono nombre="plus" />
            <span>Crear pedido</span>
          </button>

          <button
            type="button"
            className="enterprise-nav-item"
            onClick={() => abrirEditarPedido()}
          >
            <Icono nombre="edit" />
            <span>Editar pedido</span>
          </button>

          <button
            type="button"
            className="enterprise-nav-item"
            onClick={() => abrirEliminarPedido()}
          >
            <Icono nombre="trash" />
            <span>Eliminar pedido</span>
          </button>

          {Number(usuario?.id_rol) === 1 && (
            <>
              <button
                type="button"
                className="enterprise-nav-item"
                onClick={() => {
                  setModalMaquilaAbierto(true);
                  setSidebarAbierto(false);
                }}
              >
                <Icono nombre="factory" />
                <span>Maquilas</span>
              </button>

              <button
                type="button"
                className="enterprise-nav-item"
                onClick={() => {
                  abrirCrearUsuario(1);
                  setSidebarAbierto(false);
                }}
              >
                <Icono nombre="users" />
                <span>Usuarios</span>
              </button>
            </>
          )}

          <span className="enterprise-sidebar-label">OPERACIÓN</span>

          <button
            type="button"
            className="enterprise-nav-item"
            onClick={() => irASeccion("seccion-prendas")}
          >
            <Icono nombre="package" />
            <span>Prendas</span>
          </button>

          <button
            type="button"
            className="enterprise-nav-item"
            onClick={() => irASeccion("seccion-fases-tareas")}
          >
            <Icono nombre="tasks" />
            <span>Fases y Tareas</span>
          </button>

          <button
            type="button"
            className="enterprise-nav-item"
            onClick={() => irASeccion("seccion-insumos")}
          >
            <Icono nombre="layers" />
            <span>Insumos</span>
          </button>

          <button
            type="button"
            className="enterprise-nav-item"
            onClick={() => irASeccion("seccion-control-calidad")}
          >
            <Icono nombre="check" />
            <span>Control de calidad</span>
          </button>

          <button
            type="button"
            className="enterprise-nav-item"
            onClick={() => irASeccion("seccion-informes")}
          >
            <Icono nombre="chart" />
            <span>Informes</span>
          </button>

          <button
            type="button"
            className="enterprise-nav-item"
            onClick={() => irASeccion("seccion-archivos")}
          >
            <Icono nombre="folder" />
            <span>Archivos</span>
          </button>
        </nav>

        <div className="enterprise-sidebar-support">
          <div className="enterprise-support-icon">
            <Icono nombre="layers" size={20} />
          </div>
          <div>
            <strong>Sistema conectado</strong>
            <span> Maquila System Funcionando </span>
          </div>
        </div>

        <button
          type="button"
          className="enterprise-sidebar-logout"
          onClick={onLogout}
        >
          <Icono nombre="logout" />
          <span>Cerrar sesión</span>
        </button>
      </aside>

      <div className="enterprise-app-shell">
        <header className="enterprise-topbar">
          <div className="enterprise-topbar-left">
            <button
              type="button"
              className="enterprise-mobile-menu"
              onClick={() => setSidebarAbierto(true)}
              aria-label="Abrir menú lateral"
            >
              <Icono nombre="menu" size={22} />
            </button>

            <div>
              <span>Sistema de gestión y seguimiento de producción</span>
              <h1>Panel de administración</h1>
            </div>
          </div>

          <div className="enterprise-topbar-actions" ref={menuRef}>
            <div className="enterprise-global-search">
              <Icono nombre="search" size={18} />
              <input
                type="search"
                value={busquedaGeneral}
                onFocus={() => setBuscadorAbierto(true)}
                onChange={(event) => {
                  setBusquedaGeneral(event.target.value);
                  setBuscadorAbierto(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && resultadosBusqueda[0]) {
                    event.preventDefault();
                    const pedido = resultadosBusqueda[0];
                    setPedidoSeleccionadoId(pedido.id);
                    setFiltroEstado("todos");
                    setBuscadorAbierto(false);
                    window.requestAnimationFrame(() =>
                      irASeccion("pedidos-recientes")
                    );
                  }
                }}
                placeholder="Buscar pedido, prenda o maquila"
                aria-label="Buscar pedidos"
                autoComplete="off"
              />

              {busquedaGeneral && (
                <button
                  type="button"
                  className="enterprise-search-clear"
                  onClick={() => {
                    setBusquedaGeneral("");
                    setBuscadorAbierto(false);
                  }}
                  aria-label="Limpiar búsqueda"
                >
                  ×
                </button>
              )}

              {buscadorAbierto && busquedaGeneral.trim() && (
                <div className="enterprise-search-results">
                  {resultadosBusqueda.length === 0 ? (
                    <div className="enterprise-search-empty">
                      No se encontraron pedidos.
                    </div>
                  ) : (
                    resultadosBusqueda.map((pedido) => (
                      <button
                        type="button"
                        key={`buscar-${pedido.id}-${pedido.codigo}`}
                        onClick={() => {
                          setPedidoSeleccionadoId(pedido.id);
                          setBusquedaGeneral(pedido.codigo);
                          setFiltroEstado("todos");
                          setBuscadorAbierto(false);
                          window.requestAnimationFrame(() =>
                            irASeccion("pedidos-recientes")
                          );
                        }}
                      >
                        <span className="enterprise-search-result-icon">
                          <Icono nombre="package" size={16} />
                        </span>
                        <span>
                          <strong>{pedido.codigo}</strong>
                          <small>
                            {pedido.tipoPrenda} · {pedido.maquila}
                          </small>
                        </span>
                        <span className="enterprise-search-result-status">
                          {pedido.estado}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {Number(usuario?.id_rol) === 1 && (
              <div className="enterprise-create-wrapper">
                <button
                  type="button"
                  className="enterprise-new-button"
                  onClick={() => setMenuCrearAbierto((actual) => !actual)}
                  aria-expanded={menuCrearAbierto}
                >
                  <Icono nombre="plus" size={18} />
                  <span>Nuevo</span>
                </button>

                {menuCrearAbierto && (
                  <div className="enterprise-create-dropdown">
                    <button
                      type="button"
                      onClick={() => {
                        setModalCrearPedidoAbierto(true);
                        setMenuCrearAbierto(false);
                      }}
                    >
                      <Icono nombre="orders" size={18} />
                      Nuevo pedido
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalMaquilaAbierto(true);
                        setMenuCrearAbierto(false);
                      }}
                    >
                      <Icono nombre="factory" size={18} />
                      Nueva maquila
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        abrirCrearUsuario(1);
                        setMenuCrearAbierto(false);
                      }}
                    >
                      <Icono nombre="users" size={18} />
                      Nuevo usuario
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              className="enterprise-icon-button"
              onClick={() => irASeccion("calendario-notificaciones")}
              aria-label={`Notificaciones de entrega: ${alertasEntrega.length}`}
              title={`${alertasEntrega.length} notificación(es) de entrega`}
            >
              <Icono nombre="bell" size={20} />
              {alertasEntrega.length > 0 && (
                <span className="enterprise-notification-count">
                  {alertasEntrega.length > 9 ? "9+" : alertasEntrega.length}
                </span>
              )}
            </button>

            <div className="enterprise-user-wrapper">
              <button
                type="button"
                className="enterprise-user-button"
                onClick={() => setMenuUsuarioAbierto((actual) => !actual)}
                aria-expanded={menuUsuarioAbierto}
              >
                <span className="enterprise-user-avatar">
                  {nombreUsuario.charAt(0).toUpperCase()}
                </span>
                <span className="enterprise-user-copy">
                  <strong>{nombreUsuario}</strong>
                  <small>{nombreRol}</small>
                </span>
                <Icono nombre="chevron" size={15} />
              </button>

              {menuUsuarioAbierto && (
                <div className="enterprise-user-dropdown">
                  <div>
                    <strong>{nombreUsuario}</strong>
                    <span>{usuario?.correo || "Usuario del sistema"}</span>
                  </div>
                  <button type="button" onClick={onLogout}>
                    <Icono nombre="logout" size={17} />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="enterprise-main">
          <section className="enterprise-welcome">
            <div>
              <span className="enterprise-eyebrow">RESUMEN GENERAL</span>
              <h2>¡Bienvenido, {nombreUsuario.split(" ")[0]}!</h2>
              <p>
                Revise la operación de pedidos, producción y fechas de entrega
                desde un solo lugar.
              </p>
            </div>

            <div className="enterprise-date-card">
              <Icono nombre="calendar" size={20} />
              <div>
                <span>Fecha actual</span>
                <strong>
                  {new Intl.DateTimeFormat("es-EC", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  }).format(new Date())}
                </strong>
              </div>
            </div>
          </section>

          {error && (
            <div className="dashboard-error enterprise-alert-message">
              <Icono nombre="alert" size={19} />
              <span>{error}</span>
            </div>
          )}

          {mensaje && (
            <div
              className="dashboard-success enterprise-success-message"
              role="status"
            >
              <Icono nombre="check" size={19} />
              <span>{mensaje}</span>
              <button
                type="button"
                onClick={() => setMensaje("")}
                aria-label="Cerrar mensaje"
              >
                ×
              </button>
            </div>
          )}

          {entregasManana.length > 0 && (
            <button
              type="button"
              className="enterprise-tomorrow-reminder"
              onClick={() => irASeccion("calendario-notificaciones")}
            >
              <span className="enterprise-tomorrow-reminder-icon">
                <Icono nombre="bell" size={20} />
              </span>
              <span>
                <strong>Recordatorio de entrega</strong>
                <small>
                  {entregasManana.length === 1
                    ? `El pedido ${entregasManana[0].codigo} debe entregarse mañana.`
                    : `${entregasManana.length} pedidos deben entregarse mañana.`}
                </small>
              </span>
              <Icono nombre="chevron" size={18} />
            </button>
          )}
          <section className="enterprise-kpi-grid" aria-label="Indicadores principales">
            <TarjetaKPI
              titulo="Pedidos Activos"
              valor={cargando ? "..." : estadisticas.activos}
              detalle="En producción"
              icono="orders"
              tono="blue"
              onClick={() => irASeccion("pedidos-recientes")}
            />
            <TarjetaKPI
              titulo="Pedidos Retrasados"
              valor={cargando ? "..." : estadisticas.retrasados}
              detalle="Requieren atención"
              icono="clock"
              tono="orange"
              onClick={() => irASeccion("pedidos-recientes")}
            />
            <TarjetaKPI
              titulo="Pedidos Finalizados"
              valor={cargando ? "..." : estadisticas.finalizados}
              detalle="Este período"
              icono="check"
              tono="green"
              onClick={() => irASeccion("pedidos-recientes")}
            />
            <TarjetaKPI
              titulo="Maquilas Activas"
              valor={cargando ? "..." : maquilasDisponibles}
              detalle="Registradas"
              icono="factory"
              tono="purple"
            />
            <TarjetaKPI
              titulo="Tareas Pendientes"
              valor={cargando ? "..." : totalTareas}
              detalle="Por completar"
              icono="tasks"
              tono="yellow"
              onClick={() => irASeccion("seccion-fases-tareas")}
            />
            <TarjetaKPI
              titulo="Insumos Críticos"
              valor={cargando ? "..." : inventarioResumido.insumosCriticos}
              detalle="Stock bajo"
              icono="alert"
              tono="red"
              onClick={() => irASeccion("seccion-insumos")}
            />
          </section>

          <section className="enterprise-dashboard-summary" aria-label="Resumen de producción y disponibilidad">
            <article className="enterprise-card enterprise-status-card">
              <div className="enterprise-card-header">
                <div>
                  <span>ESTADO</span>
                  <h3>Estado de pedidos</h3>
                </div>
              </div>
              <GraficoDonutEstados
                activos={estadisticas.activos}
                retrasados={estadisticas.retrasados}
                finalizados={estadisticas.finalizados}
              />
            </article>

            <article className="enterprise-card">
              <div className="enterprise-card-header">
                <div>
                  <span>PRODUCCIÓN</span>
                  <h3>Producción por maquila</h3>
                </div>
              </div>
              <div className="enterprise-production-list">
                {estadisticasMaquila.length === 0 ? (
                  <div className="enterprise-empty-state">
                    No existen datos disponibles.
                  </div>
                ) : (
                  estadisticasMaquila.slice(0, 4).map((maquila) => (
                    <div className="enterprise-production-item" key={maquila.nombre}>
                      <div className="enterprise-production-title">
                        <span>{maquila.nombre}</span>
                        <strong>{maquila.progreso}%</strong>
                      </div>
                      <div className="enterprise-progress-track">
                        <div
                          className="enterprise-progress-value"
                          style={{ width: `${maquila.progreso}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="enterprise-card enterprise-inventory-card">
              <div className="enterprise-card-header">
                <div>
                  <span>MAQUILA</span>
                  <h3>Capacidad disponible</h3>
                </div>
              </div>
              <div className="enterprise-inventory-summary">
                <div className="enterprise-inventory-header">
                  <div>
                    <strong>{cargando ? "..." : maquilasDisponibles}</strong>
                    <span>Maquilas disponibles</span>
                  </div>
                  <div>
                    <strong>{cargando ? "..." : estadisticasMaquila.length}</strong>
                    <span>Maquilas totales</span>
                  </div>
                </div>
                <div className="enterprise-inventory-list">
                  <div className="enterprise-inventory-item">
                    <span>Pedidos en proceso</span>
                    <strong>{cargando ? "..." : totalUnidades}</strong>
                  </div>
                  <div className="enterprise-inventory-item">
                    <span>Progreso promedio</span>
                    <strong>{cargando ? "..." : `${progresoPromedio}%`}</strong>
                  </div>
                </div>
              </div>
            </article>

            <article className="enterprise-card enterprise-inventory-card">
              <div className="enterprise-card-header">
                <div>
                  <span>INSUMOS</span>
                  <h3>Stock y urgencias</h3>
                </div>
              </div>
              <div className="enterprise-inventory-summary">
                <div className="enterprise-inventory-header">
                  <div>
                    <strong>{cargando ? "..." : inventarioResumido.totalInsumos}</strong>
                    <span>Insumos registrados</span>
                  </div>
                  <div>
                    <strong>{cargando ? "..." : inventarioResumido.totalStock.toLocaleString("es-EC")}</strong>
                    <span>Stock total</span>
                  </div>
                </div>
                <div className="enterprise-inventory-list">
                  <div className="enterprise-inventory-item">
                    <span>Insumos críticos</span>
                    <strong>{cargando ? "..." : inventarioResumido.insumosCriticos}</strong>
                  </div>
                  <div className="enterprise-inventory-item">
                    <span>Stock normal</span>
                    <strong>{cargando ? "..." : inventarioResumido.totalStock - inventarioResumido.insumosCriticos}</strong>
                  </div>
                </div>
              </div>
            </article>
          </section>

          <section className="enterprise-inventory-dashboard">
            <article className="enterprise-card enterprise-inventory-overview-card">
              <div className="enterprise-section-header">
                <div>
                  <span>Inventario de insumos</span>
                  <h3>Aquí tienes un resumen general del sistema.</h3>
                </div>
                <button
                  type="button"
                  className="enterprise-refresh-button"
                  onClick={() => cargarInformacion(false)}
                >
                  Contar insumos
                </button>
              </div>

              <div className="enterprise-inventory-alert-grid">
                <article className="enterprise-small-card inventory-alert-card">
                  <span>Alertas de inventario</span>
                  <strong>{cargando ? "..." : `${inventarioResumido.insumosCriticos} insumos críticos`}</strong>
                  <small>
                    {cargando
                      ? "Cargando..."
                      : insumosCriticosDetalle.length > 0
                      ? insumosCriticosDetalle
                          .slice(0, 2)
                          .map((item) => item.codigo)
                          .join(", ") +
                        (insumosCriticosDetalle.length > 2 ? " ..." : "")
                      : "No hay alertas críticas."}
                  </small>
                </article>

                <article className="enterprise-small-card inventory-stock-card">
                  <span>Stock crítico</span>
                  <strong>{cargando ? "..." : inventarioResumido.insumosCriticos}</strong>
                  <small>Requieren atención inmediata</small>
                </article>

                <article className="enterprise-small-card inventory-trend-card">
                  <span>Resumen</span>
                  <strong>{cargando ? "..." : `${inventarioResumido.totalInsumos} insumos`}</strong>
                  <small>{cargando ? "..." : `${Math.max(0, inventarioResumido.totalStock - inventarioResumido.insumosCriticos)} con stock adecuado`}</small>
                </article>
              </div>

              <div className="enterprise-inventory-table-card">
                <div className="enterprise-table-toolbar">
                  <div className="enterprise-global-search">
                    <Icono nombre="search" size={16} />
                    <input
                      type="search"
                      value={busquedaInsumos}
                      onChange={(event) => setBusquedaInsumos(event.target.value)}
                      placeholder="Buscar insumo"
                      aria-label="Buscar insumo"
                    />
                  </div>
                </div>

                <div className="enterprise-table-wrapper">
                  <table className="enterprise-orders-table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Nombre insumo</th>
                        <th>Categoría</th>
                        <th>Stock actual</th>
                        <th>Stock mínimo</th>
                        <th>Unidad</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insumosFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="dashboard-empty">
                            No hay insumos críticos o no se encontraron datos.
                          </td>
                        </tr>
                      ) : (
                        insumosFiltrados.map((insumo, index) => (
                          <tr key={`insumo-${index}`}>
                            <td>{insumo.codigo}</td>
                            <td>{insumo.nombre}</td>
                            <td>{insumo.categoria}</td>
                            <td>{insumo.stockActual}</td>
                            <td>{insumo.stockMinimo}</td>
                            <td>{insumo.unidadMedida}</td>
                            <td>{insumo.estado}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </article>
          </section>
          <section className="enterprise-calendar-notifications-grid" id="calendario-notificaciones">
            <article className="enterprise-card enterprise-calendar-card">
              <div className="enterprise-card-header">
                <div>
                  <span>CALENDARIO</span>
                  <h3>Entrega y fechas clave</h3>
                </div>
              </div>
              <div className="enterprise-calendar-simple">
                <div className="calendar-header">
                  <strong>{calendarioActual.titulo}</strong>
                </div>
                <div className="calendar-days">
                  {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'].map((dia) => (
                    <span key={dia}>{dia}</span>
                  ))}
                </div>
                <div className="calendar-grid">
                  {calendarioActual.celdas.map((dia, indice) => {
                    if (!dia) {
                      return <span key={`vacio-${indice}`} className="calendar-empty" />;
                    }
                    const entregasDia = calendarioActual.entregasPorDia[dia] || [];
                    const clases = [
                      dia === calendarioActual.hoy ? 'active-day' : '',
                      entregasDia.length > 0 ? 'delivery-day' : '',
                      dia === calendarioActual.manana && entregasDia.some((pedido) => obtenerTipoEstado(pedido) !== 'finalizado')
                        ? 'delivery-tomorrow'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ');
                    return (
                      <span
                        key={`dia-${dia}`}
                        className={clases}
                        title={
                          entregasDia.length
                            ? entregasDia.map((pedido) => pedido.codigo).join(', ')
                            : undefined
                        }
                      >
                        {dia}
                        {entregasDia.length > 0 && <i>{entregasDia.length}</i>}
                      </span>
                    );
                  })}
                </div>
                <div className="calendar-legend">
                  <span>
                    <i className="calendar-legend-today" /> Hoy
                  </span>
                  <span>
                    <i className="calendar-legend-delivery" /> Entrega
                  </span>
                  <span>
                    <i className="calendar-legend-tomorrow" /> Mañana
                  </span>
                </div>
              </div>
            </article>

            <article className="enterprise-card enterprise-notifications-card">
              <div className="enterprise-card-header">
                <div>
                  <span>NOTIFICACIONES</span>
                  <h3>Alertas de entrega</h3>
                </div>
              </div>
              <div className="enterprise-delivery-alerts-list">
                {alertasEntrega.length === 0 ? (
                  <div className="enterprise-delivery-alerts-empty">
                    <Icono nombre="check" size={22} />
                    <strong>Sin alertas</strong>
                    <span>No hay alertas críticas en este momento.</span>
                  </div>
                ) : (
                  alertasEntrega.slice(0, 6).map((pedido) => (
                    <button
                      type="button"
                      key={`alerta-${pedido.id}-${pedido.codigo}`}
                      className={`enterprise-delivery-alert enterprise-delivery-alert-${pedido.tipo}`}
                      onClick={() => {
                        setPedidoSeleccionadoId(pedido.id);
                        setBusquedaGeneral(pedido.codigo);
                        setFiltroEstado('todos');
                        window.requestAnimationFrame(() => irASeccion('pedidos-recientes'));
                      }}
                    >
                      <span className="enterprise-delivery-alert-icon">
                        <Icono nombre={pedido.tipo === 'vencida' ? 'alert' : 'clock'} size={17} />
                      </span>
                      <span>
                        <strong>{pedido.codigo}</strong>
                        <small>{pedido.mensajeAlerta}</small>
                        <em>
                          {pedido.tipoPrenda} · {pedido.fechaEntrega}
                        </em>
                      </span>
                      <Icono nombre="chevron" size={15} />
                    </button>
                  ))
                )}
              </div>
            </article>
          </section>

          <article className="enterprise-card enterprise-machines-card">
            <div className="enterprise-card-header">
              <div>
                <span>MAQUILAS E INSUMOS</span>
                <h3>Disponibilidad del turno</h3>
              </div>
            </div>
            <div className="enterprise-inventory-availability">
              <div>
                <strong>{cargando ? '...' : maquilasDisponibles}</strong>
                <span>Maquilas disponibles</span>
              </div>
              <div>
                <strong>{cargando ? '...' : inventarioResumido.totalStock.toLocaleString('es-EC')}</strong>
                <span>Stock total</span>
              </div>
              <div>
                <strong>{cargando ? '...' : inventarioResumido.insumosCriticos}</strong>
                <span>Insumos críticos</span>
              </div>
            </div>
            <div className="enterprise-machines-note">
              <small>Monitoreo rápido de maquilas e insumos disponibles para la próxima entrega.</small>
            </div>
          </article>

          <section className="enterprise-orders-section" id="pedidos-recientes">
            <div className="enterprise-section-header">
              <div>
                <span>OPERACIÓN RECIENTE</span>
                <h3>Pedidos recientes</h3>
              </div>
              <button
                type="button"
                className="enterprise-refresh-button"
                onClick={() => cargarInformacion(false)}
              >
                <Icono nombre="refresh" size={15} />
                Actualizar
              </button>
            </div>

            <div className="enterprise-table-wrapper">
              <table className="enterprise-orders-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Prenda</th>
                    <th>Maquila / Taller</th>
                    <th>Cantidad</th>
                    <th>Estado</th>
                    <th>Entrega</th>
                    <th>Progreso</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosRecientes.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="dashboard-empty">
                        No hay pedidos recientes.
                      </td>
                    </tr>
                  ) : (
                    pedidosRecientes.map((pedido) => (
                      <tr
                        key={`${pedido.id}-${pedido.codigo}`}
                        onClick={() => {
                          setPedidoSeleccionadoId(pedido.id);
                          setBusquedaGeneral(pedido.codigo);
                        }}
                      >
                        <td>{pedido.codigo}</td>
                        <td>{pedido.tipoPrenda}</td>
                        <td>{pedido.maquila}</td>
                        <td>{pedido.cantidad}</td>
                        <td>
                          <span className={`status-badge status-badge-${obtenerTipoEstado(pedido)}`}>
                            {pedido.estado}
                          </span>
                        </td>
                        <td>{pedido.fechaEntrega}</td>
                        <td>
                          <div className="progress-content">
                            <div className="progress-track">
                              <div className="progress-value" style={{ width: `${pedido.progreso}%` }} />
                            </div>
                            <span>{pedido.progreso}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section id="seccion-prendas" className="enterprise-prendas-section">
            <Prendas
              onDatosActualizados={(lista) => {
                setPrendasBackend(lista);
              }}
            />
          </section>

          <section className="enterprise-dashboard-final-grid">
            <article className="enterprise-final-card ficha-card">
              <div className="enterprise-card-header">
                <div>
                  <span>DETALLE</span>
                  <h3>Ficha técnica de la prenda</h3>
                </div>
              </div>
              <div className="enterprise-final-list compact">
                <div>
                  <strong>Código</strong>
                  <span>{pedidoSeleccionado?.codigo || 'N/A'}</span>
                </div>
                <div>
                  <strong>Prenda</strong>
                  <span>{pedidoSeleccionado?.tipoPrenda || 'Sin datos'}</span>
                </div>
                <div>
                  <strong>Color</strong>
                  <span>{pedidoSeleccionado?.color || 'Sin datos'}</span>
                </div>
                <div>
                  <strong>Talla</strong>
                  <span>{pedidoSeleccionado?.talla || 'Sin datos'}</span>
                </div>
                <div>
                  <strong>Cantidad</strong>
                  <span>{pedidoSeleccionado?.cantidad || '0'}</span>
                </div>
                <div>
                  <strong>Estado</strong>
                  <span>{pedidoSeleccionado?.estado || 'Pendiente'}</span>
                </div>
                <div>
                  <strong>Entrega</strong>
                  <span>{pedidoSeleccionado?.fechaEntrega || 'Sin fecha'}</span>
                </div>
              </div>
            </article>

            <article className="enterprise-final-card fases-card">
              <div className="enterprise-card-header">
                <div>
                  <span>FASES Y TAREAS</span>
                  <h3>Flujo de producción</h3>
                </div>
              </div>
              <div className="enterprise-final-list compact">
                <div>
                  <strong>Fases registradas</strong>
                  <span>{cargando ? '...' : totalFases}</span>
                </div>
                <div>
                  <strong>Tareas en el sistema</strong>
                  <span>{cargando ? '...' : totalTareas}</span>
                </div>
                <div>
                  <strong>Control calidad</strong>
                  <span>{cargando ? '...' : totalControlCalidad}</span>
                </div>
              </div>
              <div className="enterprise-final-summary">
                {(tareasBackend.slice(0, 4) || []).map((tarea, index) => (
                  <div key={`tarea-${index}`}>
                    <strong>{tarea.nombre || tarea.tarea || `Tarea ${index + 1}`}</strong>
                    <span>{tarea.estado || tarea.status || 'Pendiente'}</span>
                  </div>
                ))}
              </div>
            </article>

            <div className="enterprise-final-column">
              <article className="enterprise-final-card">
                <div className="enterprise-card-header">
                  <div>
                    <span>INSUMOS</span>
                    <h3>Gestión de insumos</h3>
                  </div>
                </div>
                <div className="enterprise-final-list compact">
                  {(insumosBackend.slice(0, 3) || []).map((insumo, index) => (
                    <div key={`insumo-${index}`}>
                      <strong>{insumo.codigo || insumo.nombre || `Insumo ${index + 1}`}</strong>
                      <span>{`Stock ${insumo.stock_actual ?? insumo.stock ?? 'N/A'}`}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="enterprise-final-card">
                <div className="enterprise-card-header">
                  <div>
                    <span>CONTROL DE CALIDAD</span>
                    <h3>Revisiones recientes</h3>
                  </div>
                </div>
                <div className="enterprise-final-list compact">
                  {(controlCalidadBackend.slice(0, 3) || []).map((item, index) => (
                    <div key={`qc-${index}`}>
                      <strong>{item.codigo_insumo || item.codigo_pedido || `QC ${index + 1}`}</strong>
                      <span>{item.resultado || item.estado || 'Pendiente'}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="enterprise-final-card">
                <div className="enterprise-card-header">
                  <div>
                    <span>ARCHIVOS E INFORMES</span>
                    <h3>Documentos recientes</h3>
                  </div>
                </div>
                <div className="enterprise-final-list compact">
                  {(archivosBackend.slice(0, 2) || []).map((archivo, index) => (
                    <div key={`archivo-${index}`}>
                      <strong>{archivo.nombre || archivo.archivo || `Archivo ${index + 1}`}</strong>
                      <span>{archivo.tipo || archivo.extension || 'PDF'}</span>
                    </div>
                  ))}
                  {(informesBackend.slice(0, 2) || []).map((informe, index) => (
                    <div key={`informe-${index}`}>
                      <strong>{informe.titulo || informe.nombre || `Informe ${index + 1}`}</strong>
                      <span>{informe.fecha || informe.created_at || 'Sin fecha'}</span>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>
        </main>
      </div>

      <CrearPedidoModal
        abierto={modalCrearPedidoAbierto}
        onCerrar={() => setModalCrearPedidoAbierto(false)}
        onPedidoCreado={manejarPedidoCreado}
      />

      <CrearMaquilaModal
        abierto={modalMaquilaAbierto}
        onCerrar={() => setModalMaquilaAbierto(false)}
        onMaquilaCreada={() => {
          cargarInformacion(false);
          setMensaje("Maquila creada correctamente.");
        }}
      />

      <UsuariosModal
        abierto={modalUsuariosAbierto}
        rolInicial={rolNuevoUsuario}
        onCerrar={() => {
          setModalUsuariosAbierto(false);
          setRolNuevoUsuario(null);
        }}
      />

      <ModalBase
        abierto={modalEditarAbierto}
        titulo="Editar pedido existente"
        onCerrar={cerrarEditar}
        ancho="grande"
      >
        {errorEditar && (
          <div className="dashboard-modal-error">{errorEditar}</div>
        )}

        <div className="dashboard-modal-columns">
          <BuscadorPedidos
            valor={busquedaEditar}
            onChange={setBusquedaEditar}
            pedidos={pedidosFiltradosEditar}
            pedidoSeleccionado={pedidoEditar}
            onSeleccionar={seleccionarPedidoEditar}
          />

          <form className="dashboard-edit-form" onSubmit={guardarEdicion}>
            {pedidoEditar ? (
              <>
                <div className="dashboard-selected-order">
                  <span>Editando</span>
                  <strong>{pedidoEditar.codigo}</strong>
                </div>

                <CamposPedido
                  formulario={formularioEditar}
                  onChange={setFormularioEditar}
                  deshabilitado={guardando}
                />

                <div className="dashboard-modal-actions">
                  <button
                    type="button"
                    className="dashboard-secondary-button"
                    onClick={cerrarEditar}
                    disabled={guardando}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="dashboard-primary-button"
                    disabled={guardando}
                  >
                    {guardando ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </>
            ) : (
              <div className="dashboard-modal-placeholder">
                <strong>Seleccione un pedido</strong>
                <p>
                  Busque por código o tipo de prenda y presione el pedido que
                  desea modificar.
                </p>
              </div>
            )}
          </form>
        </div>
      </ModalBase>

      <ModalBase
        abierto={modalEliminarAbierto}
        titulo="Eliminar pedido"
        onCerrar={cerrarEliminar}
        ancho="grande"
      >
        {errorEliminar && (
          <div className="dashboard-modal-error">{errorEliminar}</div>
        )}

        {etapaEliminar === "seleccionar" && (
          <>
            <p className="dashboard-modal-description">
              Busque y seleccione el pedido que desea eliminar.
            </p>

            <BuscadorPedidos
              valor={busquedaEliminar}
              onChange={setBusquedaEliminar}
              pedidos={pedidosFiltradosEliminar}
              pedidoSeleccionado={pedidoEliminar}
              onSeleccionar={seleccionarPedidoEliminar}
            />
          </>
        )}

        {etapaEliminar === "confirmar" && pedidoEliminar && (
          <div className="delete-confirmation">
            <div className="delete-warning-icon">!</div>
            <h3>¿Está seguro de eliminar este pedido?</h3>
            <p>
              Pedido <strong>{pedidoEliminar.codigo}</strong> —{" "}
              {pedidoEliminar.tipoPrenda}. Esta acción no se puede deshacer.
            </p>

            <div className="dashboard-modal-actions dashboard-modal-actions-center">
              <button
                type="button"
                className="dashboard-secondary-button"
                onClick={() => {
                  setPedidoEliminar(null);
                  setEtapaEliminar("seleccionar");
                }}
                disabled={eliminando}
              >
                No, regresar
              </button>

              <button
                type="button"
                className="dashboard-danger-button"
                onClick={() => setEtapaEliminar("detalles")}
                disabled={eliminando}
              >
                Sí, mostrar detalles
              </button>
            </div>
          </div>
        )}

        {etapaEliminar === "detalles" && pedidoEliminar && (
          <div>
            <div className="dashboard-delete-details-title">
              <div>
                <span>Revise todos los datos antes de eliminar</span>
                <h3>{pedidoEliminar.codigo}</h3>
              </div>
            </div>

            <DetallesPedido pedido={pedidoEliminar} />

            <div className="dashboard-final-warning">
              Al presionar “Eliminar definitivamente”, el pedido será borrado
              del sistema.
            </div>

            <div className="dashboard-modal-actions">
              <button
                type="button"
                className="dashboard-secondary-button"
                onClick={() => setEtapaEliminar("confirmar")}
                disabled={eliminando}
              >
                Regresar
              </button>

              <button
                type="button"
                className="dashboard-danger-button"
                onClick={eliminarPedido}
                disabled={eliminando}
              >
                {eliminando ? "Eliminando..." : "Eliminar definitivamente"}
              </button>
            </div>
          </div>
        )}
      </ModalBase>

      <ModalBase
        abierto={modalEstadoAbierto}
        titulo={tituloModalEstado[tipoEstadoModal] || "Pedidos por estado"}
        onCerrar={cerrarModalEstado}
        ancho="grande"
      >
        <div className="dashboard-table-wrapper">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Prenda</th>
                <th>Estado</th>
                <th>Entrega</th>
                <th>Progreso</th>
                <th>Avance</th>
              </tr>
            </thead>

            <tbody>
              {pedidosPorEstadoModal.length === 0 && (
                <tr>
                  <td colSpan="6" className="dashboard-empty">
                    No existen pedidos en esta categoría.
                  </td>
                </tr>
              )}

              {pedidosPorEstadoModal.map((pedido) => (
                <tr key={`${pedido.id}-${pedido.codigo}`}>
                  <td>
                    <strong>{pedido.codigo}</strong>
                  </td>
                  <td>{pedido.tipoPrenda}</td>
                  <td>
                    <span
                      className={`status-badge status-badge-${obtenerTipoEstado(
                        pedido
                      )}`}
                    >
                      {pedido.estado}
                    </span>
                  </td>
                  <td>{pedido.fechaEntrega}</td>
                  <td>
                    <select
                      value={pedido.progreso}
                      onChange={(event) =>
                        actualizarProgreso(pedido, event.target.value)
                      }
                      aria-label={`Actualizar progreso de ${pedido.codigo}`}
                    >
                      {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(
                        (valor) => (
                          <option key={valor} value={valor}>
                            {valor}%
                          </option>
                        )
                      )}
                    </select>
                  </td>
                  <td>
                    <div className="progress-content">
                      <div className="progress-track">
                        <div
                          className="progress-value"
                          style={{ width: `${pedido.progreso}%` }}
                        />
                      </div>
                      <span>{pedido.progreso}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ModalBase>
    </div>
  );
}


export default SupervisorDashboard;