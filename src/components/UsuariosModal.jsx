import { useEffect, useState } from "react";
import api from "../api/axios";
import "./UsuariosModal.css";

function UsuariosModal({ abierto, onCerrar }) {
  const [usuarios, setUsuarios] = useState([]);
  const [error, setError] = useState("");

  const roleLabel = (idRol) => {
    if (idRol === 1) return "Supervisor";
    if (idRol === 2) return "Consultor";
    return `Rol ${idRol}`;
  };

  const formatFecha = (fecha) => {
    if (!fecha) return "No disponible";
    return new Intl.DateTimeFormat("es-EC", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(fecha));
  };

  useEffect(() => {
    if (abierto) {
      cargarUsuarios();
    }
  }, [abierto]);

  const cargarUsuarios = async () => {
    try {
      const respuesta = await api.get("/users/");
      setUsuarios(respuesta.data);
    } catch (error) {
      console.error(error);
      setError("No se pudo cargar la lista de usuarios.");
    }
  };

  if (!abierto) return null;

  return (
    <div className="usuarios-overlay">
      <div className="usuarios-modal">
        <header>
          <h2>Gestión de usuarios</h2>
          <button onClick={onCerrar} aria-label="Cerrar">
            ×
          </button>
        </header>

        {error && <div className="usuarios-error">{error}</div>}

        <div className="usuarios-lista">
          {usuarios.length === 0 ? (
            <p>No existen usuarios registrados.</p>
          ) : (
            usuarios.map((usuario) => (
              <div className="usuario-item" key={usuario.id_usuario}>
                <div className="usuario-top">
                  <strong>
                    {usuario.nombres} {usuario.apellidos}
                  </strong>
                  <span className="usuario-role">{roleLabel(usuario.id_rol)}</span>
                </div>
                <span>{usuario.correo}</span>
                <div className="usuario-meta">
                  <small>ID: {usuario.id_usuario}</small>
                  <small>Creado: {formatFecha(usuario.fecha_creacion)}</small>
                  <small>Estado: {usuario.estado || "No disponible"}</small>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default UsuariosModal;
