import { useEffect, useState } from "react";
import api from "../api/axios";
import "./EditarMaquilaModal.css";

const VACIO = {
  nombre_maquila: "",
  responsable: "",
  telefono: "",
  direccion: "",
  estado: "Activo",
};

function obtenerMensajeError(error, alternativo) {
  const detalle = error?.response?.data?.detail;

  if (typeof detalle === "string" && detalle.trim()) {
    return detalle;
  }

  if (Array.isArray(detalle)) {
    const texto = detalle
      .map((item) => item?.msg || item?.message || String(item))
      .filter(Boolean)
      .join(". ");

    if (texto) return texto;
  }

  return alternativo;
}

function telefonoValido(valor) {
  return /^\d{10}$/.test(String(valor || "").trim());
}

export default function EditarMaquilaModal({
  abierto,
  maquila,
  onCerrar,
  onMaquilaActualizada,
}) {
  const [formulario, setFormulario] = useState(VACIO);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!abierto || !maquila) return;

    setFormulario({
      nombre_maquila:
        maquila.nombre_maquila ??
        maquila.nombre ??
        maquila.nombre_taller ??
        maquila.taller ??
        "",
      responsable:
        maquila.responsable ??
        maquila.nombre_responsable ??
        maquila.encargado ??
        "",
      telefono:
        maquila.telefono ??
        maquila.celular ??
        "",
      direccion:
        maquila.direccion ??
        maquila.domicilio ??
        "",
      estado:
        maquila.estado ??
        maquila.status ??
        (maquila.activa === false ? "Inactivo" : "Activo"),
    });

    setError("");
  }, [abierto, maquila]);

  useEffect(() => {
    if (!abierto) return undefined;

    const cerrarConEscape = (event) => {
      if (event.key === "Escape" && !guardando) {
        onCerrar?.();
      }
    };

    document.addEventListener("keydown", cerrarConEscape);

    return () => {
      document.removeEventListener("keydown", cerrarConEscape);
    };
  }, [abierto, guardando, onCerrar]);

  if (!abierto || !maquila) return null;

  const idMaquila = maquila.id_maquila ?? maquila.id;

  const cambiar = (campo, valor) => {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  };

  const guardar = async (event) => {
    event.preventDefault();
    setError("");

    const payload = {
      nombre_maquila: formulario.nombre_maquila.trim(),
      responsable: formulario.responsable.trim(),
      telefono: formulario.telefono.trim(),
      direccion: formulario.direccion.trim(),
      estado: formulario.estado,
    };

    if (!idMaquila) {
      setError("No se pudo identificar la maquila seleccionada.");
      return;
    }

    if (
      !payload.nombre_maquila ||
      !payload.responsable ||
      !payload.telefono ||
      !payload.direccion ||
      !payload.estado
    ) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    if (!telefonoValido(payload.telefono)) {
      setError("El teléfono debe contener exactamente 10 números.");
      return;
    }

    try {
      setGuardando(true);

      try {
        await api.put(`/maquilas/${idMaquila}`, payload);
      } catch (err) {
        /*
         * Compatibilidad con una versión anterior del schema que
         * utilizaba "nombre" en lugar de "nombre_maquila".
         */
        if (err?.response?.status !== 422) throw err;

        await api.put(`/maquilas/${idMaquila}`, {
          ...payload,
          nombre: payload.nombre_maquila,
        });
      }

      await onMaquilaActualizada?.();
    } catch (err) {
      setError(
        obtenerMensajeError(
          err,
          "No se pudo actualizar la información de la maquila."
        )
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="editar-maquila-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !guardando) {
          onCerrar?.();
        }
      }}
    >
      <section
        className="editar-maquila-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Editar maquila"
      >
        <header className="editar-maquila-header">
          <div>
            <span>GESTIÓN DE TALLERES</span>
            <h2>Editar información de maquila</h2>
            <p>
              Actualice los datos registrados del taller seleccionado.
            </p>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        <form
          className="editar-maquila-form"
          onSubmit={guardar}
        >
          {error && (
            <div className="editar-maquila-error">
              {error}
            </div>
          )}

          <div className="editar-maquila-id">
            <span>Registro seleccionado</span>
            <strong>
              ID {idMaquila} ·{" "}
              {formulario.nombre_maquila || "Maquila"}
            </strong>
          </div>

          <label>
            <span>Taller / Maquila *</span>
            <input
              type="text"
              value={formulario.nombre_maquila}
              onChange={(event) =>
                cambiar("nombre_maquila", event.target.value)
              }
              maxLength={100}
              required
              disabled={guardando}
            />
          </label>

          <label>
            <span>Responsable / dueño del taller *</span>
            <input
              type="text"
              value={formulario.responsable}
              onChange={(event) =>
                cambiar("responsable", event.target.value)
              }
              maxLength={120}
              required
              disabled={guardando}
            />
          </label>

          <label>
            <span>Teléfono de contacto *</span>
            <input
              type="tel"
              inputMode="numeric"
              value={formulario.telefono}
              onChange={(event) => {
                const soloNumeros = event.target.value
                  .replace(/\D/g, "")
                  .slice(0, 10);

                cambiar("telefono", soloNumeros);
              }}
              placeholder="0991234567"
              pattern="[0-9]{10}"
              minLength={10}
              maxLength={10}
              required
              disabled={guardando}
            />
            <small>Exactamente 10 números.</small>
          </label>

          <label>
            <span>Dirección *</span>
            <input
              type="text"
              value={formulario.direccion}
              onChange={(event) =>
                cambiar("direccion", event.target.value)
              }
              maxLength={255}
              required
              disabled={guardando}
            />
          </label>

          <label>
            <span>Estado *</span>
            <select
              value={formulario.estado}
              onChange={(event) =>
                cambiar("estado", event.target.value)
              }
              required
              disabled={guardando}
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </label>

          <div className="editar-maquila-actions">
            <button
              type="button"
              className="secondary"
              onClick={onCerrar}
              disabled={guardando}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="primary"
              disabled={guardando}
            >
              {guardando
                ? "Guardando cambios..."
                : "Guardar cambios"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
