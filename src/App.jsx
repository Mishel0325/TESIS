import { useState } from "react";

import Login from "./pages/Login";
import SupervisorDashboard from "./pages/SupervisorDashboard";
import CambiarPasswordModal from "./components/CambiarPasswordModal";



function obtenerUsuarioGuardado() {

  try {

    const usuarioGuardado =
      localStorage.getItem("usuario");


    return usuarioGuardado
      ? JSON.parse(usuarioGuardado)
      : null;


  } catch (error) {

    console.error(
      "No se pudo leer usuario guardado:",
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
    obtenerUsuarioGuardado()
  );



  const [mostrarCambioPassword, setMostrarCambioPassword] =
    useState(
      usuario?.requiere_cambio_password === true
    );





  const cerrarSesion = () => {


    localStorage.removeItem("token");

    localStorage.removeItem("usuario");


    setToken(null);

    setUsuario(null);

    setMostrarCambioPassword(false);


  };







  const actualizarUsuario = (nuevoUsuario) => {


    setUsuario(nuevoUsuario);


    localStorage.setItem(
      "usuario",
      JSON.stringify(nuevoUsuario)
    );


    if(
      nuevoUsuario?.requiere_cambio_password === true
    ){

      setMostrarCambioPassword(true);

    }


  };







  const passwordCambiada = () => {


    const usuarioActualizado = {

      ...usuario,

      requiere_cambio_password:false

    };



    setUsuario(usuarioActualizado);



    localStorage.setItem(
      "usuario",
      JSON.stringify(usuarioActualizado)
    );



    setMostrarCambioPassword(false);


  };







  /*
    Si no existe sesión,
    mostramos Login
  */

  if(!token){


    return (

      <Login

        setToken={setToken}

        setUsuario={actualizarUsuario}

      />

    );


  }








  return (

    <>

      <SupervisorDashboard

        usuario={usuario}

        onLogout={cerrarSesion}

      />



      <CambiarPasswordModal

        abierto={mostrarCambioPassword}

        usuario={usuario}

        onPasswordCambiada={passwordCambiada}

      />


    </>

  );

}



export default App;