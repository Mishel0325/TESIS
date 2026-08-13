import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../api/axios";
import "./Prendas.css";

const PRENDA_INICIAL = { nombre: "", descripcion: "" };
const FASE_INICIAL = { nombre_fase: "", orden: "" };
const TAREA_INICIAL = { descripcion: "", maquina: "", orden: "" };

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
    return detalle.map((item) => item?.msg || item?.message || String(item)).join(". ");
  }
  if (typeof detalle === "string" && detalle.trim()) return detalle;
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.response?.status === 404) return "Ruta no disponible en el backend. Verifique que los routers de fases y tareas estén registrados en FastAPI.";
  if (error?.response?.status === 403) return "No tiene permisos para realizar esta operación.";
  if (error?.response?.status === 401) return "La sesión no está autorizada. Inicie sesión nuevamente.";
  if (error?.message) return error.message;
  return alternativo;
}

function obtenerIdPrenda(prenda) {
  return prenda?.id_prenda ?? prenda?.id ?? null;
}

function obtenerIdPrendaFase(fase) {
  return fase?.id_prenda ?? fase?.prenda?.id_prenda ?? fase?.prenda?.id ?? null;
}

function obtenerIdFase(fase) {
  return fase?.id_fase ?? fase?.id ?? null;
}

function obtenerIdFaseTarea(tarea) {
  return tarea?.id_fase ?? tarea?.fase?.id_fase ?? tarea?.fase?.id ?? null;
}

function obtenerIdTarea(tarea) {
  return tarea?.id_tarea ?? tarea?.id ?? null;
}

function siguienteOrden(lista) {
  if (!Array.isArray(lista) || lista.length === 0) return 1;
  return Math.max(0, ...lista.map((item) => Number(item?.orden) || 0)) + 1;
}

function numeroEnteroPositivo(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

async function consultarListaDisponible(rutas) {
  let ultimoError = null;
  for (const ruta of rutas) {
    try {
      const respuesta = await api.get(ruta);
      return extraerLista(respuesta);
    } catch (error) {
      ultimoError = error;
      if (error?.response?.status !== 404) throw error;
    }
  }
  throw ultimoError || new Error("No se encontró un endpoint disponible.");
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
      return <svg {...props}><path d="M12 5v14M5 12h14" /></svg>;
    case "search":
      return <svg {...props}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>;
    case "refresh":
      return <svg {...props}><path d="M20 6v5h-5" /><path d="M4 18v-5h5" /><path d="M18.5 9A7 7 0 0 0 6.2 6.2L4 8M5.5 15A7 7 0 0 0 17.8 17.8L20 16" /></svg>;
    case "package":
      return <svg {...props}><path d="m21 8-9-5-9 5 9 5z" /><path d="M3 8v8l9 5 9-5V8M12 13v8" /></svg>;
    case "workflow":
      return <svg {...props}><rect x="3" y="3" width="6" height="6" rx="1.5" /><rect x="15" y="15" width="6" height="6" rx="1.5" /><path d="M9 6h3a4 4 0 0 1 4 4v5" /><path d="m13 12 3 3 3-3" /></svg>;
    case "check":
      return <svg {...props}><path d="m5 12 4 4L19 6" /></svg>;
    case "chevron":
      return <svg {...props}><path d="m9 18 6-6-6-6" /></svg>;
    case "edit":
      return <svg {...props}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>;
    case "trash":
      return <svg {...props}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="m19 6-1 14H6L5 6" /><path d="M10 11v5M14 11v5" /></svg>;
    case "task":
      return <svg {...props}><path d="M9 11l2 2 4-4" /><rect x="4" y="4" width="16" height="16" rx="2" /></svg>;
    case "close":
      return <svg {...props}><path d="M6 6l12 12M18 6 6 18" /></svg>;
    default:
      return null;
  }
}

export default function Prendas({
  prendas: prendasExternas,
  fases: fasesExternas,
  tareas: tareasExternas,
  cargando: cargandoExterno = false,
  onDatosActualizados,
  onRecargar,
}) {
  const onDatosActualizadosRef = useRef(onDatosActualizados);
  const onRecargarRef = useRef(onRecargar);

  const [prendasLocales, setPrendasLocales] = useState([]);
  const [fasesLocales, setFasesLocales] = useState([]);
  const [tareasLocales, setTareasLocales] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [idPrendaSeleccionada, setIdPrendaSeleccionada] = useState(null);
  const [cargandoLocal, setCargandoLocal] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [modal, setModal] = useState(null);
  const [formPrenda, setFormPrenda] = useState(PRENDA_INICIAL);
  const [formFase, setFormFase] = useState(FASE_INICIAL);
  const [formTarea, setFormTarea] = useState(TAREA_INICIAL);

  const usaPrendasExternas = Array.isArray(prendasExternas);
  const usaFasesExternas = Array.isArray(fasesExternas);
  const usaTareasExternas = Array.isArray(tareasExternas);
  const prendas = usaPrendasExternas ? prendasExternas : prendasLocales;
  const fases = usaFasesExternas ? fasesExternas : fasesLocales;
  const tareas = usaTareasExternas ? tareasExternas : tareasLocales;
  const cargando = Boolean(cargandoExterno) || cargandoLocal || refrescando;

  useEffect(() => { onDatosActualizadosRef.current = onDatosActualizados; }, [onDatosActualizados]);
  useEffect(() => { onRecargarRef.current = onRecargar; }, [onRecargar]);

  const cargarPrendas = useCallback(async (mostrarCarga = true) => {
    if (usaPrendasExternas) return;
    if (mostrarCarga) setCargandoLocal(true);
    setError("");
    try {
      const respuesta = await api.get("/prendas/");
      const lista = extraerLista(respuesta);
      setPrendasLocales(lista);
      onDatosActualizadosRef.current?.(lista);
    } catch (errorPeticion) {
      setError(obtenerMensajeError(errorPeticion, "No fue posible cargar el catálogo de prendas."));
    } finally {
      if (mostrarCarga) setCargandoLocal(false);
    }
  }, [usaPrendasExternas]);

  const cargarFasesLocales = useCallback(async () => {
    if (usaFasesExternas) return;
    try {
      setFasesLocales(await consultarListaDisponible(["/fases/", "/fases"]));
    } catch (errorPeticion) {
      setFasesLocales([]);
      setError((actual) => actual || obtenerMensajeError(errorPeticion, "No fue posible obtener las fases desde el backend."));
    }
  }, [usaFasesExternas]);

  const cargarTareasLocales = useCallback(async () => {
    if (usaTareasExternas) return;
    try {
      setTareasLocales(await consultarListaDisponible(["/tareas/", "/tareas"]));
    } catch (errorPeticion) {
      setTareasLocales([]);
      setError((actual) => actual || obtenerMensajeError(errorPeticion, "No fue posible obtener las tareas desde el backend."));
    }
  }, [usaTareasExternas]);

  const cargarDatos = useCallback(async (mostrarCarga = true) => {
    if (mostrarCarga) setCargandoLocal(true);
    await Promise.all([cargarPrendas(false), cargarFasesLocales(), cargarTareasLocales()]);
    if (mostrarCarga) setCargandoLocal(false);
  }, [cargarFasesLocales, cargarPrendas, cargarTareasLocales]);

  useEffect(() => {
    if (usaPrendasExternas && usaFasesExternas && usaTareasExternas) return;
    cargarDatos(true);
  }, [cargarDatos, usaFasesExternas, usaPrendasExternas, usaTareasExternas]);

  useEffect(() => {
    if (!modal) return undefined;
    const cerrarConEscape = (event) => {
      if (event.key === "Escape" && !guardando) setModal(null);
    };
    document.addEventListener("keydown", cerrarConEscape);
    return () => document.removeEventListener("keydown", cerrarConEscape);
  }, [modal, guardando]);

  const fasesAgrupadas = useMemo(() => {
    const mapa = new Map();
    fases.forEach((fase) => {
      const idPrenda = obtenerIdPrendaFase(fase);
      if (idPrenda === null || idPrenda === undefined) return;
      const clave = String(idPrenda);
      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave).push(fase);
    });
    mapa.forEach((lista) => lista.sort((a, b) => {
      const ordenA = Number(a?.orden ?? Number.MAX_SAFE_INTEGER);
      const ordenB = Number(b?.orden ?? Number.MAX_SAFE_INTEGER);
      if (ordenA !== ordenB) return ordenA - ordenB;
      return Number(obtenerIdFase(a) ?? 0) - Number(obtenerIdFase(b) ?? 0);
    }));
    return mapa;
  }, [fases]);

  const tareasAgrupadas = useMemo(() => {
    const mapa = new Map();
    tareas.forEach((tarea) => {
      const idFase = obtenerIdFaseTarea(tarea);
      if (idFase === null || idFase === undefined) return;
      const clave = String(idFase);
      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave).push(tarea);
    });
    mapa.forEach((lista) => lista.sort((a, b) => {
      const ordenA = Number(a?.orden ?? Number.MAX_SAFE_INTEGER);
      const ordenB = Number(b?.orden ?? Number.MAX_SAFE_INTEGER);
      if (ordenA !== ordenB) return ordenA - ordenB;
      return Number(obtenerIdTarea(a) ?? 0) - Number(obtenerIdTarea(b) ?? 0);
    }));
    return mapa;
  }, [tareas]);

  const prendasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return prendas;
    return prendas.filter((prenda) => {
      const id = String(obtenerIdPrenda(prenda) ?? "");
      const nombre = String(prenda?.nombre ?? "").toLowerCase();
      const descripcion = String(prenda?.descripcion ?? "").toLowerCase();
      const fasesPrenda = fasesAgrupadas.get(id) || [];
      const coincideFase = fasesPrenda.some((fase) => String(fase?.nombre_fase ?? "").toLowerCase().includes(termino));
      const coincideTarea = fasesPrenda.some((fase) => (tareasAgrupadas.get(String(obtenerIdFase(fase))) || []).some((tarea) => {
        const descripcionTarea = String(tarea?.descripcion ?? "").toLowerCase();
        const maquina = String(tarea?.maquina ?? "").toLowerCase();
        return descripcionTarea.includes(termino) || maquina.includes(termino);
      }));
      return id.includes(termino) || nombre.includes(termino) || descripcion.includes(termino) || coincideFase || coincideTarea;
    });
  }, [busqueda, fasesAgrupadas, prendas, tareasAgrupadas]);

  useEffect(() => {
    if (prendas.length === 0) {
      setIdPrendaSeleccionada(null);
      return;
    }
    const existe = prendas.some((prenda) => String(obtenerIdPrenda(prenda)) === String(idPrendaSeleccionada));
    if (!existe) setIdPrendaSeleccionada(obtenerIdPrenda(prendas[0]));
  }, [idPrendaSeleccionada, prendas]);

  const prendaSeleccionada = useMemo(() => prendas.find((prenda) => String(obtenerIdPrenda(prenda)) === String(idPrendaSeleccionada)) || null, [idPrendaSeleccionada, prendas]);

  const fasesSeleccionadas = useMemo(() => {
    if (!prendaSeleccionada) return [];
    return fasesAgrupadas.get(String(obtenerIdPrenda(prendaSeleccionada))) || [];
  }, [fasesAgrupadas, prendaSeleccionada]);

  const totalTareasSeleccionadas = useMemo(() => fasesSeleccionadas.reduce((total, fase) => total + (tareasAgrupadas.get(String(obtenerIdFase(fase))) || []).length, 0), [fasesSeleccionadas, tareasAgrupadas]);

  const prendasConFases = useMemo(() => prendas.filter((prenda) => (fasesAgrupadas.get(String(obtenerIdPrenda(prenda))) || []).length > 0).length, [fasesAgrupadas, prendas]);

  const refrescarTodo = useCallback(async () => {
    setRefrescando(true);
    setError("");
    try {
      if (onRecargarRef.current) {
        await onRecargarRef.current(false);
      } else {
        await Promise.all([cargarPrendas(false), cargarFasesLocales(), cargarTareasLocales()]);
      }
    } catch (errorPeticion) {
      setError(obtenerMensajeError(errorPeticion, "No fue posible actualizar la información."));
    } finally {
      setRefrescando(false);
    }
  }, [cargarFasesLocales, cargarPrendas, cargarTareasLocales]);

  const cerrarModal = () => {
    if (!guardando) setModal(null);
  };

  const abrirNuevaPrenda = () => {
    setError("");
    setMensaje("");
    setFormPrenda(PRENDA_INICIAL);
    setModal({ tipo: "prenda", modo: "crear" });
  };

  const abrirNuevaFase = () => {
    if (!prendaSeleccionada) return;
    setError("");
    setMensaje("");
    setFormFase({ nombre_fase: "", orden: String(siguienteOrden(fasesSeleccionadas)) });
    setModal({ tipo: "fase", modo: "crear" });
  };

  const abrirEditarFase = (fase) => {
    setError("");
    setMensaje("");
    setFormFase({ nombre_fase: fase?.nombre_fase ?? "", orden: String(fase?.orden ?? "") });
    setModal({ tipo: "fase", modo: "editar", item: fase });
  };

  const abrirEliminarFase = (fase) => {
    setError("");
    setMensaje("");
    setModal({ tipo: "fase", modo: "eliminar", item: fase });
  };

  const abrirNuevaTarea = (fase) => {
    const lista = tareasAgrupadas.get(String(obtenerIdFase(fase))) || [];
    setError("");
    setMensaje("");
    setFormTarea({ descripcion: "", maquina: "", orden: String(siguienteOrden(lista)) });
    setModal({ tipo: "tarea", modo: "crear", fase });
  };

  const abrirEditarTarea = (tarea, fase) => {
    setError("");
    setMensaje("");
    setFormTarea({ descripcion: tarea?.descripcion ?? "", maquina: tarea?.maquina ?? "", orden: String(tarea?.orden ?? "") });
    setModal({ tipo: "tarea", modo: "editar", item: tarea, fase });
  };

  const abrirEliminarTarea = (tarea, fase) => {
    setError("");
    setMensaje("");
    setModal({ tipo: "tarea", modo: "eliminar", item: tarea, fase });
  };

  const crearPrenda = async (event) => {
    event.preventDefault();
    const nombre = formPrenda.nombre.trim();
    const descripcion = formPrenda.descripcion.trim();
    if (!nombre || !descripcion) {
      setError("Nombre y descripción son obligatorios.");
      return;
    }
    if (prendas.some((prenda) => String(prenda?.nombre ?? "").trim().toLowerCase() === nombre.toLowerCase())) {
      setError(`Ya existe una prenda registrada con el nombre “${nombre}”.`);
      return;
    }
    setGuardando(true);
    setError("");
    try {
      const respuesta = await api.post("/prendas/", { nombre, descripcion });
      const nueva = respuesta?.data;
      setMensaje(`Prenda “${nombre}” creada correctamente.`);
      setModal(null);
      await refrescarTodo();
      const idNueva = obtenerIdPrenda(nueva);
      if (idNueva !== null && idNueva !== undefined) setIdPrendaSeleccionada(idNueva);
    } catch (errorPeticion) {
      setError(obtenerMensajeError(errorPeticion, "No fue posible crear la prenda."));
    } finally {
      setGuardando(false);
    }
  };

  const guardarFase = async (event) => {
    event.preventDefault();
    if (!prendaSeleccionada) return;

    const accion = event?.nativeEvent?.submitter?.dataset?.accion || "fase-y-tareas";
    const nombre_fase = formFase.nombre_fase.trim();
    const orden = numeroEnteroPositivo(formFase.orden);

    if (!nombre_fase) {
      setError("El nombre de la fase es obligatorio.");
      return;
    }
    if (!orden) {
      setError("El orden debe ser un número entero mayor que 0.");
      return;
    }

    const payload = {
      id_prenda: Number(obtenerIdPrenda(prendaSeleccionada)),
      nombre_fase,
      orden,
    };

    setGuardando(true);
    setError("");

    try {
      if (modal?.modo === "editar") {
        await api.put(`/fases/${obtenerIdFase(modal.item)}`, payload);
        setMensaje(`Fase “${nombre_fase}” actualizada correctamente.`);
        setModal(null);
        await refrescarTodo();
        return;
      }

      const respuesta = await api.post("/fases/", payload);
      const nuevaFase = respuesta?.data;
      setMensaje(`Fase “${nombre_fase}” creada correctamente.`);
      await refrescarTodo();

      if (accion === "otra-fase") {
        setFormFase({ nombre_fase: "", orden: String(orden + 1) });
        setModal({ tipo: "fase", modo: "crear" });
        return;
      }

      if (nuevaFase && obtenerIdFase(nuevaFase) !== null && obtenerIdFase(nuevaFase) !== undefined) {
        setFormTarea({ descripcion: "", maquina: "", orden: "1" });
        setModal({ tipo: "tarea", modo: "crear", fase: nuevaFase });
      } else {
        setModal(null);
      }
    } catch (errorPeticion) {
      setError(obtenerMensajeError(errorPeticion, "No fue posible guardar la fase."));
    } finally {
      setGuardando(false);
    }
  };

  const eliminarFase = async () => {
    const fase = modal?.item;
    if (!fase) return;
    setGuardando(true);
    setError("");
    try {
      await api.delete(`/fases/${obtenerIdFase(fase)}`);
      setMensaje(`Fase “${fase?.nombre_fase || "seleccionada"}” eliminada correctamente.`);
      setModal(null);
      await refrescarTodo();
    } catch (errorPeticion) {
      setError(obtenerMensajeError(errorPeticion, "No fue posible eliminar la fase."));
    } finally {
      setGuardando(false);
    }
  };

  const guardarTarea = async (event) => {
    event.preventDefault();
    const fase = modal?.fase;
    if (!fase) return;

    const accion = event?.nativeEvent?.submitter?.dataset?.accion || "guardar";
    const descripcion = formTarea.descripcion.trim();
    const maquina = formTarea.maquina.trim();
    const orden = numeroEnteroPositivo(formTarea.orden);

    if (!descripcion) {
      setError("La descripción de la tarea es obligatoria.");
      return;
    }
    if (!orden) {
      setError("El orden debe ser un número entero mayor que 0.");
      return;
    }

    const payload = {
      id_fase: Number(obtenerIdFase(fase)),
      descripcion,
      maquina: maquina || null,
      orden,
    };

    setGuardando(true);
    setError("");

    try {
      if (modal?.modo === "editar") {
        await api.put(`/tareas/${obtenerIdTarea(modal.item)}`, payload);
        setMensaje("Tarea actualizada correctamente.");
        setModal(null);
        await refrescarTodo();
        return;
      }

      await api.post("/tareas/", payload);
      setMensaje("Tarea creada correctamente.");
      await refrescarTodo();

      if (accion === "otra-tarea") {
        setFormTarea({ descripcion: "", maquina: "", orden: String(orden + 1) });
        setModal({ tipo: "tarea", modo: "crear", fase });
      } else {
        setModal(null);
      }
    } catch (errorPeticion) {
      setError(obtenerMensajeError(errorPeticion, "No fue posible guardar la tarea."));
    } finally {
      setGuardando(false);
    }
  };

  const eliminarTarea = async () => {
    const tarea = modal?.item;
    if (!tarea) return;
    setGuardando(true);
    setError("");
    try {
      await api.delete(`/tareas/${obtenerIdTarea(tarea)}`);
      setMensaje("Tarea eliminada correctamente.");
      setModal(null);
      await refrescarTodo();
    } catch (errorPeticion) {
      setError(obtenerMensajeError(errorPeticion, "No fue posible eliminar la tarea."));
    } finally {
      setGuardando(false);
    }
  };

  const tituloModal = useMemo(() => {
    if (!modal) return "";
    if (modal.tipo === "prenda") return "Crear tipo de prenda";
    if (modal.tipo === "fase" && modal.modo === "crear") return "Crear fase de producción";
    if (modal.tipo === "fase" && modal.modo === "editar") return "Editar fase de producción";
    if (modal.tipo === "fase" && modal.modo === "eliminar") return "Eliminar fase";
    if (modal.tipo === "tarea" && modal.modo === "crear") return "Crear tarea";
    if (modal.tipo === "tarea" && modal.modo === "editar") return "Editar tarea";
    if (modal.tipo === "tarea" && modal.modo === "eliminar") return "Eliminar tarea";
    return "Configuración";
  }, [modal]);

  return (
    <section className="prendas-page" aria-labelledby="prendas-title">
      <div className="prendas-heading">
        <div>
          <span className="prendas-eyebrow">CONFIGURACIÓN DE PRODUCCIÓN</span>
          <h2 id="prendas-title">Prendas y flujo de fases</h2>
          <p>Cada prenda conserva sus fases y cada fase sus tareas. Los registros existentes se leen directamente del backend; no se duplican.</p>
        </div>
        <button type="button" className="prendas-primary" onClick={abrirNuevaPrenda}><Icono nombre="plus" />Nueva prenda</button>
      </div>

      {error && !modal && <div className="prendas-alert error">{error}</div>}
      {mensaje && <div className="prendas-alert success">{mensaje}</div>}

      <div className="prendas-kpi-grid prendas-kpi-grid-four">
        <article className="prendas-kpi-card"><span className="prendas-kpi-icon blue"><Icono nombre="package" size={22} /></span><div><small>Tipos de prenda</small><strong>{cargando ? "…" : prendas.length}</strong><span>Registrados en el catálogo</span></div></article>
        <article className="prendas-kpi-card"><span className="prendas-kpi-icon purple"><Icono nombre="workflow" size={22} /></span><div><small>Fases configuradas</small><strong>{cargando ? "…" : fases.length}</strong><span>Vinculadas a prendas</span></div></article>
        <article className="prendas-kpi-card"><span className="prendas-kpi-icon orange"><Icono nombre="task" size={22} /></span><div><small>Tareas configuradas</small><strong>{cargando ? "…" : tareas.length}</strong><span>Asociadas a fases</span></div></article>
        <article className="prendas-kpi-card"><span className="prendas-kpi-icon green"><Icono nombre="check" size={22} /></span><div><small>Prendas con flujo</small><strong>{cargando ? "…" : prendasConFases}</strong><span>Con al menos una fase</span></div></article>
      </div>

      <article className="prendas-workspace">
        <div className="prendas-workspace-header">
          <div><span>CATÁLOGO + PROCESO</span><h3>Prendas, fases y tareas de producción</h3></div>
          <div className="prendas-toolbar">
            <label className="prendas-search"><Icono nombre="search" size={17} /><input type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar prenda, fase, tarea o máquina" aria-label="Buscar prendas, fases, tareas o máquinas" /></label>
            <button type="button" className={`prendas-icon-button ${cargando ? "is-loading" : ""}`} onClick={refrescarTodo} disabled={cargando} title="Actualizar información" aria-label="Actualizar información"><Icono nombre="refresh" /></button>
          </div>
        </div>

        <div className="prendas-master-detail">
          <aside className="prendas-master-panel" aria-label="Listado de prendas">
            <div className="prendas-panel-label"><span>PRENDAS</span><strong>{prendasFiltradas.length}</strong></div>
            <div className="prendas-list">
              {cargando ? <div className="prendas-side-empty">Cargando catálogo…</div> : prendasFiltradas.length === 0 ? <div className="prendas-side-empty">No se encontraron prendas.</div> : prendasFiltradas.map((prenda) => {
                const id = obtenerIdPrenda(prenda);
                const fasesDePrenda = fasesAgrupadas.get(String(id)) || [];
                const cantidadTareas = fasesDePrenda.reduce((total, fase) => total + (tareasAgrupadas.get(String(obtenerIdFase(fase))) || []).length, 0);
                const seleccionada = String(id) === String(idPrendaSeleccionada);
                return (
                  <button key={id ?? prenda.nombre} type="button" className={`prendas-list-item ${seleccionada ? "is-active" : ""}`} onClick={() => setIdPrendaSeleccionada(id)}>
                    <span className="prendas-list-icon"><Icono nombre="package" size={18} /></span>
                    <span className="prendas-list-copy"><strong>{prenda?.nombre || "Sin nombre"}</strong><small>{prenda?.descripcion || "Sin descripción"}</small></span>
                    <span className="prendas-list-meta"><span>{fasesDePrenda.length}F · {cantidadTareas}T</span><Icono nombre="chevron" size={15} /></span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section id="seccion-fases-tareas" className="prendas-detail-panel" aria-label="Fases y tareas de la prenda seleccionada">
            {!prendaSeleccionada ? (
              <div className="prendas-detail-empty"><span className="prendas-detail-empty-icon"><Icono nombre="workflow" size={28} /></span><h4>Seleccione una prenda</h4><p>El flujo de producción aparecerá aquí.</p></div>
            ) : (
              <>
                <header className="prendas-detail-header">
                  <div className="prendas-detail-title"><span className="prendas-detail-icon"><Icono nombre="package" size={21} /></span><div><span>FLUJO DE PRODUCCIÓN</span><h3>{prendaSeleccionada?.nombre || "Sin nombre"}</h3><p>{prendaSeleccionada?.descripcion || "Sin descripción"}</p></div></div>
                  <div className="prendas-detail-side">
                    <div className="prendas-detail-badges"><span>ID #{obtenerIdPrenda(prendaSeleccionada)}</span><span>{fasesSeleccionadas.length} fases</span><span>{totalTareasSeleccionadas} tareas</span></div>
                    <button type="button" className="prendas-small-primary" onClick={abrirNuevaFase}><Icono nombre="plus" size={15} />Nueva fase</button>
                  </div>
                </header>

                <div className="prendas-flow-summary"><span><Icono nombre="workflow" size={16} />Secuencia operativa</span><small>Las fases y tareas respetan el campo <strong>orden</strong>.</small></div>

                {fasesSeleccionadas.length === 0 ? (
                  <div className="prendas-no-phases"><span className="prendas-no-phases-icon"><Icono nombre="workflow" size={26} /></span><h4>Esta prenda todavía no tiene fases</h4><p>Puede comenzar creando la primera fase. El sistema vinculará automáticamente el ID de la prenda seleccionada.</p><button type="button" className="prendas-primary prendas-empty-action" onClick={abrirNuevaFase}><Icono nombre="plus" />Crear primera fase</button></div>
                ) : (
                  <div className="prendas-flow-list">
                    {fasesSeleccionadas.map((fase, indice) => {
                      const orden = fase?.orden ?? indice + 1;
                      const idFase = obtenerIdFase(fase);
                      const nombreFase = fase?.nombre_fase ?? "Fase sin nombre";
                      const tareasFase = tareasAgrupadas.get(String(idFase)) || [];
                      return (
                        <div className="prendas-flow-step" key={idFase}>
                          <div className="prendas-flow-rail" aria-hidden="true"><span className="prendas-flow-number">{orden}</span>{indice < fasesSeleccionadas.length - 1 && <span className="prendas-flow-line" />}</div>
                          <div className="prendas-flow-card">
                            <div className="prendas-phase-header">
                              <div><span className="prendas-flow-kicker">FASE {String(orden).padStart(2, "0")}</span><strong>{nombreFase}</strong></div>
                              <div className="prendas-phase-right">
                                <div className="prendas-phase-meta"><span className="prendas-phase-id">ID {idFase}</span><span className="prendas-task-count">{tareasFase.length} tareas</span></div>
                                <div className="prendas-phase-actions">
                                  <button type="button" className="prendas-action-button add" onClick={() => abrirNuevaTarea(fase)} title="Crear tarea"><Icono nombre="plus" size={13} /><span>Tarea</span></button>
                                  <button type="button" className="prendas-action-button" onClick={() => abrirEditarFase(fase)} title="Editar fase"><Icono nombre="edit" size={13} /></button>
                                  <button type="button" className="prendas-action-button danger" onClick={() => abrirEliminarFase(fase)} title="Eliminar fase"><Icono nombre="trash" size={13} /></button>
                                </div>
                              </div>
                            </div>

                            <div className="prendas-task-list">
                              {tareasFase.length === 0 ? (
                                <div className="prendas-task-empty"><span>Sin tareas registradas.</span><button type="button" onClick={() => abrirNuevaTarea(fase)}><Icono nombre="plus" size={13} />Agregar primera tarea</button></div>
                              ) : tareasFase.map((tarea, indiceTarea) => {
                                const idTarea = obtenerIdTarea(tarea) ?? `${idFase}-${indiceTarea}`;
                                const ordenTarea = tarea?.orden ?? indiceTarea + 1;
                                const descripcionTarea = tarea?.descripcion ?? "Tarea sin descripción";
                                const maquina = tarea?.maquina || "Sin máquina asignada";
                                return (
                                  <div className="prendas-task-row" key={idTarea}>
                                    <span className="prendas-task-order">{ordenTarea}</span>
                                    <div className="prendas-task-copy"><strong>{descripcionTarea}</strong><small>ID tarea #{idTarea}</small></div>
                                    <span className="prendas-machine-badge">{maquina}</span>
                                    <div className="prendas-task-actions">
                                      <button type="button" className="prendas-action-button" onClick={() => abrirEditarTarea(tarea, fase)} title="Editar tarea"><Icono nombre="edit" size={13} /></button>
                                      <button type="button" className="prendas-action-button danger" onClick={() => abrirEliminarTarea(tarea, fase)} title="Eliminar tarea"><Icono nombre="trash" size={13} /></button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </article>

      {modal && (
        <div className="prendas-modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) cerrarModal(); }}>
          <section className="prendas-modal" role="dialog" aria-modal="true" aria-labelledby="prendas-modal-title">
            <header className={`prendas-modal-header ${modal?.modo === "eliminar" ? "danger" : ""}`}><div><span>{modal?.modo === "eliminar" ? "CONFIRMACIÓN" : "CONFIGURACIÓN DE PRODUCCIÓN"}</span><h3 id="prendas-modal-title">{tituloModal}</h3></div><button type="button" onClick={cerrarModal} disabled={guardando} aria-label="Cerrar"><Icono nombre="close" /></button></header>

            {modal.tipo === "prenda" && (
              <form onSubmit={crearPrenda} className="prendas-form">
                <p className="prendas-form-help">El ID se genera automáticamente en la base de datos.</p>
                {error && <div className="prendas-alert error">{error}</div>}
                <label className="prendas-field"><span>Nombre de la prenda *</span><input type="text" value={formPrenda.nombre} onChange={(event) => setFormPrenda((actual) => ({ ...actual, nombre: event.target.value }))} placeholder="Ej.: CAMISA" maxLength={100} disabled={guardando} autoFocus required /></label>
                <label className="prendas-field"><span>Descripción *</span><textarea value={formPrenda.descripcion} onChange={(event) => setFormPrenda((actual) => ({ ...actual, descripcion: event.target.value }))} placeholder="Ej.: Camisa manga larga, cuello clásico" rows={4} maxLength={255} disabled={guardando} required /></label>
                <div className="prendas-modal-actions"><button type="button" className="prendas-secondary" onClick={cerrarModal} disabled={guardando}>Cancelar</button><button type="submit" className="prendas-primary" disabled={guardando}>{guardando ? "Guardando..." : "Crear prenda"}</button></div>
              </form>
            )}

            {modal.tipo === "fase" && modal.modo !== "eliminar" && (
              <form onSubmit={guardarFase} className="prendas-form">
                <p className="prendas-form-help">Prenda: <strong>{prendaSeleccionada?.nombre}</strong> · ID #{obtenerIdPrenda(prendaSeleccionada)}. El vínculo <strong>id_prenda</strong> se envía automáticamente.</p>
                {error && <div className="prendas-alert error">{error}</div>}
                <label className="prendas-field"><span>Nombre de la fase *</span><input type="text" value={formFase.nombre_fase} onChange={(event) => setFormFase((actual) => ({ ...actual, nombre_fase: event.target.value }))} placeholder="Ej.: ENSAMBLE" maxLength={100} disabled={guardando} autoFocus required /></label>
                <label className="prendas-field"><span>Orden *</span><input type="number" min="1" step="1" value={formFase.orden} onChange={(event) => setFormFase((actual) => ({ ...actual, orden: event.target.value }))} disabled={guardando} required /><small>Define la posición de esta fase dentro del flujo de la prenda.</small></label>
                <div className="prendas-modal-actions prendas-modal-actions-wrap">
                  <button type="button" className="prendas-secondary" onClick={cerrarModal} disabled={guardando}>Cancelar</button>
                  {modal.modo === "editar" ? (
                    <button type="submit" className="prendas-primary" disabled={guardando}>{guardando ? "Guardando..." : "Guardar cambios"}</button>
                  ) : (
                    <>
                      <button type="submit" data-accion="otra-fase" className="prendas-secondary prendas-secondary-accent" disabled={guardando}>{guardando ? "Guardando..." : "Crear y agregar otra fase"}</button>
                      <button type="submit" data-accion="fase-y-tareas" className="prendas-primary" disabled={guardando}>{guardando ? "Guardando..." : "Crear fase y agregar tareas"}</button>
                    </>
                  )}
                </div>
              </form>
            )}

            {modal.tipo === "tarea" && modal.modo !== "eliminar" && (
              <form onSubmit={guardarTarea} className="prendas-form">
                <p className="prendas-form-help">Fase: <strong>{modal?.fase?.nombre_fase || "Sin nombre"}</strong> · ID #{obtenerIdFase(modal?.fase)}. El vínculo <strong>id_fase</strong> se envía automáticamente.</p>
                {error && <div className="prendas-alert error">{error}</div>}
                <label className="prendas-field"><span>Descripción de la tarea *</span><textarea value={formTarea.descripcion} onChange={(event) => setFormTarea((actual) => ({ ...actual, descripcion: event.target.value }))} placeholder="Ej.: Preparar y fusionar cuello derecho + izquierdo" rows={3} disabled={guardando} autoFocus required /></label>
                <div className="prendas-form-grid-two">
                  <label className="prendas-field"><span>Máquina</span><input type="text" value={formTarea.maquina} onChange={(event) => setFormTarea((actual) => ({ ...actual, maquina: event.target.value }))} placeholder="Ej.: Fusionadora" maxLength={50} disabled={guardando} /></label>
                  <label className="prendas-field"><span>Orden *</span><input type="number" min="1" step="1" value={formTarea.orden} onChange={(event) => setFormTarea((actual) => ({ ...actual, orden: event.target.value }))} disabled={guardando} required /></label>
                </div>
                <div className="prendas-modal-actions prendas-modal-actions-wrap">
                  <button type="button" className="prendas-secondary" onClick={cerrarModal} disabled={guardando}>Cancelar</button>
                  {modal.modo === "editar" ? (
                    <button type="submit" className="prendas-primary" disabled={guardando}>{guardando ? "Guardando..." : "Guardar cambios"}</button>
                  ) : (
                    <>
                      <button type="submit" data-accion="otra-tarea" className="prendas-secondary prendas-secondary-accent" disabled={guardando}>{guardando ? "Guardando..." : "Crear y agregar otra tarea"}</button>
                      <button type="submit" data-accion="guardar" className="prendas-primary" disabled={guardando}>{guardando ? "Guardando..." : "Crear tarea"}</button>
                    </>
                  )}
                </div>
              </form>
            )}

            {modal.tipo === "fase" && modal.modo === "eliminar" && (
              <div className="prendas-form">
                {error && <div className="prendas-alert error">{error}</div>}
                <div className="prendas-delete-confirm"><span className="prendas-delete-icon"><Icono nombre="trash" size={24} /></span><h4>¿Eliminar esta fase?</h4><p>Se eliminará <strong>{modal?.item?.nombre_fase || "la fase seleccionada"}</strong>. Las tareas vinculadas a esta fase también pueden eliminarse por la relación configurada en el backend.</p></div>
                <div className="prendas-modal-actions"><button type="button" className="prendas-secondary" onClick={cerrarModal} disabled={guardando}>Cancelar</button><button type="button" className="prendas-danger-button" onClick={eliminarFase} disabled={guardando}>{guardando ? "Eliminando..." : "Eliminar fase"}</button></div>
              </div>
            )}

            {modal.tipo === "tarea" && modal.modo === "eliminar" && (
              <div className="prendas-form">
                {error && <div className="prendas-alert error">{error}</div>}
                <div className="prendas-delete-confirm"><span className="prendas-delete-icon"><Icono nombre="trash" size={24} /></span><h4>¿Eliminar esta tarea?</h4><p>{modal?.item?.descripcion || "La tarea seleccionada"}</p></div>
                <div className="prendas-modal-actions"><button type="button" className="prendas-secondary" onClick={cerrarModal} disabled={guardando}>Cancelar</button><button type="button" className="prendas-danger-button" onClick={eliminarTarea} disabled={guardando}>{guardando ? "Eliminando..." : "Eliminar tarea"}</button></div>
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
