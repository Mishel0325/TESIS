import { useState } from "react";
import api from "../api/axios";
import "./CambiarPasswordModal.css";


function CambiarPasswordModal({
  abierto,
  usuario,
  onPasswordCambiada
}) {

  const [passwordActual, setPasswordActual] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");

  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);



  if (!abierto) return null;



  const cambiarPassword = async (e) => {

    e.preventDefault();

    setError("");



    if(!passwordActual || !nuevaPassword || !confirmarPassword){

      setError(
        "Todos los campos son obligatorios"
      );

      return;
    }



    if(nuevaPassword !== confirmarPassword){

      setError(
        "Las contraseñas nuevas no coinciden"
      );

      return;
    }



    if(nuevaPassword.length < 6){

      setError(
        "La contraseña debe tener mínimo 6 caracteres"
      );

      return;
    }



    try {

      setGuardando(true);



      await api.put(
        "/users/cambiar-password",
        {
          password_actual: passwordActual,

          nueva_password: nuevaPassword
        }
      );



      onPasswordCambiada();



    } catch(error){

      console.error(
        "Error cambiando contraseña",
        error
      );


      setError(
        error.response?.data?.detail ||
        "No se pudo cambiar la contraseña"
      );


    } finally {

      setGuardando(false);

    }

  };



  return (

    <div className="password-overlay">

      <div className="password-modal">


        <h2>
          Cambio obligatorio de contraseña
        </h2>


        <p>
          Bienvenido {usuario?.nombre}.
          Por seguridad debe cambiar su contraseña temporal antes de continuar.
        </p>



        {error && (

          <div className="password-error">

            {error}

          </div>

        )}



        <form onSubmit={cambiarPassword}>


          <label>
            Contraseña temporal actual

            <input

              type="password"

              value={passwordActual}

              onChange={
                e=>setPasswordActual(e.target.value)
              }

            />

          </label>




          <label>

            Nueva contraseña

            <input

              type="password"

              value={nuevaPassword}

              onChange={
                e=>setNuevaPassword(e.target.value)
              }

            />

          </label>




          <label>

            Confirmar nueva contraseña

            <input

              type="password"

              value={confirmarPassword}

              onChange={
                e=>setConfirmarPassword(e.target.value)
              }

            />

          </label>




          <button
            type="submit"
            disabled={guardando}
          >

            {
              guardando
              ? "Guardando..."
              : "Cambiar contraseña"
            }


          </button>


        </form>


      </div>


    </div>

  );

}


export default CambiarPasswordModal;