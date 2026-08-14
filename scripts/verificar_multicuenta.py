"""Verificación rápida del aislamiento por cuenta después de la migración."""

from sqlalchemy import inspect, text
from app.database import engine


def quote(nombre: str) -> str:
    return engine.dialect.identifier_preparer.quote_identifier(nombre)


def main():
    insp = inspect(engine)
    tablas = insp.get_table_names()

    with engine.connect() as conn:
        print("\nCUENTAS")
        if "cuentas" in tablas:
            filas = conn.execute(
                text("SELECT id_cuenta, codigo, nombre FROM cuentas ORDER BY id_cuenta")
            ).mappings().all()
            for fila in filas:
                print(f"  #{fila['id_cuenta']}  {fila['codigo']}  {fila['nombre']}")
        else:
            print("  ERROR: la tabla cuentas no existe.")
            return

        print("\nUSUARIOS")
        if "usuarios" in tablas:
            filas = conn.execute(
                text(
                    "SELECT id_usuario, correo, id_rol, id_cuenta "
                    "FROM usuarios ORDER BY id_usuario"
                )
            ).mappings().all()
            for fila in filas:
                print(
                    f"  usuario #{fila['id_usuario']}  {fila['correo']}  "
                    f"rol={fila['id_rol']}  cuenta={fila['id_cuenta']}"
                )

        print("\nREGISTROS POR CUENTA")
        for tabla in sorted(tablas):
            columnas = {c["name"] for c in insp.get_columns(tabla)}
            if "id_cuenta" not in columnas or tabla == "usuarios":
                continue
            filas = conn.execute(
                text(
                    f"SELECT id_cuenta, COUNT(*) AS total FROM {quote(tabla)} "
                    "GROUP BY id_cuenta ORDER BY id_cuenta"
                )
            ).mappings().all()
            resumen = ", ".join(
                f"cuenta {fila['id_cuenta']}: {fila['total']}" for fila in filas
            ) or "sin registros"
            print(f"  {tabla}: {resumen}")

    print("\nSi la cuenta nueva aparece con 0 registros de negocio, el aislamiento quedó correcto.")


if __name__ == "__main__":
    main()
