import { useState } from "react";
import api from "../api/axios";
import logoMaquila from "../assets/logo-maquila.png";
import "./Login.css";

function Login({ setToken, setUsuario }) {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const obtenerMensajeError = (err) => {
    const detalle = err.response?.data?.detail;

    if (typeof detalle === "string") {
      return detalle;
    }

    if (Array.isArray(detalle)) {
      return detalle
        .map((item) => item?.msg)
        .filter(Boolean)
        .join(", ");
    }

    if (err.code === "ERR_NETWORK") {
      return "No se pudo conectar con el servidor. Verifique que FastAPI esté ejecutándose.";
    }

    return "No se pudo iniciar sesión. Verifique sus credenciales.";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const correoLimpio = correo.trim().toLowerCase();

    if (!correoLimpio) {
      setError("Ingrese su correo electrónico.");
      return;
    }

    if (!password.trim()) {
      setError("Ingrese su contraseña.");
      return;
    }

    try {
      setCargando(true);

      /*
       * OAuth2PasswordRequestForm espera los campos:
       * username y password.
       *
       * En tu backend, username representa el correo.
       */
      const datosLogin = new URLSearchParams();
      datosLogin.append("username", correoLimpio);
      datosLogin.append("password", password);

      const response = await api.post("/auth/login", datosLogin, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const accessToken = response.data?.access_token;
      const usuarioAutenticado = response.data?.usuario;

      if (!accessToken) {
        throw new Error("El servidor no devolvió el token de acceso.");
      }

      if (!usuarioAutenticado) {
        throw new Error(
          "El servidor no devolvió la información del usuario."
        );
      }

      /*
       * Guardamos la información para conservar la sesión
       * aunque se actualice el navegador.
       */
      localStorage.setItem("token", accessToken);
      localStorage.setItem(
        "usuario",
        JSON.stringify(usuarioAutenticado)
      );

      /*
       * Actualizamos el estado principal de App.jsx.
       */
      if (typeof setUsuario === "function") {
        setUsuario(usuarioAutenticado);
      }

      if (typeof setToken === "function") {
        setToken(accessToken);
      }
    } catch (err) {
      console.error("Error al iniciar sesión:", err);

      if (
        err.message ===
        "El servidor no devolvió la información del usuario."
      ) {
        setError(
          "El inicio de sesión fue correcto, pero el backend no devolvió los datos del usuario."
        );
      } else {
        setError(obtenerMensajeError(err));
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-page">
      {/* Encabezado superior */}
      <header className="login-header">
        <div className="header-container">
          <div className="header-brand">
            <img
              src={logoMaquila}
              alt="Logo Maquila System EC"
              className="header-logo"
            />

            <div className="header-title">
              <span>Maquila System EC</span>
              <small>Sistema de gestión de maquilas</small>
            </div>
          </div>

          {/* Espacio reservado para información futura */}
          <div className="header-content"></div>
        </div>
      </header>

      {/* Contenido central */}
      <main className="login-main">
        <section className="login-card">
          <div className="card-top-line"></div>

          <div className="login-card-content">
            <div className="login-card-logo-container">
              <img
                src={logoMaquila}
                alt="Maquila System EC"
                className="login-card-logo"
              />
            </div>

            <div className="login-heading">
              <h1>Iniciar sesión</h1>

              <p>
                Ingrese sus credenciales para acceder al sistema
              </p>
            </div>

            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              {/* Correo electrónico */}
              <div className="form-group">
                <label htmlFor="correo">
                  Correo electrónico
                </label>

                <div className="input-container">
                  <span className="input-icon" aria-hidden="true">
                  </span>

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

              {/* Contraseña */}
              <div className="form-group">
                <label htmlFor="password">
                  Contraseña
                </label>

                <div className="input-container">
                  <span className="input-icon" aria-hidden="true">
                  </span>

                  <input
                    id="password"
                    name="password"
                    type={
                      mostrarPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="Ingrese su contraseña"
                    autoComplete="current-password"
                    disabled={cargando}
                    required
                  />

                  <button
                    type="button"
                    className="show-password-button"
                    onClick={() =>
                      setMostrarPassword(
                        (valorActual) => !valorActual
                      )
                    }
                    disabled={cargando}
                    aria-label={
                      mostrarPassword
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                    title={
                      mostrarPassword
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                  >
                    {mostrarPassword ? "Ocultar" : "Ver"}
                  </button>
                </div>
              </div>

              {/* Botón de inicio de sesión */}
              <button
                type="submit"
                className="login-button"
                disabled={cargando}
              >
                {cargando ? (
                  <>
                    <span className="loading-spinner"></span>
                    Ingresando...
                  </>
                ) : (
                  "INICIAR SESIÓN"
                )}
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* Pie de página */}
      <footer className="login-footer">
        <div className="footer-container">
          {/* Espacio reservado para información futura */}
          <div className="footer-empty-space"></div>

          <div className="footer-divider"></div>

          <div className="footer-bottom">
            <p>© 2026 Maquila System EC</p>

            <p>
              Sistema de gestión y seguimiento de producción
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Login;