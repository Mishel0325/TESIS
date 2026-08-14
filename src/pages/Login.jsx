import { useMemo, useState } from "react";
import api from "../api/axios";
import logoMaquila from "../assets/logo-maquila.png";
import "./Login.css";

const ENDPOINTS_REGISTRO = [
  "/auth/registro",
  "/usuarios/registro",
  "/usuarios/register",
];

const ENDPOINTS_CAMBIO_CLAVE = [
  "/auth/cambiar-password",
  "/usuarios/cambiar-password",
  "/usuarios/cambiar_clave",
];

function obtenerDetalleError(err, alternativo) {
  const detalle = err?.response?.data?.detail;

  if (typeof detalle === "string" && detalle.trim()) return detalle;

  if (Array.isArray(detalle)) {
    const texto = detalle
      .map((item) => item?.msg || item?.message)
      .filter(Boolean)
      .join(". ");
    if (texto) return texto;
  }

  if (err?.code === "ERR_NETWORK") {
    return "No se pudo conectar con el servidor. Verifique que FastAPI esté ejecutándose.";
  }

  return err?.message || alternativo;
}

async function postPrimeraRutaDisponible(rutas, payload, config = {}) {
  let ultimoError = null;

  for (const ruta of rutas) {
    try {
      return await api.post(ruta, payload, config);
    } catch (error) {
      ultimoError = error;
      const estado = error?.response?.status;

      if (estado !== 404 && estado !== 405) throw error;
    }
  }

  throw ultimoError || new Error("No se encontró una ruta disponible en el backend.");
}

function evaluarClave(clave) {
  return {
    longitud: clave.length >= 10,
    mayuscula: /[A-ZÁÉÍÓÚÑ]/.test(clave),
    minuscula: /[a-záéíóúñ]/.test(clave),
    numero: /\d/.test(clave),
    especial: /[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9\s]/.test(clave),
  };
}

function claveEsSegura(clave) {
  return Object.values(evaluarClave(clave)).every(Boolean);
}

function Login({ setToken, setUsuario }) {
  const [modo, setModo] = useState("login");

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const [registro, setRegistro] = useState({
    nombres: "",
    apellidos: "",
    correo: "",
    password: "",
    confirmar: "",
  });
  const [mostrarRegistroPassword, setMostrarRegistroPassword] = useState(false);

  const [tokenTemporal, setTokenTemporal] = useState("");
  const [usuarioTemporal, setUsuarioTemporal] = useState(null);
  const [nuevaClave, setNuevaClave] = useState("");
  const [confirmarNuevaClave, setConfirmarNuevaClave] = useState("");
  const [mostrarNuevaClave, setMostrarNuevaClave] = useState(false);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const criteriosRegistro = useMemo(
    () => evaluarClave(registro.password),
    [registro.password]
  );

  const criteriosNuevaClave = useMemo(
    () => evaluarClave(nuevaClave),
    [nuevaClave]
  );

  const limpiarMensajes = () => {
    setError("");
    setMensaje("");
  };

  const completarIngreso = (accessToken, usuarioAutenticado) => {
    localStorage.setItem("token", accessToken);
    localStorage.setItem("usuario", JSON.stringify(usuarioAutenticado));

    if (typeof setUsuario === "function") setUsuario(usuarioAutenticado);
    if (typeof setToken === "function") setToken(accessToken);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    limpiarMensajes();

    const correoLimpio = correo.trim().toLowerCase();

    if (!correoLimpio) return setError("Ingrese su correo electrónico.");
    if (!password) return setError("Ingrese su contraseña.");

    try {
      setCargando(true);

      const datosLogin = new URLSearchParams();
      datosLogin.append("username", correoLimpio);
      datosLogin.append("password", password);

      const response = await api.post("/auth/login", datosLogin, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const accessToken = response.data?.access_token;
      const usuarioAutenticado = response.data?.usuario;

      if (!accessToken) throw new Error("El servidor no devolvió el token de acceso.");
      if (!usuarioAutenticado) {
        throw new Error("El servidor no devolvió la información del usuario.");
      }

      if (usuarioAutenticado?.requiere_cambio_password === true) {
        setTokenTemporal(accessToken);
        setUsuarioTemporal(usuarioAutenticado);
        setNuevaClave("");
        setConfirmarNuevaClave("");
        setPassword("");
        setModo("cambiar-clave");
        setMensaje("Por seguridad debe crear una nueva contraseña antes de continuar.");
        return;
      }

      completarIngreso(accessToken, usuarioAutenticado);
    } catch (err) {
      console.error("Error al iniciar sesión:", err);
      setError(obtenerDetalleError(err, "No se pudo iniciar sesión. Verifique sus credenciales."));
    } finally {
      setCargando(false);
    }
  };

  const handleRegistro = async (event) => {
    event.preventDefault();
    limpiarMensajes();

    const payload = {
      nombres: registro.nombres.trim(),
      apellidos: registro.apellidos.trim(),
      correo: registro.correo.trim().toLowerCase(),
      password: registro.password,
    };

    if (!payload.nombres) return setError("Ingrese sus nombres.");
    if (!payload.apellidos) return setError("Ingrese sus apellidos.");
    if (!payload.correo) return setError("Ingrese su correo electrónico.");
    if (!claveEsSegura(payload.password)) {
      return setError("La contraseña no cumple todos los requisitos de seguridad.");
    }
    if (registro.password !== registro.confirmar) {
      return setError("Las contraseñas no coinciden.");
    }

    try {
      setCargando(true);

      await postPrimeraRutaDisponible(ENDPOINTS_REGISTRO, payload);

      // Al registrarse desde el Login, la cuenta siempre es Supervisor.
      // Iniciamos sesión inmediatamente para que pueda comenzar a trabajar.
      const datosLogin = new URLSearchParams();
      datosLogin.append("username", payload.correo);
      datosLogin.append("password", payload.password);

      const responseLogin = await api.post("/auth/login", datosLogin, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const accessToken = responseLogin.data?.access_token;
      const usuarioAutenticado = responseLogin.data?.usuario;

      if (!accessToken || !usuarioAutenticado) {
        throw new Error("La cuenta se creó, pero no fue posible iniciar sesión automáticamente.");
      }

      setRegistro({ nombres: "", apellidos: "", correo: "", password: "", confirmar: "" });
      completarIngreso(accessToken, usuarioAutenticado);
    } catch (err) {
      console.error("Error al registrar usuario:", err);
      setError(
        obtenerDetalleError(
          err,
          "No se pudo crear el usuario. El backend debe disponer de una ruta pública de registro."
        )
      );
    } finally {
      setCargando(false);
    }
  };

  const handleCambioClave = async (event) => {
    event.preventDefault();
    limpiarMensajes();

    if (!claveEsSegura(nuevaClave)) {
      return setError("La nueva contraseña no cumple todos los requisitos de seguridad.");
    }

    if (nuevaClave !== confirmarNuevaClave) {
      return setError("Las contraseñas no coinciden.");
    }

    try {
      setCargando(true);

      const response = await postPrimeraRutaDisponible(
        ENDPOINTS_CAMBIO_CLAVE,
        { nueva_password: nuevaClave },
        { headers: { Authorization: `Bearer ${tokenTemporal}` } }
      );

      // El backend devuelve un token NUEVO con requiere_cambio_password=false.
      // Esto evita conservar un JWT antiguo con el estado de cambio obligatorio.
      const tokenActualizado = response.data?.access_token || tokenTemporal;
      const usuarioActualizado = response.data?.usuario || {
        ...(usuarioTemporal || {}),
        requiere_cambio_password: false,
      };

      completarIngreso(tokenActualizado, usuarioActualizado);
    } catch (err) {
      console.error("Error al cambiar contraseña:", err);
      setError(
        obtenerDetalleError(
          err,
          "No se pudo cambiar la contraseña. Verifique la ruta de cambio de contraseña del backend."
        )
      );
    } finally {
      setCargando(false);
    }
  };

  const cambiarModo = (nuevoModo) => {
    if (cargando) return;
    limpiarMensajes();
    setModo(nuevoModo);
  };

  const renderCriterios = (criterios) => (
    <div className="password-rules" aria-label="Requisitos de contraseña">
      <span className={criterios.longitud ? "is-valid" : ""}>10 caracteres</span>
      <span className={criterios.mayuscula ? "is-valid" : ""}>Mayúscula</span>
      <span className={criterios.minuscula ? "is-valid" : ""}>Minúscula</span>
      <span className={criterios.numero ? "is-valid" : ""}>Número</span>
      <span className={criterios.especial ? "is-valid" : ""}>Símbolo</span>
    </div>
  );

  return (
    <div className="login-page">
      <header className="login-header">
        <div className="header-container">
          <div className="header-brand">
            <img src={logoMaquila} alt="Maquila System EC" className="header-logo" />
            <div className="header-title">
              <span>Maquila System EC</span>
              <small>Sistema de gestión y seguimiento de producción</small>
            </div>
          </div>
        </div>
      </header>

      <main className="login-main">
        <section className={`login-card login-card-${modo}`}>
          <div className="card-top-line" />

          <div className="login-card-content">
            <div className="login-card-logo-container">
              <img src={logoMaquila} alt="Maquila System EC" className="login-card-logo" />
            </div>

            {modo === "login" && (
              <>
                <div className="login-heading">
                  <h1>Iniciar sesión</h1>
                  <p>Ingrese sus credenciales para acceder al sistema.</p>
                </div>

                {error && <div className="login-error" role="alert">{error}</div>}
                {mensaje && <div className="login-success" role="status">{mensaje}</div>}

                <form onSubmit={handleSubmit} className="login-form">
                  <div className="form-group">
                    <label htmlFor="correo">Correo electrónico</label>
                    <div className="input-container">
                      <input
                        id="correo"
                        name="correo"
                        type="email"
                        value={correo}
                        onChange={(e) => setCorreo(e.target.value)}
                        placeholder="ejemplo@correo.com"
                        autoComplete="username"
                        disabled={cargando}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="password">Contraseña</label>
                    <div className="input-container">
                      <input
                        id="password"
                        name="password"
                        type={mostrarPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Ingrese su contraseña"
                        autoComplete="current-password"
                        disabled={cargando}
                        required
                      />
                      <button
                        type="button"
                        className="show-password-button"
                        onClick={() => setMostrarPassword((actual) => !actual)}
                        disabled={cargando}
                      >
                        {mostrarPassword ? "Ocultar" : "Ver"}
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="login-button" disabled={cargando}>
                    {cargando ? <><span className="loading-spinner" />Ingresando...</> : "INICIAR SESIÓN"}
                  </button>
                </form>

                <div className="login-register-access">
                  <span>¿Es un usuario nuevo?</span>
                  <button type="button" onClick={() => cambiarModo("registro")} disabled={cargando}>
                    Crear una cuenta
                  </button>
                </div>
              </>
            )}

            {modo === "registro" && (
              <>
                <div className="login-heading">
                  <h1>Crear usuario</h1>
                  <p>Complete sus datos para registrarse en Maquila System EC.</p>
                </div>

                <div className="registration-note">
                  Toda cuenta creada desde esta pantalla se registra como Supervisor. Después de ingresar podrá crear otros usuarios desde el panel y elegir si serán Supervisor o Consultor.
                </div>

                {error && <div className="login-error" role="alert">{error}</div>}

                <form onSubmit={handleRegistro} className="login-form registration-form">
                  <div className="registration-grid">
                    <div className="form-group">
                      <label htmlFor="registro-nombres">Nombres</label>
                      <input
                        id="registro-nombres"
                        value={registro.nombres}
                        onChange={(e) => setRegistro((actual) => ({ ...actual, nombres: e.target.value }))}
                        autoComplete="given-name"
                        disabled={cargando}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="registro-apellidos">Apellidos</label>
                      <input
                        id="registro-apellidos"
                        value={registro.apellidos}
                        onChange={(e) => setRegistro((actual) => ({ ...actual, apellidos: e.target.value }))}
                        autoComplete="family-name"
                        disabled={cargando}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="registro-correo">Correo electrónico</label>
                    <input
                      id="registro-correo"
                      type="email"
                      value={registro.correo}
                      onChange={(e) => setRegistro((actual) => ({ ...actual, correo: e.target.value }))}
                      autoComplete="email"
                      disabled={cargando}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="registro-password">Contraseña segura</label>
                    <div className="input-container">
                      <input
                        id="registro-password"
                        type={mostrarRegistroPassword ? "text" : "password"}
                        value={registro.password}
                        onChange={(e) => setRegistro((actual) => ({ ...actual, password: e.target.value }))}
                        autoComplete="new-password"
                        disabled={cargando}
                        required
                      />
                      <button
                        type="button"
                        className="show-password-button"
                        onClick={() => setMostrarRegistroPassword((actual) => !actual)}
                      >
                        {mostrarRegistroPassword ? "Ocultar" : "Ver"}
                      </button>
                    </div>
                    {renderCriterios(criteriosRegistro)}
                  </div>

                  <div className="form-group">
                    <label htmlFor="registro-confirmar">Confirmar contraseña</label>
                    <input
                      id="registro-confirmar"
                      type="password"
                      value={registro.confirmar}
                      onChange={(e) => setRegistro((actual) => ({ ...actual, confirmar: e.target.value }))}
                      autoComplete="new-password"
                      disabled={cargando}
                      required
                    />
                  </div>

                  <button type="submit" className="login-button" disabled={cargando}>
                    {cargando ? <><span className="loading-spinner" />Creando...</> : "CREAR USUARIO"}
                  </button>
                </form>

                <button type="button" className="login-back-button" onClick={() => cambiarModo("login")}>
                  Volver a iniciar sesión
                </button>
              </>
            )}

            {modo === "cambiar-clave" && (
              <>
                <div className="login-heading">
                  <h1>Cambiar contraseña</h1>
                  <p>Su cuenta fue creada por un supervisor. Debe establecer una contraseña segura para continuar.</p>
                </div>

                {error && <div className="login-error" role="alert">{error}</div>}
                {mensaje && <div className="login-info" role="status">{mensaje}</div>}

                <form onSubmit={handleCambioClave} className="login-form">
                  <div className="form-group">
                    <label htmlFor="nueva-clave">Nueva contraseña</label>
                    <div className="input-container">
                      <input
                        id="nueva-clave"
                        type={mostrarNuevaClave ? "text" : "password"}
                        value={nuevaClave}
                        onChange={(e) => setNuevaClave(e.target.value)}
                        autoComplete="new-password"
                        disabled={cargando}
                        required
                      />
                      <button
                        type="button"
                        className="show-password-button"
                        onClick={() => setMostrarNuevaClave((actual) => !actual)}
                      >
                        {mostrarNuevaClave ? "Ocultar" : "Ver"}
                      </button>
                    </div>
                    {renderCriterios(criteriosNuevaClave)}
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmar-nueva-clave">Confirmar nueva contraseña</label>
                    <input
                      id="confirmar-nueva-clave"
                      type="password"
                      value={confirmarNuevaClave}
                      onChange={(e) => setConfirmarNuevaClave(e.target.value)}
                      autoComplete="new-password"
                      disabled={cargando}
                      required
                    />
                  </div>

                  <button type="submit" className="login-button" disabled={cargando}>
                    {cargando ? <><span className="loading-spinner" />Actualizando...</> : "GUARDAR CONTRASEÑA"}
                  </button>
                </form>
              </>
            )}
          </div>
        </section>
      </main>

      <footer className="login-footer">
        <div className="footer-container">
          <p>© 2026 Maquila System EC</p>
          <p>Sistema de gestión y seguimiento de producción</p>
        </div>
      </footer>
    </div>
  );
}

export default Login;
