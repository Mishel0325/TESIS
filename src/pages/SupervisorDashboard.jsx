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
import CrearMaquilaModal from "../components/CrearMaquilaModal";
import UsuariosModal from "../components/UsuariosModal";
/*
 * IMPORTANTE:
 * La primera ruta debe ser la ruta real de tu backend.
 * El código prueba las siguientes únicamente cuando recibe 404 o 405.
 */
const ENDPOINTS = {
  pedidos: ["/pedidos/"],
  seguimientos: ["/seguimiento/", "/seguimientos/"],
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

function SupervisorDashboard({ usuario, onLogout }) {
  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false);
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
      const [resultadoPedidos, resultadoSeguimientos] = await Promise.allSettled([
        consultarPrimeraRutaDisponible(ENDPOINTS.pedidos),
        consultarPrimeraRutaDisponible(ENDPOINTS.seguimientos),
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
    usuario?.rol || (usuario?.id_rol === 2 ? "Supervisora" : "Usuario");

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
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-brand">
            <img
              src={logoMaquila}
              alt="Maquila System EC"
              className="dashboard-logo"
            />

            <div className="dashboard-brand-text">
              <strong>Maquila System EC</strong>
              <span>Control y seguimiento de producción</span>
            </div>
          </div>

          <div className="dashboard-user-menu" ref={menuRef}>
            <button
              type="button"
              className="dashboard-user-button"
              onClick={() => setMenuUsuarioAbierto((actual) => !actual)}
              aria-expanded={menuUsuarioAbierto}
            >
              <span className="dashboard-user-avatar">
                {nombreUsuario.charAt(0).toUpperCase()}
              </span>

              <span className="dashboard-user-information">
                <strong>{nombreUsuario}</strong>
                <small>{nombreRol}</small>
              </span>

              <span className="dashboard-chevron">
                {menuUsuarioAbierto ? "▲" : "▼"}
              </span>
            </button>

            {menuUsuarioAbierto && (
              <div className="dashboard-dropdown">
                <div className="dashboard-dropdown-user">
                  <strong>{nombreUsuario}</strong>
                  <span>{usuario?.correo}</span>
                </div>

                <div className="dashboard-dropdown-divider" />

                <button
                  type="button"
                  className="dashboard-logout-button"
                  onClick={onLogout}
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-welcome">
          <div>
            <span>Panel de control general</span>
            <h1>Bienvenida, {nombreUsuario}</h1>
            <p>Consulte el estado de pedidos, maquilas y fechas de entrega.</p>
          </div>

          <div className="dashboard-date">
            {new Intl.DateTimeFormat("es-EC", {
              dateStyle: "full",
            }).format(new Date())}
          </div>
        </section>

        {error && <div className="dashboard-error">{error}</div>}

        {mensaje && (
          <div className="dashboard-success" role="status">
            <span>{mensaje}</span>
            <button type="button" onClick={() => setMensaje("")}>
              ×
            </button>
          </div>
        )}

        {/* RESUMEN: SE RETIRÓ TAREAS REGISTRADAS */}
        <section className="dashboard-summary dashboard-summary-three">
          <article
          className="summary-card summary-active"
          onClick={() => abrirModalEstado("activo")}
          >
            <div>
              <span>Pedidos activos</span>
              <strong>{cargando ? "..." : estadisticas.activos}</strong>
              </div>
              <div className="summary-icon">↻</div>
              </article>
              
              <article
              className="summary-card summary-delayed"
              onClick={() => abrirModalEstado("retrasado")}
              >

            <div>
              <span>Pedidos retrasados</span>
              <strong>{cargando ? "..." : estadisticas.retrasados}</strong>
            </div>
            <div className="summary-icon">!</div>
          </article>
          
          <article
          className="summary-card summary-finished"
          onClick={() => abrirModalEstado("finalizado")}
          >
            <div>
              <span>Pedidos finalizados</span>
              <strong>{cargando ? "..." : estadisticas.finalizados}</strong>
            </div>
            <div className="summary-icon">✓</div>
          </article>
        </section>

        <section className="dashboard-panel admin-panel">

  <div className="dashboard-panel-header">
    <div>
      <h2>Gestión administrativa</h2>
      <small>
        Administración de maquilas y usuarios del sistema
      </small>
    </div>
  </div>


  <div className="management-actions">


    <button
      type="button"
      onClick={() => setModalMaquilaAbierto(true)}
    >

      🏭 Crear Maquila

    </button>



    <button
      type="button"
      onClick={() => setModalUsuariosAbierto(true)}
    >

      👥 Usuarios

    </button>


  </div>

</section>

        <section className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <h2>Pedidos y seguimientos</h2>
              <small>{pedidos.length} pedido(s) registrado(s)</small>
            </div>

            <button
              type="button"
              className="dashboard-refresh-button"
              onClick={() => cargarInformacion(false)}
              disabled={actualizando}
            >
              {actualizando ? "Actualizando..." : "Actualizar"}
            </button>
          </div>

          <div className="dashboard-table-wrapper">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Prenda</th>
                  <th>Maquila / taller</th>
                  <th>Cantidad</th>
                  <th>Estado</th>
                  <th>Fecha de entrega</th>
                  <th>Progreso</th>
                </tr>
              </thead>

              <tbody>
                {!cargando && pedidos.length === 0 && (
                  <tr>
                    <td colSpan="7" className="dashboard-empty">
                      No existen pedidos registrados.
                    </td>
                  </tr>
                )}

                {pedidos.map((pedido) => {
                  const tipoEstado = obtenerTipoEstado(pedido);

                  return (
                    <tr
                      key={`${pedido.id}-${pedido.codigo}`}
                      className={
                        pedidoSeleccionado &&
                        pedidosCoinciden(pedido, pedidoSeleccionado)
                          ? "is-selected"
                          : ""
                      }
                      onClick={() => setPedidoSeleccionadoId(pedido.id)}
                    >
                      <td>
                        <strong>{pedido.codigo}</strong>
                      </td>
                      <td>{pedido.tipoPrenda}</td>
                      <td>{pedido.maquila}</td>
                      <td>{pedido.cantidad}</td>
                      <td>
                        <span
                          className={`status-badge status-badge-${tipoEstado}`}
                        >
                          {pedido.estado}
                        </span>
                      </td>
                      <td>{pedido.fechaEntrega}</td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="dashboard-grid">
          <article className="dashboard-panel management-panel">
            <div className="dashboard-panel-header">
              <h2>Gestión de pedidos</h2>
            </div>

            <div className="management-actions">
              <button
                type="button"
                onClick={() => setModalCrearPedidoAbierto(true)}
              >
                Crear nuevo pedido
              </button>

              <button
                type="button"
                onClick={() => {
                  setModalEditarAbierto(true);
                  setBusquedaEditar("");
                  setPedidoEditar(null);
                  setFormularioEditar(FORMULARIO_VACIO);
                  setErrorEditar("");
                }}
              >
                Editar pedido existente
              </button>

              <button
                type="button"
                className="management-delete-button"
                onClick={() => {
                  setModalEliminarAbierto(true);
                  setBusquedaEliminar("");
                  setPedidoEliminar(null);
                  setEtapaEliminar("seleccionar");
                  setErrorEliminar("");
                }}
              >
                Eliminar pedido
              </button>
            </div>

            <div className="technical-sheet">
              <h3>Ficha técnica</h3>

              {pedidoSeleccionado ? (
                <dl>
                  <div>
                    <dt>Pedido</dt>
                    <dd>{pedidoSeleccionado.codigo}</dd>
                  </div>
                  <div>
                    <dt>Maquila</dt>
                    <dd>{pedidoSeleccionado.maquila}</dd>
                  </div>
                  <div>
                    <dt>Tipo de prenda</dt>
                    <dd>{pedidoSeleccionado.tipoPrenda}</dd>
                  </div>
                  <div>
                    <dt>Talla</dt>
                    <dd>{pedidoSeleccionado.talla}</dd>
                  </div>
                  <div>
                    <dt>Color</dt>
                    <dd>{pedidoSeleccionado.color}</dd>
                  </div>
                  <div>
                    <dt>Cantidad</dt>
                    <dd>{pedidoSeleccionado.cantidad}</dd>
                  </div>
                  <div>
                    <dt>Prioridad</dt>
                    <dd>{pedidoSeleccionado.prioridad}</dd>
                  </div>
                  <div>
                    <dt>Entrega</dt>
                    <dd>{pedidoSeleccionado.fechaEntrega}</dd>
                  </div>
                </dl>
              ) : (
                <p>No hay información disponible.</p>
              )}
            </div>
          </article>

          <article className="dashboard-panel statistics-panel">
            <div className="dashboard-panel-header">
              <h2>Estadísticas</h2>
            </div>

            <fieldset className="statistics-filters">
              <legend>Intervalo</legend>

              {["diario", "semanal", "mensual"].map((opcion) => (
                <label key={opcion}>
                  <input
                    type="radio"
                    name="intervalo"
                    value={opcion}
                    checked={intervalo === opcion}
                    onChange={(event) => setIntervalo(event.target.value)}
                  />
                  <span>
                    {opcion.charAt(0).toUpperCase() + opcion.slice(1)}
                  </span>
                </label>
              ))}
            </fieldset>

            <div className="maquila-progress">
              <h3>Cumplimiento por maquila</h3>

              {estadisticasMaquila.length === 0 && (
                <p className="dashboard-empty-message">
                  No hay datos suficientes para calcular estadísticas.
                </p>
              )}

              {estadisticasMaquila.map((maquila) => (
                <div className="maquila-progress-item" key={maquila.nombre}>
                  <div>
                    <span>{maquila.nombre}</span>
                    <strong>{maquila.progreso}%</strong>
                  </div>

                  <div className="progress-track">
                    <div
                      className="progress-value"
                      style={{ width: `${maquila.progreso}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </main>

      <footer className="dashboard-footer">
        <div>
          <strong>Maquila System EC</strong>
          <span>Sistema de gestión y seguimiento de producción</span>
        </div>
        <p>© 2026 Maquila System EC</p>
      </footer>

      <CrearPedidoModal
        abierto={modalCrearPedidoAbierto}
        onCerrar={() => setModalCrearPedidoAbierto(false)}
        onPedidoCreado={manejarPedidoCreado}
      />

      <CrearMaquilaModal

  abierto={modalMaquilaAbierto}

  onCerrar={() => setModalMaquilaAbierto(false)}

  onMaquilaCreada={()=>{
    cargarInformacion(false);
    setMensaje("Maquila creada correctamente");
  }}

/>


<UsuariosModal

  abierto={modalUsuariosAbierto}

  onCerrar={() => setModalUsuariosAbierto(false)}

/>

      {/* VENTANA PARA BUSCAR Y EDITAR PEDIDOS */}
      <ModalBase
        abierto={modalEditarAbierto}
        titulo="Editar pedido existente"
        onCerrar={cerrarEditar}
        ancho="grande"
      >
        {errorEditar && <div className="dashboard-modal-error">{errorEditar}</div>}

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


      {/* =========================================
          VENTANA PARA ELIMINAR PEDIDOS
      ========================================== */}
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

      {/* =========================================
          MODAL DE ESTADOS DE PEDIDOS
      ========================================== */}
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