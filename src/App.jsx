import { useState } from "react";

import Login from "./pages/Login";
import SupervisorDashboard from "./pages/SupervisorDashboard";


function obtenerUsuarioGuardado() {
  try {
    const usuarioGuardado = localStorage.getItem("usuario");

    return usuarioGuardado
      ? JSON.parse(usuarioGuardado)
      : null;
  } catch (error) {
    console.error(
      "No se pudo leer el usuario guardado:",
      error
    );

    localStorage.removeItem("usuario");
    return null;
  }
}


function App() {
  const [token, setToken] = useState(
    localStorage.getItem("token")
  );

  const [usuario, setUsuario] = useState(
    obtenerUsuarioGuardado
  );

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");

    setToken(null);
    setUsuario(null);
  };

  if (!token) {
    return (
      <Login
        setToken={setToken}
        setUsuario={setUsuario}
      />
    );
  }

  return (
    <SupervisorDashboard
      usuario={usuario}
      onLogout={cerrarSesion}
    />
  );
}


export default App;