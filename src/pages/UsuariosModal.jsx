import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import "./UsuariosModal.css";

const VACIO = {
  nombres: "",
  apellidos: "",
  correo: "",
  password: "",
  confirmar: "",
  id_rol: "",
};

function mensajeError(error, alternativo) {
  const detalle = error?.response?.data?.detail;
  if (typeof detalle === "string" && detalle.trim()) return detalle;
  if (Array.isArray(detalle)) {
    const texto = detalle.map((item) => item?.msg).filter(Boolean).join(". ");
    if (texto) return texto;
  }
  return error?.message || alternativo;
}

function evaluarClave(clave = "") {
  return {
    longitud: clave.length >= 10,
    mayuscula: /[A-ZÁÉÍÓÚÑ]/.test(clave),
    minuscula: /[a-záéíóúñ]/.test(clave),
    numero: /\d/.test(clave),
    especial: /[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9\s]/.test(clave),
  };
}

function claveSegura(clave) {
  return Object.values(evaluarClave(clave)).every(Boolean);
}

export default function UsuariosModal({ abierto, onCerrar }) {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [modo, setModo] = useState("lista");
  const [formulario, setFormulario] = useState(VACIO);
  const [usuarioEditar, setUsuarioEditar] = useState(null);
  const [claveReset, setClaveReset] = useState("");
  const [confirmarReset, setConfirmarReset] = useState("");
  const [credencialesCreadas, setCredencialesCreadas] = useState(null);

  const criterios = useMemo(() => evaluarClave(formulario.password), [formulario.password]);
  const criteriosReset = useMemo(() => evaluarClave(claveReset), [claveReset]);

  const cargarUsuarios = async () => {
    setCargando(true);
    setError("");
    try {
      const response = await api.get("/users/");
      const lista = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.items)
        ? response.data.items
        : [];
      setUsuarios(lista);
    } catch (err) {
      setError(mensajeError(err, "No se pudieron cargar los usuarios."));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (!abierto) return;
    setModo("lista");
    setMensaje("");
    setError("");
    setCredencialesCreadas(null);
    cargarUsuarios();
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    const cerrarEscape = (event) => {
      if (event.key === "Escape" && !guardando) onCerrar?.();
    };
    document.addEventListener("keydown", cerrarEscape);
    return () => document.removeEventListener("keydown", cerrarEscape);
  }, [abierto, guardando, onCerrar]);

  if (!abierto) return null;

  const abrirCrear = () => {
    setFormulario({ ...VACIO, id_rol: "" });
    setCredencialesCreadas(null);
    setError("");
    setMensaje("");
    setModo("crear");
  };

  const guardarNuevo = async (event) => {
    event.preventDefault();
    setError("");
    setMensaje("");

    const payload = {
      nombres: formulario.nombres.trim(),
      apellidos: formulario.apellidos.trim(),
      correo: formulario.correo.trim().toLowerCase(),
      password: formulario.password,
      id_rol: Number(formulario.id_rol),
    };

    if (!payload.nombres || !payload.apellidos || !payload.correo || !payload.password) {
      return setError("Todos los campos son obligatorios.");
    }
    if (![1, 2].includes(payload.id_rol)) return setError("Seleccione un rol válido.");
    if (!claveSegura(payload.password)) {
      return setError("La contraseña temporal debe cumplir todos los requisitos de seguridad.");
    }
    if (formulario.password !== formulario.confirmar) {
      return setError("Las contraseñas no coinciden.");
    }

    try {
      setGuardando(true);
      await api.post("/users/", payload);
      setCredencialesCreadas({ correo: payload.correo, password: payload.password });
      setMensaje("Usuario creado. En su primer ingreso deberá cambiar obligatoriamente la contraseña.");
      setFormulario({ ...VACIO, id_rol: "" });
      await cargarUsuarios();
      setModo("lista");
    } catch (err) {
      setError(mensajeError(err, "No se pudo crear el usuario."));
    } finally {
      setGuardando(false);
    }
  };

  const abrirEditar = (usuario) => {
    setUsuarioEditar(usuario);
    setFormulario({
      nombres: usuario.nombres || "",
      apellidos: usuario.apellidos || "",
      correo: usuario.correo || "",
      password: "",
      confirmar: "",
      id_rol: String(usuario.id_rol || 2),
      estado: usuario.estado || "Activo",
    });
    setError("");
    setMensaje("");
    setModo("editar");
  };

  const guardarEdicion = async (event) => {
    event.preventDefault();
    if (!usuarioEditar) return;
    setError("");

    const payload = {
      nombres: formulario.nombres.trim(),
      apellidos: formulario.apellidos.trim(),
      correo: formulario.correo.trim().toLowerCase(),
      id_rol: Number(formulario.id_rol),
      estado: formulario.estado,
    };

    if (!payload.nombres || !payload.apellidos || !payload.correo) {
      return setError("Nombres, apellidos y correo son obligatorios.");
    }

    try {
      setGuardando(true);
      await api.patch(`/users/${usuarioEditar.id_usuario}`, payload);
      setMensaje("Usuario actualizado correctamente.");
      setModo("lista");
      setUsuarioEditar(null);
      await cargarUsuarios();
    } catch (err) {
      setError(mensajeError(err, "No se pudo actualizar el usuario."));
    } finally {
      setGuardando(false);
    }
  };

  const abrirReset = (usuario) => {
    setUsuarioEditar(usuario);
    setClaveReset("");
    setConfirmarReset("");
    setError("");
    setMensaje("");
    setModo("reset");
  };

  const guardarReset = async (event) => {
    event.preventDefault();
    if (!usuarioEditar) return;
    setError("");

    if (!claveSegura(claveReset)) {
      return setError("La contraseña temporal debe cumplir todos los requisitos de seguridad.");
    }
    if (claveReset !== confirmarReset) return setError("Las contraseñas no coinciden.");

    try {
      setGuardando(true);
      await api.post(`/users/${usuarioEditar.id_usuario}/restablecer-password`, {
        nueva_password_temporal: claveReset,
      });
      setCredencialesCreadas({ correo: usuarioEditar.correo, password: claveReset });
      setMensaje("Contraseña temporal restablecida. El usuario deberá cambiarla en el siguiente ingreso.");
      setModo("lista");
      await cargarUsuarios();
    } catch (err) {
      setError(mensajeError(err, "No se pudo restablecer la contraseña."));
    } finally {
      setGuardando(false);
    }
  };

  const eliminarUsuario = async (usuario) => {
    const confirmar = window.confirm(
      `¿Eliminar al usuario ${usuario.nombres} ${usuario.apellidos}? Esta acción no se puede deshacer.`
    );
    if (!confirmar) return;

    try {
      setGuardando(true);
      setError("");
      await api.delete(`/users/${usuario.id_usuario}`);
      setMensaje("Usuario eliminado correctamente.");
      await cargarUsuarios();
    } catch (err) {
      setError(mensajeError(err, "No se pudo eliminar el usuario."));
    } finally {
      setGuardando(false);
    }
  };

  const reglas = (c) => (
    <div className="users-password-rules">
      <span className={c.longitud ? "ok" : ""}>10 caracteres</span>
      <span className={c.mayuscula ? "ok" : ""}>Mayúscula</span>
      <span className={c.minuscula ? "ok" : ""}>Minúscula</span>
      <span className={c.numero ? "ok" : ""}>Número</span>
      <span className={c.especial ? "ok" : ""}>Símbolo</span>
    </div>
  );

  return (
    <div className="users-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && !guardando && onCerrar?.()}>
      <section className="users-modal" role="dialog" aria-modal="true" aria-label="Administración de usuarios">
        <header className="users-modal-header">
          <div>
            <span>ADMINISTRACIÓN</span>
            <h2>Usuarios del sistema</h2>
          </div>
          <button type="button" onClick={onCerrar} disabled={guardando} aria-label="Cerrar">×</button>
        </header>

        <div className="users-modal-body">
          {error && <div className="users-alert error">{error}</div>}
          {mensaje && <div className="users-alert success">{mensaje}</div>}

          {credencialesCreadas && (
            <div className="users-credentials">
              <strong>Credenciales temporales para entregar al usuario</strong>
              <span>Correo: <b>{credencialesCreadas.correo}</b></span>
              <span>Contraseña temporal: <b>{credencialesCreadas.password}</b></span>
              <small>En el primer ingreso el sistema obligará a establecer una nueva contraseña.</small>
            </div>
          )}

          {modo === "lista" && (
            <>
              <div className="users-toolbar">
                <div>
                  <strong>{usuarios.length} usuario(s)</strong>
                  <span>Solo los Supervisores pueden administrar este módulo.</span>
                </div>
                <button type="button" className="users-primary" onClick={abrirCrear}>+ Nuevo usuario</button>
              </div>

              <div className="users-table-wrap">
                <table className="users-table">
                  <thead>
                    <tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Cambio de clave</th><th>Acciones</th></tr>
                  </thead>
                  <tbody>
                    {cargando ? (
                      <tr><td colSpan="6" className="users-empty">Cargando...</td></tr>
                    ) : usuarios.length === 0 ? (
                      <tr><td colSpan="6" className="users-empty">No existen usuarios registrados.</td></tr>
                    ) : usuarios.map((usuario) => (
                      <tr key={usuario.id_usuario}>
                        <td><strong>{usuario.nombres} {usuario.apellidos}</strong></td>
                        <td>{usuario.correo}</td>
                        <td>{Number(usuario.id_rol) === 1 ? "Supervisor" : "Consultor"}</td>
                        <td><span className={`users-status ${String(usuario.estado).toLowerCase() === "activo" ? "active" : "inactive"}`}>{usuario.estado}</span></td>
                        <td>{usuario.requiere_cambio_password ? "Pendiente" : "Actualizada"}</td>
                        <td>
                          <div className="users-actions">
                            <button type="button" onClick={() => abrirEditar(usuario)}>Editar</button>
                            <button type="button" onClick={() => abrirReset(usuario)}>Clave</button>
                            <button type="button" className="danger" onClick={() => eliminarUsuario(usuario)}>Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {modo === "crear" && (
            <form className="users-form" onSubmit={guardarNuevo}>
              <h3>Crear usuario interno</h3>
              <p>La contraseña será temporal y deberá cambiarse obligatoriamente en el primer ingreso.</p>
              <div className="users-form-grid">
                <label><span>Nombres *</span><input value={formulario.nombres} onChange={(e)=>setFormulario({...formulario,nombres:e.target.value})} required /></label>
                <label><span>Apellidos *</span><input value={formulario.apellidos} onChange={(e)=>setFormulario({...formulario,apellidos:e.target.value})} required /></label>
                <label className="full"><span>Correo electrónico *</span><input type="email" value={formulario.correo} onChange={(e)=>setFormulario({...formulario,correo:e.target.value})} required /></label>
                <label><span>Rol *</span><select value={formulario.id_rol} onChange={(e)=>setFormulario({...formulario,id_rol:e.target.value})} required><option value="" disabled>Seleccione un rol</option><option value="1">Supervisor</option><option value="2">Consultor</option></select></label>
                <label><span>Contraseña temporal *</span><input type="password" value={formulario.password} onChange={(e)=>setFormulario({...formulario,password:e.target.value})} required /></label>
                <div className="full">{reglas(criterios)}</div>
                <label className="full"><span>Confirmar contraseña *</span><input type="password" value={formulario.confirmar} onChange={(e)=>setFormulario({...formulario,confirmar:e.target.value})} required /></label>
              </div>
              <div className="users-form-actions"><button type="button" onClick={()=>setModo("lista")}>Cancelar</button><button className="users-primary" type="submit" disabled={guardando}>{guardando ? "Guardando..." : "Crear usuario"}</button></div>
            </form>
          )}

          {modo === "editar" && usuarioEditar && (
            <form className="users-form" onSubmit={guardarEdicion}>
              <h3>Editar usuario</h3>
              <div className="users-form-grid">
                <label><span>Nombres *</span><input value={formulario.nombres} onChange={(e)=>setFormulario({...formulario,nombres:e.target.value})} required /></label>
                <label><span>Apellidos *</span><input value={formulario.apellidos} onChange={(e)=>setFormulario({...formulario,apellidos:e.target.value})} required /></label>
                <label className="full"><span>Correo electrónico *</span><input type="email" value={formulario.correo} onChange={(e)=>setFormulario({...formulario,correo:e.target.value})} required /></label>
                <label><span>Rol *</span><select value={formulario.id_rol} onChange={(e)=>setFormulario({...formulario,id_rol:e.target.value})}><option value="1">Supervisor</option><option value="2">Consultor</option></select></label>
                <label><span>Estado *</span><select value={formulario.estado} onChange={(e)=>setFormulario({...formulario,estado:e.target.value})}><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select></label>
              </div>
              <div className="users-form-actions"><button type="button" onClick={()=>setModo("lista")}>Cancelar</button><button className="users-primary" type="submit" disabled={guardando}>Guardar cambios</button></div>
            </form>
          )}

          {modo === "reset" && usuarioEditar && (
            <form className="users-form" onSubmit={guardarReset}>
              <h3>Restablecer contraseña</h3>
              <p>{usuarioEditar.nombres} {usuarioEditar.apellidos} deberá cambiar esta clave en el siguiente inicio de sesión.</p>
              <div className="users-form-grid one">
                <label><span>Nueva contraseña temporal *</span><input type="password" value={claveReset} onChange={(e)=>setClaveReset(e.target.value)} required /></label>
                <div>{reglas(criteriosReset)}</div>
                <label><span>Confirmar contraseña *</span><input type="password" value={confirmarReset} onChange={(e)=>setConfirmarReset(e.target.value)} required /></label>
              </div>
              <div className="users-form-actions"><button type="button" onClick={()=>setModo("lista")}>Cancelar</button><button className="users-primary" type="submit" disabled={guardando}>Restablecer contraseña</button></div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}