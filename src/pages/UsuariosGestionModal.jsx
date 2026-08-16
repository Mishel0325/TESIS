import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import "./UsuariosGestionModal.css";

const FORMULARIO_VACIO = {
  nombres: "",
  apellidos: "",
  correo: "",
  password: "",
  confirmar: "",
  id_rol: "2",
  estado: "Activo",
};

function mensajeError(error, alternativo) {
  const detalle = error?.response?.data?.detail;

  if (typeof detalle === "string" && detalle.trim()) return detalle;

  if (Array.isArray(detalle)) {
    const texto = detalle
      .map((item) => item?.msg || item?.message)
      .filter(Boolean)
      .join(". ");

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

function nombreCompleto(usuario) {
  return `${usuario?.nombres || ""} ${usuario?.apellidos || ""}`.trim() || "Usuario";
}

function inicialesUsuario(usuario) {
  const nombres = String(usuario?.nombres || "").trim();
  const apellidos = String(usuario?.apellidos || "").trim();

  return `${nombres.charAt(0)}${apellidos.charAt(0)}`.toUpperCase() || "U";
}

export default function UsuariosGestionModal({
  abierto,
  onCerrar,
  rolInicial = null,
}) {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const [modo, setModo] = useState("lista");
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [usuarioEditar, setUsuarioEditar] = useState(null);

  const [claveReset, setClaveReset] = useState("");
  const [confirmarReset, setConfirmarReset] = useState("");

  const [credencialesCreadas, setCredencialesCreadas] = useState(null);
  const [usuarioPendienteEliminar, setUsuarioPendienteEliminar] = useState(null);

  const criterios = useMemo(
    () => evaluarClave(formulario.password),
    [formulario.password]
  );

  const criteriosReset = useMemo(
    () => evaluarClave(claveReset),
    [claveReset]
  );

  const usuariosFiltrados = useMemo(() => {
    const filtro = busqueda.trim().toLowerCase();

    if (!filtro) return usuarios;

    return usuarios.filter((usuario) => {
      const texto = [
        usuario?.nombres,
        usuario?.apellidos,
        usuario?.correo,
        Number(usuario?.id_rol) === 1 ? "supervisor" : "consultor",
        usuario?.estado,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return texto.includes(filtro);
    });
  }, [usuarios, busqueda]);

  const totalSupervisores = useMemo(
    () => usuarios.filter((u) => Number(u?.id_rol) === 1).length,
    [usuarios]
  );

  const totalConsultores = useMemo(
    () => usuarios.filter((u) => Number(u?.id_rol) === 2).length,
    [usuarios]
  );

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
    setFormulario(FORMULARIO_VACIO);
    setUsuarioEditar(null);
    setUsuarioPendienteEliminar(null);
    setClaveReset("");
    setConfirmarReset("");
    setCredencialesCreadas(null);
    setBusqueda("");
    setError("");
    setMensaje("");

    cargarUsuarios();
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return undefined;

    const cerrarEscape = (event) => {
      if (
        event.key === "Escape" &&
        !guardando &&
        !usuarioPendienteEliminar
      ) {
        onCerrar?.();
      }
    };

    document.addEventListener("keydown", cerrarEscape);

    return () => document.removeEventListener("keydown", cerrarEscape);
  }, [abierto, guardando, onCerrar, usuarioPendienteEliminar]);

  if (!abierto) return null;

  const volverLista = () => {
    if (guardando) return;

    setModo("lista");
    setFormulario(FORMULARIO_VACIO);
    setUsuarioEditar(null);
    setClaveReset("");
    setConfirmarReset("");
    setError("");
  };

  const abrirCrear = () => {
    const rol =
      Number(rolInicial) === 1 || Number(rolInicial) === 2
        ? String(rolInicial)
        : "2";

    setFormulario({
      ...FORMULARIO_VACIO,
      id_rol: rol,
    });

    setUsuarioEditar(null);
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

    if (
      !payload.nombres ||
      !payload.apellidos ||
      !payload.correo ||
      !payload.password
    ) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    if (![1, 2].includes(payload.id_rol)) {
      setError("Seleccione un rol válido.");
      return;
    }

    if (!claveSegura(payload.password)) {
      setError(
        "La contraseña temporal debe cumplir todos los requisitos de seguridad."
      );
      return;
    }

    if (formulario.password !== formulario.confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setGuardando(true);

      await api.post("/users/", payload);

      setCredencialesCreadas({
        correo: payload.correo,
        password: payload.password,
      });

      setMensaje(
        "Usuario creado correctamente. En su primer ingreso deberá cambiar la contraseña temporal."
      );

      setFormulario(FORMULARIO_VACIO);
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

    setCredencialesCreadas(null);
    setError("");
    setMensaje("");
    setModo("editar");
  };

  const guardarEdicion = async (event) => {
    event.preventDefault();

    if (!usuarioEditar?.id_usuario) return;

    setError("");
    setMensaje("");

    const payload = {
      nombres: formulario.nombres.trim(),
      apellidos: formulario.apellidos.trim(),
      correo: formulario.correo.trim().toLowerCase(),
      id_rol: Number(formulario.id_rol),
      estado: formulario.estado,
    };

    if (!payload.nombres || !payload.apellidos || !payload.correo) {
      setError("Nombres, apellidos y correo son obligatorios.");
      return;
    }

    if (![1, 2].includes(payload.id_rol)) {
      setError("Seleccione un rol válido.");
      return;
    }

    try {
      setGuardando(true);

      await api.patch(`/users/${usuarioEditar.id_usuario}`, payload);

      setMensaje("Usuario actualizado correctamente.");
      setUsuarioEditar(null);
      setModo("lista");
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
    setCredencialesCreadas(null);
    setError("");
    setMensaje("");
    setModo("reset");
  };

  const guardarReset = async (event) => {
    event.preventDefault();

    if (!usuarioEditar?.id_usuario) return;

    setError("");
    setMensaje("");

    if (!claveSegura(claveReset)) {
      setError(
        "La contraseña temporal debe cumplir todos los requisitos de seguridad."
      );
      return;
    }

    if (claveReset !== confirmarReset) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setGuardando(true);

      await api.post(
        `/users/${usuarioEditar.id_usuario}/restablecer-password`,
        { nueva_password_temporal: claveReset }
      );

      setCredencialesCreadas({
        correo: usuarioEditar.correo,
        password: claveReset,
      });

      setMensaje(
        "Contraseña temporal restablecida. El usuario deberá cambiarla en el siguiente inicio de sesión."
      );

      setUsuarioEditar(null);
      setClaveReset("");
      setConfirmarReset("");
      setModo("lista");
      await cargarUsuarios();
    } catch (err) {
      setError(
        mensajeError(err, "No se pudo restablecer la contraseña.")
      );
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = async () => {
    const usuario = usuarioPendienteEliminar;

    if (!usuario?.id_usuario) return;

    try {
      setGuardando(true);
      setError("");

      await api.delete(`/users/${usuario.id_usuario}`);

      setUsuarioPendienteEliminar(null);
      setMensaje(
        `El usuario ${nombreCompleto(usuario)} fue eliminado correctamente.`
      );

      await cargarUsuarios();
    } catch (err) {
      setError(mensajeError(err, "No se pudo eliminar el usuario."));
      setUsuarioPendienteEliminar(null);
    } finally {
      setGuardando(false);
    }
  };

  const ReglasPassword = ({ criterio }) => (
    <div className="msu-password-rules">
      <span className={criterio.longitud ? "is-ok" : ""}>10 caracteres</span>
      <span className={criterio.mayuscula ? "is-ok" : ""}>Mayúscula</span>
      <span className={criterio.minuscula ? "is-ok" : ""}>Minúscula</span>
      <span className={criterio.numero ? "is-ok" : ""}>Número</span>
      <span className={criterio.especial ? "is-ok" : ""}>Símbolo</span>
    </div>
  );

  return (
    <div
      className="msu-overlay"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !guardando &&
          !usuarioPendienteEliminar
        ) {
          onCerrar?.();
        }
      }}
    >
      <section
        className="msu-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Administración de usuarios"
      >
        <header className="msu-header">
          <div className="msu-header-copy">
            <span>ADMINISTRACIÓN</span>
            <h2>Gestión de usuarios</h2>
            <p>Administre los usuarios, roles y accesos de esta cuenta.</p>
          </div>

          <button
            type="button"
            className="msu-close"
            onClick={onCerrar}
            disabled={guardando}
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        <div className="msu-body">
          {error && <div className="msu-alert is-error">{error}</div>}
          {mensaje && <div className="msu-alert is-success">{mensaje}</div>}

          {credencialesCreadas && (
            <div className="msu-credentials">
              <div className="msu-credentials-icon">✓</div>
              <div>
                <strong>Credenciales temporales</strong>
                <span>
                  Correo: <b>{credencialesCreadas.correo}</b>
                </span>
                <span>
                  Contraseña temporal: <b>{credencialesCreadas.password}</b>
                </span>
                <small>
                  El usuario deberá cambiar esta contraseña en su primer ingreso.
                </small>
              </div>
            </div>
          )}

          {modo === "lista" && (
            <>
              <section className="msu-summary">
                <article>
                  <span>Total</span>
                  <strong>{usuarios.length}</strong>
                  <small>usuarios registrados</small>
                </article>

                <article>
                  <span>Supervisores</span>
                  <strong>{totalSupervisores}</strong>
                  <small>con permisos administrativos</small>
                </article>

                <article>
                  <span>Consultores</span>
                  <strong>{totalConsultores}</strong>
                  <small>usuarios de consulta</small>
                </article>
              </section>

              <div className="msu-toolbar">
                <div className="msu-search">
                  <span>⌕</span>
                  <input
                    type="search"
                    placeholder="Buscar por nombre, correo o rol"
                    value={busqueda}
                    onChange={(event) => setBusqueda(event.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className="msu-primary"
                  onClick={abrirCrear}
                  disabled={guardando}
                >
                  <span>＋</span>
                  Nuevo usuario
                </button>
              </div>

              <div className="msu-list">
                {cargando ? (
                  <div className="msu-empty">Cargando usuarios...</div>
                ) : usuariosFiltrados.length === 0 ? (
                  <div className="msu-empty">
                    No existen usuarios que coincidan con la búsqueda.
                  </div>
                ) : (
                  usuariosFiltrados.map((usuario) => {
                    const supervisor = Number(usuario.id_rol) === 1;
                    const activo =
                      String(usuario.estado || "").toLowerCase() === "activo";

                    return (
                      <article
                        className="msu-user-card"
                        key={usuario.id_usuario}
                      >
                        <div className="msu-avatar">
                          {inicialesUsuario(usuario)}
                        </div>

                        <div className="msu-user-main">
                          <div className="msu-user-name-row">
                            <strong>{nombreCompleto(usuario)}</strong>

                            <span
                              className={`msu-role ${
                                supervisor ? "is-supervisor" : "is-consultor"
                              }`}
                            >
                              {supervisor ? "Supervisor" : "Consultor"}
                            </span>
                          </div>

                          <span className="msu-email">{usuario.correo}</span>

                          <div className="msu-user-meta">
                            <span>ID: {usuario.id_usuario}</span>
                            <span className={activo ? "is-active" : "is-inactive"}>
                              <i />
                              {usuario.estado || "Sin estado"}
                            </span>

                            {usuario.requiere_cambio_password && (
                              <span className="msu-password-pending">
                                Cambio de contraseña pendiente
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="msu-actions">
                          <button
                            type="button"
                            className="msu-action"
                            onClick={() => abrirEditar(usuario)}
                            disabled={guardando}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className="msu-action"
                            onClick={() => abrirReset(usuario)}
                            disabled={guardando}
                          >
                            Contraseña
                          </button>

                          <button
                            type="button"
                            className="msu-action is-danger"
                            onClick={() => {
                              setError("");
                              setMensaje("");
                              setUsuarioPendienteEliminar(usuario);
                            }}
                            disabled={guardando}
                          >
                            Eliminar
                          </button>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </>
          )}

          {modo === "crear" && (
            <form className="msu-form" onSubmit={guardarNuevo}>
              <div className="msu-form-heading">
                <div>
                  <span>NUEVO USUARIO</span>
                  <h3>Crear usuario interno</h3>
                  <p>
                    Registre un usuario y seleccione el nivel de acceso que tendrá.
                  </p>
                </div>

                <button
                  type="button"
                  className="msu-back"
                  onClick={volverLista}
                  disabled={guardando}
                >
                  ← Volver
                </button>
              </div>

              <div className="msu-form-grid">
                <label>
                  <span>Nombres *</span>
                  <input
                    value={formulario.nombres}
                    onChange={(event) =>
                      setFormulario((actual) => ({
                        ...actual,
                        nombres: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label>
                  <span>Apellidos *</span>
                  <input
                    value={formulario.apellidos}
                    onChange={(event) =>
                      setFormulario((actual) => ({
                        ...actual,
                        apellidos: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label className="msu-full">
                  <span>Correo electrónico *</span>
                  <input
                    type="email"
                    value={formulario.correo}
                    onChange={(event) =>
                      setFormulario((actual) => ({
                        ...actual,
                        correo: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label>
                  <span>Rol *</span>
                  <select
                    value={formulario.id_rol}
                    onChange={(event) =>
                      setFormulario((actual) => ({
                        ...actual,
                        id_rol: event.target.value,
                      }))
                    }
                  >
                    <option value="1">Supervisor</option>
                    <option value="2">Consultor</option>
                  </select>
                </label>

                <label>
                  <span>Contraseña temporal *</span>
                  <input
                    type="password"
                    value={formulario.password}
                    onChange={(event) =>
                      setFormulario((actual) => ({
                        ...actual,
                        password: event.target.value,
                      }))
                    }
                    autoComplete="new-password"
                    required
                  />
                </label>

                <div className="msu-full">
                  <ReglasPassword criterio={criterios} />
                </div>

                <label className="msu-full">
                  <span>Confirmar contraseña *</span>
                  <input
                    type="password"
                    value={formulario.confirmar}
                    onChange={(event) =>
                      setFormulario((actual) => ({
                        ...actual,
                        confirmar: event.target.value,
                      }))
                    }
                    autoComplete="new-password"
                    required
                  />
                </label>
              </div>

              <div className="msu-form-actions">
                <button type="button" onClick={volverLista} disabled={guardando}>
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="msu-primary"
                  disabled={guardando}
                >
                  {guardando ? "Guardando..." : "Crear usuario"}
                </button>
              </div>
            </form>
          )}

          {modo === "editar" && usuarioEditar && (
            <form className="msu-form" onSubmit={guardarEdicion}>
              <div className="msu-form-heading">
                <div>
                  <span>EDITAR USUARIO</span>
                  <h3>{nombreCompleto(usuarioEditar)}</h3>
                  <p>Actualice la información, rol o estado del usuario.</p>
                </div>

                <button
                  type="button"
                  className="msu-back"
                  onClick={volverLista}
                  disabled={guardando}
                >
                  ← Volver
                </button>
              </div>

              <div className="msu-form-grid">
                <label>
                  <span>Nombres *</span>
                  <input
                    value={formulario.nombres}
                    onChange={(event) =>
                      setFormulario((actual) => ({
                        ...actual,
                        nombres: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label>
                  <span>Apellidos *</span>
                  <input
                    value={formulario.apellidos}
                    onChange={(event) =>
                      setFormulario((actual) => ({
                        ...actual,
                        apellidos: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label className="msu-full">
                  <span>Correo electrónico *</span>
                  <input
                    type="email"
                    value={formulario.correo}
                    onChange={(event) =>
                      setFormulario((actual) => ({
                        ...actual,
                        correo: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label>
                  <span>Rol *</span>
                  <select
                    value={formulario.id_rol}
                    onChange={(event) =>
                      setFormulario((actual) => ({
                        ...actual,
                        id_rol: event.target.value,
                      }))
                    }
                  >
                    <option value="1">Supervisor</option>
                    <option value="2">Consultor</option>
                  </select>
                </label>

                <label>
                  <span>Estado *</span>
                  <select
                    value={formulario.estado}
                    onChange={(event) =>
                      setFormulario((actual) => ({
                        ...actual,
                        estado: event.target.value,
                      }))
                    }
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </label>
              </div>

              <div className="msu-form-actions">
                <button type="button" onClick={volverLista} disabled={guardando}>
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="msu-primary"
                  disabled={guardando}
                >
                  {guardando ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          )}

          {modo === "reset" && usuarioEditar && (
            <form className="msu-form" onSubmit={guardarReset}>
              <div className="msu-form-heading">
                <div>
                  <span>SEGURIDAD</span>
                  <h3>Restablecer contraseña</h3>
                  <p>
                    Se creará una contraseña temporal para{" "}
                    <b>{nombreCompleto(usuarioEditar)}</b>.
                  </p>
                </div>

                <button
                  type="button"
                  className="msu-back"
                  onClick={volverLista}
                  disabled={guardando}
                >
                  ← Volver
                </button>
              </div>

              <div className="msu-form-grid msu-form-grid-one">
                <label>
                  <span>Nueva contraseña temporal *</span>
                  <input
                    type="password"
                    value={claveReset}
                    onChange={(event) => setClaveReset(event.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </label>

                <ReglasPassword criterio={criteriosReset} />

                <label>
                  <span>Confirmar contraseña *</span>
                  <input
                    type="password"
                    value={confirmarReset}
                    onChange={(event) => setConfirmarReset(event.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </label>
              </div>

              <div className="msu-form-actions">
                <button type="button" onClick={volverLista} disabled={guardando}>
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="msu-primary"
                  disabled={guardando}
                >
                  {guardando ? "Guardando..." : "Restablecer contraseña"}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {usuarioPendienteEliminar && (
        <div className="msu-confirm-overlay">
          <section className="msu-confirm" role="dialog" aria-modal="true">
            <div className="msu-confirm-icon">!</div>

            <span>CONFIRMAR ELIMINACIÓN</span>
            <h3>¿Eliminar este usuario?</h3>

            <p>
              Se eliminará a{" "}
              <strong>{nombreCompleto(usuarioPendienteEliminar)}</strong>.
              Esta acción no se puede deshacer.
            </p>

            <small>
              El sistema impedirá eliminar la propia cuenta autenticada o al
              último Supervisor activo.
            </small>

            <div className="msu-confirm-actions">
              <button
                type="button"
                onClick={() => setUsuarioPendienteEliminar(null)}
                disabled={guardando}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="is-danger"
                onClick={confirmarEliminar}
                disabled={guardando}
              >
                {guardando ? "Eliminando..." : "Sí, eliminar usuario"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
