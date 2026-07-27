import { useEffect, useState } from "react";
import api from "../api/axios";
import "./UsuariosModal.css";


function UsuariosModal({
  abierto,
  onCerrar
}) {


  const [usuarios,setUsuarios] = useState([]);

  const [vista,setVista] = useState("lista");


  const [formulario,setFormulario] = useState({

    nombres:"",
    apellidos:"",
    correo:"",
    id_rol:2

  });


  const [passwordTemporal,setPasswordTemporal] = useState("");

  const [error,setError] = useState("");

  const [cargando,setCargando] = useState(false);



  useEffect(()=>{

    if(abierto){

      cargarUsuarios();

    }

  },[abierto]);





  const cargarUsuarios = async()=>{

    try{

      const respuesta =
        await api.get("/users/");


      setUsuarios(respuesta.data);


    }catch(error){

      console.error(error);

    }

  };





  const cambiarCampo=(e)=>{

    setFormulario({

      ...formulario,

      [e.target.name]:e.target.value

    });

  };





  const crearUsuario=async(e)=>{

    e.preventDefault();

    setError("");



    if(
      !formulario.nombres ||
      !formulario.apellidos ||
      !formulario.correo
    ){

      setError(
        "Complete todos los campos"
      );

      return;

    }



    try{


      setCargando(true);



      const respuesta =
        await api.post(
          "/users/",
          formulario
        );



      /*
        Como el backend genera
        contraseña temporal,
        aquí mostramos la información
        al administrador.
      */


      setPasswordTemporal(
        "Usuario creado. Solicite la contraseña temporal generada en el sistema."
      );


      setFormulario({

        nombres:"",
        apellidos:"",
        correo:"",
        id_rol:2

      });


      cargarUsuarios();


      setVista("resultado");



    }catch(error){


      setError(
        error.response?.data?.detail ||
        "No se pudo crear usuario"
      );


    }finally{

      setCargando(false);

    }


  };




  if(!abierto)
    return null;




  return (

    <div className="usuarios-overlay">


      <div className="usuarios-modal">


        <header>

          <h2>
            Gestión de usuarios
          </h2>


          <button
            onClick={onCerrar}
          >
            ×
          </button>

        </header>




        <div className="usuarios-tabs">


          <button
            onClick={()=>setVista("lista")}
          >
            Usuarios
          </button>


          <button
            onClick={()=>setVista("crear")}
          >
            Crear usuario
          </button>


        </div>





        {error &&

          <div className="usuarios-error">

            {error}

          </div>

        }





        {vista==="lista" && (

          <div className="usuarios-lista">


            {
              usuarios.length===0 ?

              <p>
                No existen usuarios registrados.
              </p>

              :

              usuarios.map(usuario=>(

                <div
                  className="usuario-item"
                  key={usuario.id_usuario}
                >

                  <strong>
                    {usuario.nombres}
                    {" "}
                    {usuario.apellidos}
                  </strong>


                  <span>
                    {usuario.correo}
                  </span>


                  <small>
                    Rol:
                    {
                      usuario.id_rol
                    }
                  </small>


                </div>


              ))

            }


          </div>

        )}






        {vista==="crear" && (


          <form
            onSubmit={crearUsuario}
          >


            <label>

              Nombres

              <input

                name="nombres"

                value={formulario.nombres}

                onChange={cambiarCampo}

              />

            </label>



            <label>

              Apellidos

              <input

                name="apellidos"

                value={formulario.apellidos}

                onChange={cambiarCampo}

              />

            </label>




            <label>

              Correo

              <input

                name="correo"

                type="email"

                value={formulario.correo}

                onChange={cambiarCampo}

              />

            </label>




            <label>

              Rol

              <select

                name="id_rol"

                value={formulario.id_rol}

                onChange={cambiarCampo}

              >

                <option value={2}>
                  Usuario (solo lectura)
                </option>


                <option value={1}>
                  Administrador
                </option>


              </select>


            </label>




            <button
              disabled={cargando}
            >

              {
                cargando
                ?
                "Creando..."
                :
                "Crear usuario"
              }

            </button>



          </form>


        )}







        {vista==="resultado" && (

          <div className="usuario-creado">


            <h3>
              Usuario creado correctamente
            </h3>


            <p>
              {passwordTemporal}
            </p>



            <button

              onClick={()=>{
                setVista("lista")
                setPasswordTemporal("")
              }}

            >

              Aceptar

            </button>


          </div>

        )}



      </div>


    </div>

  );


}


export default UsuariosModal;