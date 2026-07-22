import { useEffect, useState } from "react";
import api from "../api/axios";
import "./CrearPedidoModal.css";

const PEDIDOS_ENDPOINT = "/pedidos/";

const obtenerFechaActual = () => {
  const ahora = new Date();
  const diferenciaZona = ahora.getTimezoneOffset() * 60000;

  return new Date(ahora.getTime() - diferenciaZona)
    .toISOString()
    .slice(0, 10);
};

const obtenerFechaHoraActual = () => {
  const ahora = new Date();
  const diferenciaZona = ahora.getTimezoneOffset() * 60000;

  return new Date(ahora.getTime() - diferenciaZona)
    .toISOString()
    .slice(0, 16);
};

const crearFormularioInicial = () => ({
  id_maquila: "",
  codigo_pedido: "",
  tipo_prenda: "",
  talla: "",
  color: "",
  cantidad: "",
  fecha_ingreso: obtenerFechaActual(),
  fecha_entrega: "",
  prioridad: "Media",
  estado: "Pendiente",
  observaciones: "",
  fecha_creacion: obtenerFechaHoraActual(),
});

function CrearPedidoModal({
  abierto,
  onCerrar,
  onPedidoCreado,
}) {
  const [formulario, setFormulario] = useState(
    crearFormularioInicial
  );

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    if (abierto) {
      setFormulario(crearFormularioInicial());
      setError("");
      setMensaje("");
      setGuardando(false);
    }
  }, [abierto]);

  useEffect(() => {
    const cerrarConEscape = (event) => {
      if (
        event.key === "Escape" &&
        abierto &&
        !guardando
      ) {
        onCerrar();
      }
    };

    document.addEventListener(
      "keydown",
      cerrarConEscape
    );

    return () => {
      document.removeEventListener(
        "keydown",
        cerrarConEscape
      );
    };
  }, [abierto, guardando, onCerrar]);

  if (!abierto) {
    return null;
  }

  const manejarCambio = (event) => {
    const { name, value } = event.target;

    setFormulario((datosActuales) => ({
      ...datosActuales,
      [name]: value,
    }));

    setError("");
    setMensaje("");
  };

  const obtenerMensajeError = (err) => {
    const detalle = err.response?.data?.detail;
    const estadoHttp = err.response?.status;

    if (typeof detalle === "string") {
      return detalle;
    }

    if (Array.isArray(detalle)) {
      const mensajes = detalle
        .map((item) => {
          const campo = Array.isArray(item?.loc)
            ? item.loc[item.loc.length - 1]
            : null;

          if (campo && item?.msg) {
            return `${campo}: ${item.msg}`;
          }

          return item?.msg;
        })
        .filter(Boolean);

      if (mensajes.length > 0) {
        return mensajes.join(". ");
      }
    }

    if (estadoHttp === 401) {
      return "La sesión no está autorizada o ha expirado. Cierre sesión e ingrese nuevamente.";
    }

    if (estadoHttp === 403) {
      return "Su usuario no tiene permiso para crear pedidos.";
    }

    if (estadoHttp === 404) {
      return "No se encontró la ruta POST /pedidos/ en el backend.";
    }

    if (estadoHttp === 409) {
      return "Ya existe un pedido con ese código.";
    }

    if (estadoHttp === 422) {
      return "Los datos enviados no coinciden con el esquema del pedido.";
    }

    if (estadoHttp >= 500) {
      return "El servidor presentó un error al registrar el pedido.";
    }

    if (err.code === "ERR_NETWORK") {
      return "No se pudo conectar con el servidor. Verifique que FastAPI esté ejecutándose.";
    }

    return "No se pudo registrar el pedido.";
  };

  const validarFormulario = () => {
    if (!formulario.id_maquila) {
      return "Ingrese el identificador de la maquila.";
    }

    if (Number(formulario.id_maquila) <= 0) {
      return "El identificador de la maquila debe ser mayor que cero.";
    }

    if (!formulario.codigo_pedido.trim()) {
      return "Ingrese el código del pedido.";
    }

    if (!formulario.tipo_prenda.trim()) {
      return "Ingrese el tipo de prenda.";
    }

    if (!formulario.talla.trim()) {
      return "Ingrese la talla.";
    }

    if (!formulario.color.trim()) {
      return "Ingrese el color.";
    }

    if (
      !formulario.cantidad ||
      Number(formulario.cantidad) <= 0
    ) {
      return "La cantidad debe ser mayor que cero.";
    }

    if (!formulario.fecha_ingreso) {
      return "Seleccione la fecha de ingreso.";
    }

    if (!formulario.fecha_entrega) {
      return "Seleccione la fecha de entrega.";
    }

    if (
      formulario.fecha_entrega <
      formulario.fecha_ingreso
    ) {
      return "La fecha de entrega no puede ser anterior a la fecha de ingreso.";
    }

    if (!formulario.prioridad) {
      return "Seleccione la prioridad.";
    }

    if (!formulario.estado) {
      return "Seleccione el estado.";
    }

    if (!formulario.fecha_creacion) {
      return "Ingrese la fecha y hora de creación.";
    }

    return null;
  };

  const manejarEnvio = async (event) => {
    event.preventDefault();

    if (guardando) {
      return;
    }

    setError("");
    setMensaje("");

    const errorValidacion = validarFormulario();

    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    const datosPedido = {
      id_maquila: Number(formulario.id_maquila),

      codigo_pedido:
        formulario.codigo_pedido.trim(),

      tipo_prenda:
        formulario.tipo_prenda.trim(),

      talla:
        formulario.talla.trim(),

      color:
        formulario.color.trim(),

      cantidad:
        Number(formulario.cantidad),

      fecha_ingreso:
        formulario.fecha_ingreso,

      fecha_entrega:
        formulario.fecha_entrega,

      prioridad:
        formulario.prioridad,

      estado:
        formulario.estado,

      observaciones:
        formulario.observaciones.trim() || null,

      /*
       * Se envía directamente como fecha local para evitar
       * que cambie la hora por la zona horaria.
       */
      fecha_creacion:
        formulario.fecha_creacion,
    };

    try {
      setGuardando(true);

      const response = await api.post(
        PEDIDOS_ENDPOINT,
        datosPedido
      );

      setMensaje(
        "Pedido registrado correctamente."
      );

      if (
        typeof onPedidoCreado === "function"
      ) {
        await onPedidoCreado(response.data);
      }

      setTimeout(() => {
        onCerrar();
      }, 800);
    } catch (err) {
      console.error(
        "Error al crear el pedido:",
        err
      );

      setError(obtenerMensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const cerrarDesdeFondo = (event) => {
    if (
      event.target === event.currentTarget &&
      !guardando
    ) {
      onCerrar();
    }
  };

  return (
    <div
      className="pedido-modal-overlay"
      onMouseDown={cerrarDesdeFondo}
    >
      <section
        className="pedido-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-crear-pedido"
      >
        <div className="pedido-modal-header">
          <div>
            <span>Gestión de pedidos</span>

            <h2 id="titulo-crear-pedido">
              Crear nuevo pedido
            </h2>
          </div>

          <button
            type="button"
            className="pedido-modal-close"
            onClick={onCerrar}
            disabled={guardando}
            aria-label="Cerrar ventana"
            title="Cerrar"
          >
            ×
          </button>
        </div>

        <form
          className="pedido-form"
          onSubmit={manejarEnvio}
        >
          {error && (
            <div
              className="pedido-form-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {mensaje && (
            <div
              className="pedido-form-success"
              role="status"
            >
              {mensaje}
            </div>
          )}

          <div className="pedido-form-grid">
            <div className="pedido-field">
              <label htmlFor="id_maquila">
                ID de maquila
              </label>

              <input
                id="id_maquila"
                name="id_maquila"
                type="number"
                min="1"
                step="1"
                value={formulario.id_maquila}
                onChange={manejarCambio}
                placeholder="Ejemplo: 1"
                disabled={guardando}
                required
              />
            </div>

            <div className="pedido-field">
              <label htmlFor="codigo_pedido">
                Código del pedido
              </label>

              <input
                id="codigo_pedido"
                name="codigo_pedido"
                type="text"
                value={formulario.codigo_pedido}
                onChange={manejarCambio}
                placeholder="Ejemplo: CAMOBS001"
                maxLength="50"
                disabled={guardando}
                required
              />
            </div>

            <div className="pedido-field">
              <label htmlFor="tipo_prenda">
                Tipo de prenda
              </label>

              <input
                id="tipo_prenda"
                name="tipo_prenda"
                type="text"
                value={formulario.tipo_prenda}
                onChange={manejarCambio}
                placeholder="Ejemplo: Camisa"
                maxLength="100"
                disabled={guardando}
                required
              />
            </div>

            <div className="pedido-field">
              <label htmlFor="talla">
                Talla
              </label>

              <input
                id="talla"
                name="talla"
                type="text"
                value={formulario.talla}
                onChange={manejarCambio}
                placeholder="Ejemplo: S, M, L o XL"
                maxLength="50"
                disabled={guardando}
                required
              />
            </div>

            <div className="pedido-field">
              <label htmlFor="color">
                Color
              </label>

              <input
                id="color"
                name="color"
                type="text"
                value={formulario.color}
                onChange={manejarCambio}
                placeholder="Ejemplo: Negro"
                maxLength="50"
                disabled={guardando}
                required
              />
            </div>

            <div className="pedido-field">
              <label htmlFor="cantidad">
                Cantidad
              </label>

              <input
                id="cantidad"
                name="cantidad"
                type="number"
                min="1"
                step="1"
                value={formulario.cantidad}
                onChange={manejarCambio}
                placeholder="Ejemplo: 100"
                disabled={guardando}
                required
              />
            </div>

            <div className="pedido-field">
              <label htmlFor="fecha_ingreso">
                Fecha de ingreso
              </label>

              <input
                id="fecha_ingreso"
                name="fecha_ingreso"
                type="date"
                value={formulario.fecha_ingreso}
                onChange={manejarCambio}
                disabled={guardando}
                required
              />
            </div>

            <div className="pedido-field">
              <label htmlFor="fecha_entrega">
                Fecha de entrega
              </label>

              <input
                id="fecha_entrega"
                name="fecha_entrega"
                type="date"
                min={formulario.fecha_ingreso}
                value={formulario.fecha_entrega}
                onChange={manejarCambio}
                disabled={guardando}
                required
              />
            </div>

            <div className="pedido-field">
              <label htmlFor="prioridad">
                Prioridad
              </label>

              <select
                id="prioridad"
                name="prioridad"
                value={formulario.prioridad}
                onChange={manejarCambio}
                disabled={guardando}
                required
              >
                <option value="Baja">
                  Baja
                </option>

                <option value="Media">
                  Media
                </option>

                <option value="Alta">
                  Alta
                </option>

                <option value="Urgente">
                  Urgente
                </option>
              </select>
            </div>

            <div className="pedido-field">
              <label htmlFor="estado">
                Estado
              </label>

              <select
                id="estado"
                name="estado"
                value={formulario.estado}
                onChange={manejarCambio}
                disabled={guardando}
                required
              >
                <option value="Pendiente">
                  Pendiente
                </option>

                <option value="En Produccion">
                  En producción
                </option>

                <option value="A tiempo">
                  A tiempo
                </option>

                <option value="Retrasado">
                  Retrasado
                </option>

                <option value="Finalizado">
                  Finalizado
                </option>

                <option value="Entregado">
                  Entregado
                </option>
              </select>
            </div>

            <div className="pedido-field pedido-field-full">
              <label htmlFor="observaciones">
                Observaciones
              </label>

              <textarea
                id="observaciones"
                name="observaciones"
                value={formulario.observaciones}
                onChange={manejarCambio}
                placeholder="Ingrese instrucciones, detalles o novedades del pedido"
                rows="4"
                maxLength="1000"
                disabled={guardando}
              />
            </div>

            <div className="pedido-field pedido-field-full">
              <label htmlFor="fecha_creacion">
                Fecha y hora de creación
              </label>

              <input
                id="fecha_creacion"
                name="fecha_creacion"
                type="datetime-local"
                value={formulario.fecha_creacion}
                onChange={manejarCambio}
                disabled={guardando}
                required
              />
            </div>
          </div>

          <div className="pedido-form-actions">
            <button
              type="button"
              className="pedido-cancel-button"
              onClick={onCerrar}
              disabled={guardando}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="pedido-save-button"
              disabled={guardando}
            >
              {guardando ? (
                <>
                  <span className="pedido-spinner" />
                  Guardando...
                </>
              ) : (
                "Guardar pedido"
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default CrearPedidoModal;