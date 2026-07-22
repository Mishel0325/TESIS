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

/*
 * Modifica estas rutas solamente si tus endpoints
 * de FastAPI utilizan otros prefijos.
 */
const ENDPOINTS = {
  prendas: ["/prendas", "/prenda"],
  seguimientos: ["/seguimientos", "/seguimiento"],
  tareas: ["/tareas", "/tarea"],
};

/* =====================================================
   FUNCIONES AUXILIARES
===================================================== */

function extraerLista(respuesta) {
  const data = respuesta?.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
}

async function consultarPrimeraRutaDisponible(rutas) {
  let ultimoError = null;

  for (const ruta of rutas) {
    try {
      return await api.get(ruta);
    } catch (error) {
      ultimoError = error;

      /*
       * Si la ruta devuelve 404, intenta con la siguiente.
       * Otros errores, como 401 o 500, se muestran directamente.
       */
      if (error.response?.status !== 404) {
        throw error;
      }
    }
  }

  throw (
    ultimoError ||
    new Error("No se encontró ningún endpoint disponible.")
  );
}

function obtenerTexto(valor, valorAlternativo = "") {
  if (valor === null || valor === undefined) {
    return valorAlternativo;
  }

  return String(valor).trim() || valorAlternativo;
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
      item.maquila ??
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

  const numero = Number(
    String(valor).replace("%", "")
  );

  if (Number.isNaN(numero)) {
    return 0;
  }

  return Math.min(100, Math.max(0, numero));
}

function formatearFecha(fecha) {
  if (!fecha) {
    return "Sin fecha";
  }

  /*
   * Evita cambios de día producidos por la zona horaria
   * cuando FastAPI devuelve una fecha YYYY-MM-DD.
   */
  if (
    typeof fecha === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(fecha)
  ) {
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

function normalizarPedido(item, indice) {
  const idPedido =
    item.id_prenda ??
    item.id_pedido ??
    item.id ??
    indice;

  return {
    id: idPedido,

    codigo: obtenerTexto(
      item.codigo_pedido ??
        item.codigo ??
        item.numero_pedido ??
        item.pedido ??
        item.numero,
      `PD-${idPedido || indice + 1}`
    ),

    maquila: obtenerNombreMaquila(item),

    estado: obtenerEstado(item),

    fechaEntrega: formatearFecha(
      item.fecha_entrega ??
        item.fecha_finalizacion ??
        item.entrega ??
        item.fecha
    ),

    fechaIngreso: formatearFecha(
      item.fecha_ingreso
    ),

    progreso: obtenerProgreso(item),

    modelo: obtenerTexto(
      item.tipo_prenda ??
        item.modelo ??
        item.prenda?.modelo ??
        item.nombre_prenda,
      "Sin modelo"
    ),

    tipoPrenda: obtenerTexto(
      item.tipo_prenda ??
        item.nombre_prenda ??
        item.modelo,
      "Sin especificar"
    ),

    talla: obtenerTexto(
      item.talla,
      "Sin especificar"
    ),

    color: obtenerTexto(
      item.color,
      "Sin especificar"
    ),

    prioridad: obtenerTexto(
      item.prioridad,
      "Media"
    ),

    cantidad:
      item.cantidad ??
      item.total_unidades ??
      item.unidades ??
      0,

    observaciones: obtenerTexto(
      item.observaciones,
      "Sin observaciones"
    ),
  };
}

/* =====================================================
   COMPONENTE PRINCIPAL
===================================================== */

function SupervisorDashboard({
  usuario,
  onLogout,
}) {
  const [
    menuUsuarioAbierto,
    setMenuUsuarioAbierto,
  ] = useState(false);

  const [
    modalCrearPedidoAbierto,
    setModalCrearPedidoAbierto,
  ] = useState(false);

  const [cargando, setCargando] =
    useState(true);

  const [actualizando, setActualizando] =
    useState(false);

  const [error, setError] = useState("");

  const [prendas, setPrendas] = useState([]);

  const [
    seguimientos,
    setSeguimientos,
  ] = useState([]);

  const [tareas, setTareas] = useState([]);

  const [intervalo, setIntervalo] =
    useState("mensual");

  const menuRef = useRef(null);

  /* =====================================================
     CARGAR INFORMACIÓN DEL BACKEND
  ===================================================== */

  const cargarInformacion = useCallback(
    async (mostrarCargaPrincipal = true) => {
      if (mostrarCargaPrincipal) {
        setCargando(true);
      } else {
        setActualizando(true);
      }

      setError("");

      try {
        const resultados =
          await Promise.allSettled([
            consultarPrimeraRutaDisponible(
              ENDPOINTS.prendas
            ),

            consultarPrimeraRutaDisponible(
              ENDPOINTS.seguimientos
            ),

            consultarPrimeraRutaDisponible(
              ENDPOINTS.tareas
            ),
          ]);

        const [
          resultadoPrendas,
          resultadoSeguimientos,
          resultadoTareas,
        ] = resultados;

        if (
          resultadoPrendas.status ===
          "fulfilled"
        ) {
          setPrendas(
            extraerLista(
              resultadoPrendas.value
            )
          );
        }

        if (
          resultadoSeguimientos.status ===
          "fulfilled"
        ) {
          setSeguimientos(
            extraerLista(
              resultadoSeguimientos.value
            )
          );
        }

        if (
          resultadoTareas.status ===
          "fulfilled"
        ) {
          setTareas(
            extraerLista(
              resultadoTareas.value
            )
          );
        }

        const todosFallaron =
          resultados.every(
            (resultado) =>
              resultado.status === "rejected"
          );

        if (todosFallaron) {
          const errorAutorizacion =
            resultados.some(
              (resultado) =>
                resultado.status ===
                  "rejected" &&
                resultado.reason?.response
                  ?.status === 401
            );

          if (errorAutorizacion) {
            setError(
              "La sesión no está autorizada o ha expirado. Cierre sesión e ingrese nuevamente."
            );
          } else {
            setError(
              "No se pudieron cargar los datos. Revise los endpoints configurados en el dashboard."
            );
          }
        }
      } catch (err) {
        console.error(
          "Error al cargar el panel:",
          err
        );

        setError(
          err.response?.data?.detail ||
            "Ocurrió un error al cargar la información."
        );
      } finally {
        setCargando(false);
        setActualizando(false);
      }
    },
    []
  );

  useEffect(() => {
    cargarInformacion();
  }, [cargarInformacion]);

  /* =====================================================
     CERRAR MENÚ DEL USUARIO AL HACER CLIC AFUERA
  ===================================================== */

  useEffect(() => {
    const cerrarMenu = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target
        )
      ) {
        setMenuUsuarioAbierto(false);
      }
    };

    document.addEventListener(
      "mousedown",
      cerrarMenu
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        cerrarMenu
      );
    };
  }, []);

  /* =====================================================
     NORMALIZAR PEDIDOS
  ===================================================== */

  const pedidos = useMemo(() => {
    /*
     * Los seguimientos suelen tener información
     * de avance. Si no existen, usa las prendas.
     */
    const fuente =
      seguimientos.length > 0
        ? seguimientos
        : prendas;

    return fuente.map(normalizarPedido);
  }, [prendas, seguimientos]);

  /* =====================================================
     CALCULAR ESTADÍSTICAS
  ===================================================== */

  const estadisticas = useMemo(() => {
    let activos = 0;
    let retrasados = 0;
    let finalizados = 0;

    pedidos.forEach((pedido) => {
      const estado =
        pedido.estado.toLowerCase();

      if (
        estado.includes("final") ||
        estado.includes("complet") ||
        estado.includes("entreg") ||
        estado.includes("termin")
      ) {
        finalizados += 1;
        return;
      }

      if (
        estado.includes("retras") ||
        estado.includes("venc") ||
        estado.includes("atras")
      ) {
        retrasados += 1;
        return;
      }

      activos += 1;
    });

    return {
      activos,
      retrasados,
      finalizados,
    };
  }, [pedidos]);

  const pedidosRecientes = useMemo(() => {
    return pedidos.slice(0, 6);
  }, [pedidos]);

  const estadisticasMaquila =
    useMemo(() => {
      const grupos = {};

      pedidos.forEach((pedido) => {
        if (!grupos[pedido.maquila]) {
          grupos[pedido.maquila] = {
            total: 0,
            sumaProgreso: 0,
          };
        }

        grupos[pedido.maquila].total += 1;

        grupos[pedido.maquila]
          .sumaProgreso +=
          pedido.progreso;
      });

      return Object.entries(grupos)
        .map(([nombre, datos]) => ({
          nombre,

          progreso: Math.round(
            datos.sumaProgreso /
              datos.total
          ),
        }))
        .sort(
          (a, b) =>
            b.progreso - a.progreso
        )
        .slice(0, 5);
    }, [pedidos]);

  const pedidoSeleccionado =
    pedidosRecientes[0] ?? null;

  const nombreUsuario =
    usuario?.nombre ||
    `${usuario?.nombres || ""} ${
      usuario?.apellidos || ""
    }`.trim() ||
    usuario?.correo ||
    "Usuario";

  const nombreRol =
    usuario?.rol ||
    (usuario?.id_rol === 2
      ? "Supervisora"
      : "Usuario");

  /* =====================================================
     PEDIDO CREADO
  ===================================================== */

  const manejarPedidoCreado =
    async () => {
      /*
       * El modal se cerrará automáticamente.
       * Aquí se vuelven a consultar los pedidos.
       */
      await cargarInformacion(false);
    };

  return (
    <div className="dashboard-page">
      {/* ================= ENCABEZADO ================= */}

      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-brand">
            <img
              src={logoMaquila}
              alt="Maquila System EC"
              className="dashboard-logo"
            />

            <div className="dashboard-brand-text">
              <strong>
                Maquila System EC
              </strong>

              <span>
                Control y seguimiento de
                producción
              </span>
            </div>
          </div>

          <div
            className="dashboard-user-menu"
            ref={menuRef}
          >
            <button
              type="button"
              className="dashboard-user-button"
              onClick={() =>
                setMenuUsuarioAbierto(
                  (estadoActual) =>
                    !estadoActual
                )
              }
              aria-expanded={
                menuUsuarioAbierto
              }
            >
              <span className="dashboard-user-avatar">
                {nombreUsuario
                  .charAt(0)
                  .toUpperCase()}
              </span>

              <span className="dashboard-user-information">
                <strong>
                  {nombreUsuario}
                </strong>

                <small>
                  {nombreRol}
                </small>
              </span>

              <span className="dashboard-chevron">
                {menuUsuarioAbierto
                  ? "▲"
                  : "▼"}
              </span>
            </button>

            {menuUsuarioAbierto && (
              <div className="dashboard-dropdown">
                <div className="dashboard-dropdown-user">
                  <strong>
                    {nombreUsuario}
                  </strong>

                  <span>
                    {usuario?.correo}
                  </span>
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

      {/* ================= CONTENIDO ================= */}

      <main className="dashboard-main">
        <section className="dashboard-welcome">
          <div>
            <span>
              Panel de control general
            </span>

            <h1>
              Bienvenida, {nombreUsuario}
            </h1>

            <p>
              Consulte el estado de pedidos,
              maquilas y fechas de entrega.
            </p>
          </div>

          <div className="dashboard-date">
            {new Intl.DateTimeFormat(
              "es-EC",
              {
                dateStyle: "full",
              }
            ).format(new Date())}
          </div>
        </section>

        {error && (
          <div className="dashboard-error">
            {error}
          </div>
        )}

        {/* ================= RESUMEN ================= */}

        <section className="dashboard-summary">
          <article className="summary-card summary-active">
            <div>
              <span>Activos</span>

              <strong>
                {cargando
                  ? "..."
                  : estadisticas.activos}
              </strong>
            </div>

            <div className="summary-icon">
              ↻
            </div>
          </article>

          <article className="summary-card summary-delayed">
            <div>
              <span>Retrasados</span>

              <strong>
                {cargando
                  ? "..."
                  : estadisticas.retrasados}
              </strong>
            </div>

            <div className="summary-icon">
              !
            </div>
          </article>

          <article className="summary-card summary-finished">
            <div>
              <span>Finalizados</span>

              <strong>
                {cargando
                  ? "..."
                  : estadisticas.finalizados}
              </strong>
            </div>

            <div className="summary-icon">
              ✓
            </div>
          </article>

          <article className="summary-card summary-tasks">
            <div>
              <span>
                Tareas registradas
              </span>

              <strong>
                {cargando
                  ? "..."
                  : tareas.length}
              </strong>
            </div>

            <div className="summary-icon">
              ☷
            </div>
          </article>
        </section>

        {/* ================= TABLA ================= */}

        <section className="dashboard-panel">
          <div className="dashboard-panel-header">
            <h2>
              Pedidos y seguimientos
            </h2>

            <button
              type="button"
              className="dashboard-refresh-button"
              onClick={() =>
                cargarInformacion(false)
              }
              disabled={actualizando}
            >
              {actualizando
                ? "Actualizando..."
                : "Actualizar"}
            </button>
          </div>

          <div className="dashboard-table-wrapper">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>
                    Maquila / taller
                  </th>
                  <th>Estado</th>
                  <th>
                    Fecha de entrega
                  </th>
                  <th>Progreso</th>
                </tr>
              </thead>

              <tbody>
                {!cargando &&
                  pedidosRecientes.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan="5"
                        className="dashboard-empty"
                      >
                        No existen pedidos
                        registrados.
                      </td>
                    </tr>
                  )}

                {pedidosRecientes.map(
                  (pedido) => (
                    <tr key={pedido.id}>
                      <td>
                        <strong>
                          {pedido.codigo}
                        </strong>
                      </td>

                      <td>
                        {pedido.maquila}
                      </td>

                      <td>
                        <span className="status-badge">
                          {pedido.estado}
                        </span>
                      </td>

                      <td>
                        {
                          pedido.fechaEntrega
                        }
                      </td>

                      <td>
                        <div className="progress-content">
                          <div className="progress-track">
                            <div
                              className="progress-value"
                              style={{
                                width: `${pedido.progreso}%`,
                              }}
                            />
                          </div>

                          <span>
                            {
                              pedido.progreso
                            }
                            %
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ================= GESTIÓN Y ESTADÍSTICAS ================= */}

        <section className="dashboard-grid">
          <article className="dashboard-panel management-panel">
            <div className="dashboard-panel-header">
              <h2>
                Gestión de pedidos
              </h2>
            </div>

            <div className="management-actions">
              <button
                type="button"
                onClick={() =>
                  setModalCrearPedidoAbierto(
                    true
                  )
                }
              >
                Crear nuevo pedido
              </button>

              <button type="button">
                Editar pedido existente
              </button>

              <button type="button">
                Duplicar pedido base
              </button>
            </div>

            <div className="technical-sheet">
              <h3>Ficha técnica</h3>

              {pedidoSeleccionado ? (
                <dl>
                  <div>
                    <dt>Pedido</dt>

                    <dd>
                      {
                        pedidoSeleccionado.codigo
                      }
                    </dd>
                  </div>

                  <div>
                    <dt>Maquila</dt>

                    <dd>
                      {
                        pedidoSeleccionado.maquila
                      }
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Tipo de prenda
                    </dt>

                    <dd>
                      {
                        pedidoSeleccionado.tipoPrenda
                      }
                    </dd>
                  </div>

                  <div>
                    <dt>Talla</dt>

                    <dd>
                      {
                        pedidoSeleccionado.talla
                      }
                    </dd>
                  </div>

                  <div>
                    <dt>Color</dt>

                    <dd>
                      {
                        pedidoSeleccionado.color
                      }
                    </dd>
                  </div>

                  <div>
                    <dt>Cantidad</dt>

                    <dd>
                      {
                        pedidoSeleccionado.cantidad
                      }
                    </dd>
                  </div>

                  <div>
                    <dt>Prioridad</dt>

                    <dd>
                      {
                        pedidoSeleccionado.prioridad
                      }
                    </dd>
                  </div>

                  <div>
                    <dt>Entrega</dt>

                    <dd>
                      {
                        pedidoSeleccionado.fechaEntrega
                      }
                    </dd>
                  </div>
                </dl>
              ) : (
                <p>
                  No hay información
                  disponible.
                </p>
              )}
            </div>
          </article>

          <article className="dashboard-panel statistics-panel">
            <div className="dashboard-panel-header">
              <h2>Estadísticas</h2>
            </div>

            <fieldset className="statistics-filters">
              <legend>Intervalo</legend>

              {[
                "diario",
                "semanal",
                "mensual",
              ].map((opcion) => (
                <label key={opcion}>
                  <input
                    type="radio"
                    name="intervalo"
                    value={opcion}
                    checked={
                      intervalo === opcion
                    }
                    onChange={(event) =>
                      setIntervalo(
                        event.target.value
                      )
                    }
                  />

                  <span>
                    {opcion
                      .charAt(0)
                      .toUpperCase() +
                      opcion.slice(1)}
                  </span>
                </label>
              ))}
            </fieldset>

            <div className="maquila-progress">
              <h3>
                Cumplimiento por maquila
              </h3>

              {estadisticasMaquila.length ===
                0 && (
                <p className="dashboard-empty-message">
                  No hay datos suficientes
                  para calcular estadísticas.
                </p>
              )}

              {estadisticasMaquila.map(
                (maquila) => (
                  <div
                    className="maquila-progress-item"
                    key={maquila.nombre}
                  >
                    <div>
                      <span>
                        {maquila.nombre}
                      </span>

                      <strong>
                        {
                          maquila.progreso
                        }
                        %
                      </strong>
                    </div>

                    <div className="progress-track">
                      <div
                        className="progress-value"
                        style={{
                          width: `${maquila.progreso}%`,
                        }}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          </article>
        </section>
      </main>

      {/* ================= PIE DE PÁGINA ================= */}

      <footer className="dashboard-footer">
        <div>
          <strong>
            Maquila System EC
          </strong>

          <span>
            Sistema de gestión y
            seguimiento de producción
          </span>
        </div>

        <p>
          © 2026 Maquila System EC
        </p>
      </footer>

      {/* ================= MODAL CREAR PEDIDO ================= */}

      <CrearPedidoModal
        abierto={
          modalCrearPedidoAbierto
        }
        onCerrar={() =>
          setModalCrearPedidoAbierto(
            false
          )
        }
        onPedidoCreado={
          manejarPedidoCreado
        }
      />
    </div>
  );
}

export default SupervisorDashboard;