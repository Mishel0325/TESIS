import { useEffect, useState } from "react";
import api from "../api/axios";
import "./EditarPedido.css";


function EditarPedido({
    abierto,
    onCerrar
}) {


    const [pedidos, setPedidos] = useState([]);

    const [codigo, setCodigo] = useState("");

    const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);



    // ============================
    // CARGAR ÚLTIMOS 3 PEDIDOS
    // ============================

    const cargarRecientes = async () => {

        try {

            const respuesta = await api.get(
                "/pedidos/recientes"
            );


            setPedidos(
                respuesta.data
            );


        } catch(error) {

            console.error(
                "Error cargando pedidos:",
                error
            );

        }

    };



    // ============================
    // CARGAR AL ABRIR MODAL
    // ============================

    useEffect(() => {

        if(abierto){

            cargarRecientes();

            setPedidoSeleccionado(null);

            setCodigo("");

        }

    }, [abierto]);



    // ============================
    // BUSCAR POR CÓDIGO
    // ============================

    const buscarPedido = async()=>{


        if(!codigo.trim()){

            cargarRecientes();

            return;

        }


        try{


            const respuesta = await api.get(

                `/pedidos/buscar?codigo=${codigo}`

            );


            setPedidos(
                respuesta.data
            );


        }catch(error){

            console.error(
                error
            );

        }

    };



    if(!abierto){

        return null;

    }



    return (

        <div className="modal-overlay">


            <div className="modal-editar-pedido">


                <div className="modal-header">


                    <h2>
                        Editar pedido existente
                    </h2>


                    <button

                        className="btn-cerrar"

                        onClick={onCerrar}

                    >

                        ✕

                    </button>


                </div>




                <div className="busqueda">


                    <input

                        type="text"

                        placeholder="Buscar código del pedido"

                        value={codigo}

                        onChange={
                            (e)=>
                            setCodigo(
                                e.target.value
                            )
                        }

                    />



                    <button
                        onClick={buscarPedido}
                    >

                        Buscar

                    </button>



                    <button
                        onClick={cargarRecientes}
                    >

                        Últimos 3

                    </button>


                </div>





                <div className="lista-pedidos">


                {
                    pedidos.map((pedido)=>(


                        <div

                        className="card-pedido"

                        key={
                            pedido.id_pedido
                        }

                        >


                            <h3>

                                {
                                pedido.codigo_pedido
                                }

                            </h3>



                            <p>

                                Prenda:
                                {" "}
                                {
                                pedido.tipo_prenda
                                }

                            </p>



                            <p>

                                Cantidad:
                                {" "}
                                {
                                pedido.cantidad
                                }

                            </p>



                            <p>

                                Estado:
                                {" "}
                                {
                                pedido.estado
                                }

                            </p>



                            <button

                            onClick={()=>
                                setPedidoSeleccionado(
                                    pedido
                                )
                            }

                            >

                                Seleccionar

                            </button>



                        </div>


                    ))

                }


                </div>





                {
                    pedidoSeleccionado && (

                        <FormularioEditar

                            pedido={
                                pedidoSeleccionado
                            }

                            cerrar={
                                onCerrar
                            }

                        />

                    )
                }



            </div>


        </div>

    );

}





function FormularioEditar({
    pedido,
    cerrar
}) {


    const [datos,setDatos] = useState({

        codigo_pedido:
            pedido.codigo_pedido,


        tipo_prenda:
            pedido.tipo_prenda || "",


        talla:
            pedido.talla || "",


        color:
            pedido.color || "",


        cantidad:
            pedido.cantidad,


        estado:
            pedido.estado,


        observaciones:
            pedido.observaciones || ""

    });





    const cambiar = (e)=>{


        setDatos({

            ...datos,

            [e.target.name]:
            e.target.value

        });


    };






    const guardar = async()=>{


        try{


            await api.put(

                `/pedidos/${pedido.id_pedido}`,

                datos

            );



            alert(
                "Pedido actualizado correctamente"
            );



            cerrar();



        }catch(error){


            console.error(
                error
            );


            alert(
                "Error al actualizar pedido"
            );


        }


    };




    return (

        <div className="formulario-editar">


            <h3>

                Editando:
                {" "}
                {pedido.codigo_pedido}

            </h3>




            <input

                name="codigo_pedido"

                value={
                    datos.codigo_pedido
                }

                onChange={cambiar}

            />



            <input

                name="tipo_prenda"

                value={
                    datos.tipo_prenda
                }

                onChange={cambiar}

                placeholder="Tipo de prenda"

            />



            <input

                name="talla"

                value={
                    datos.talla
                }

                onChange={cambiar}

                placeholder="Talla"

            />



            <input

                name="color"

                value={
                    datos.color
                }

                onChange={cambiar}

                placeholder="Color"

            />



            <input

                type="number"

                name="cantidad"

                value={
                    datos.cantidad
                }

                onChange={cambiar}

            />



            <select

                name="estado"

                value={
                    datos.estado
                }

                onChange={cambiar}

            >

                <option>
                    Pendiente
                </option>


                <option>
                    En Produccion
                </option>


                <option>
                    Finalizado
                </option>


                <option>
                    Entregado
                </option>


            </select>




            <textarea

                name="observaciones"

                value={
                    datos.observaciones
                }

                onChange={cambiar}

                placeholder="Observaciones"

            />




            <button

                onClick={guardar}

            >

                Guardar cambios

            </button>


        </div>

    );

}



export default EditarPedido;