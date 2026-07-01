import { useState } from "react";
import Login from "./pages/Login";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  if (!token) {
    return <Login setToken={setToken} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Maquila System EC</h1>

        <button
          onClick={cerrarSesion}
          className="bg-red-600 px-4 py-2 rounded"
        >
          Cerrar sesión
        </button>
      </header>

      <main className="p-6">
        <h2 className="text-2xl font-bold mb-4">
          Panel principal
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded shadow">
            📦 Prendas
          </div>

          <div className="bg-white p-6 rounded shadow">
            🧵 Fases
          </div>

          <div className="bg-white p-6 rounded shadow">
            ✂️ Tareas
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;