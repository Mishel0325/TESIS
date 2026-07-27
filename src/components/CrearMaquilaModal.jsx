import { useState } from "react";
import api from "../api/axios";
import "./CrearMaquilaModal.css";


function CrearMaquilaModal({
  abierto,
  onCerrar,
  onMaquilaCreada
}) {


  const [formulario, setFormulario] = useState({

    nombre:"",
    direccion:"",
    estado:"Activo"

  });


  const [error,setError] = useState("");

  const [guardando,setGuardando] = useState(false);



  if(!abierto) return null;



  const cambiarCampo = (e)=>{

    const {name,value}=e.target;


    setFormulario({

      ...formulario,

      [name]:value

    });

  };




  const guardarMaquila = async(e)=>{

    e.preventDefault();

    setError("");



    if(!formulario.nombre.trim()){

      setError(
        "El nombre de la maquila es obligatorio"
      );

      return;

    }



    try{


      setGuardando(true);



      const respuesta = await api.post(
        "/maquilas/",
        formulario
      );



      setFormulario({

        nombre:"",
        direccion:"",
        estado:"Activo"

      });



      if(onMaquilaCreada){

        onMaquilaCreada(respuesta.data);

      }



      onCerrar();



    }catch(error){


      console.error(
        "Error creando maquila:",
        error
      );


      setError(
        error.response?.data?.detail ||
        "No se pudo crear la maquila"
      );


    }finally{

      setGuardando(false);

    }


  };




  return (

    <div className="maquila-overlay">


      <div className="maquila-modal">


        <header>

          <h2>
            Crear nueva maquila
          </h2>


          <button
            type="button"
            onClick={onCerrar}
          >
            ×
          </button>

        </header>




        {error && (

          <div className="maquila-error">

            {error}

          </div>

        )}




        <form onSubmit={guardarMaquila}>


          <label>

            Nombre de maquila

            <input

              name="nombre"

              value={formulario.nombre}

              onChange={cambiarCampo}

              placeholder="Ejemplo: Taller López"

            />

          </label>



          <label>

            Dirección

            <input

              name="direccion"

              value={formulario.direccion}

              onChange={cambiarCampo}

              placeholder="Dirección"

            />

          </label>




          <label>

            Estado

            <select

              name="estado"

              value={formulario.estado}

              onChange={cambiarCampo}

            >

              <option value="Activo">
                Activo
              </option>

              <option value="Inactivo">
                Inactivo
              </option>


            </select>


          </label>




          <div className="maquila-actions">


            <button

              type="button"

              onClick={onCerrar}

            >

              Cancelar

            </button>



            <button

              type="submit"

              disabled={guardando}

            >

              {
                guardando
                ? "Guardando..."
                : "Crear maquila"
              }

            </button>



          </div>


        </form>



      </div>


    </div>

  );


}


export default CrearMaquilaModal;