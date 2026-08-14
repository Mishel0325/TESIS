import { useEffect, useState } from "react";
import api from "../api/axios";
import "./CrearMaquilaModal.css";

const FORMULARIO_VACIO = {
  nombre: "",
  responsable: "",
  telefono: "",
  direccion: "",
  estado: "Activo",
};

function obtenerMensajeError(error) {
  const detalle = error?.response?.data?.detail;
  if (typeof detalle === "string") return detalle;
  if (Array.isArray(detalle)) {
    return detalle.map((item) => item?.msg).filter(Boolean).join(". ");
  }
  return "No se pudo crear el taller / maquila.";
}

export default function CrearMaquilaModal({ abierto, onCerrar, onMaquilaCreada }) {
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto) {
      setFormulario(FORMULARIO_VACIO);
      setError("");
    }
  }, [abierto]);

  if (!abierto) return null;

  const cambiar = (campo, valor) => {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  };

  const guardar = async (event) => {
    event.preventDefault();
    setError("");

    const payload = {
      nombre: formulario.nombre.trim(),
      responsable: formulario.responsable.trim(),
      telefono: formulario.telefono.trim(),
      direccion: formulario.direccion.trim(),
      estado: formulario.estado,
    };

    if (!payload.nombre || !payload.responsable || !payload.telefono || !payload.direccion) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    if (!/^\d{10}$/.test(payload.telefono)) {
      setError("El teléfono debe contener exactamente 10 números.");
      return;
    }

    try {
      setGuardando(true);
      const respuesta = await api.post("/maquilas/", payload);
      await onMaquilaCreada?.(respuesta.data);
      onCerrar?.();
    } catch (err) {
      setError(obtenerMensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="maquila-create-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !guardando) onCerrar?.();
      }}
    >
      <section
        className="maquila-create-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="crear-maquila-title"
      >
        <header className="maquila-create-header">
          <div>
            <span>GESTIÓN DE TALLERES</span>
            <h2 id="crear-maquila-title">Crear nueva maquila</h2>
          </div>
          <button type="button" onClick={onCerrar} disabled={guardando} aria-label="Cerrar">
            ×
          </button>
        </header>

        <form className="maquila-create-form" onSubmit={guardar}>
          {error && <div className="maquila-create-error">{error}</div>}

          <label>
            <span>Taller / Maquila *</span>
            <input
              type="text"
              value={formulario.nombre}
              onChange={(e) => cambiar("nombre", e.target.value)}
              placeholder="Ej.: Taller Luz"
              maxLength={100}
              required
              autoFocus
              disabled={guardando}
            />
          </label>

          <label>
            <span>Responsable / dueño del taller *</span>
            <input
              type="text"
              value={formulario.responsable}
              onChange={(e) => cambiar("responsable", e.target.value)}
              placeholder="Nombre del responsable"
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
              onChange={(e) => {
                const soloNumeros = e.target.value.replace(/\D/g, "").slice(0, 10);
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
              onChange={(e) => cambiar("direccion", e.target.value)}
              placeholder="Dirección del taller"
              maxLength={255}
              required
              disabled={guardando}
            />
          </label>

          <label>
            <span>Estado *</span>
            <select
              value={formulario.estado}
              onChange={(e) => cambiar("estado", e.target.value)}
              required
              disabled={guardando}
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </label>

          <div className="maquila-create-actions">
            <button type="button" className="secondary" onClick={onCerrar} disabled={guardando}>
              Cancelar
            </button>
            <button type="submit" className="primary" disabled={guardando}>
              {guardando ? "Creando..." : "Crear maquila"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
