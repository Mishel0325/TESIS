"""Migración única: convierte una base existente de Maquila System a multicuenta.

Uso recomendado para el caso actual:

    python scripts/migrar_multicuenta.py --aislar-correo correo_del_nuevo_supervisor@dominio.com

- Los datos históricos quedan en una cuenta histórica.
- El Supervisor indicado recibe una cuenta NUEVA y vacía.
- No se borra ningún pedido, insumo, maquila, informe, etc.
- Los próximos registros creados desde Login ya crearán su cuenta automáticamente.

Si se ejecuta sin --aislar-correo, el script mostrará los Supervisores y pedirá
el correo que debe quedar en una cuenta nueva y vacía.
"""

from __future__ import annotations

import argparse
import importlib
from uuid import uuid4

from sqlalchemy import inspect, text
from sqlalchemy.orm import sessionmaker

from app.database import Base, engine
from app.models.cuenta_model import Cuenta


ROUTERS_PARA_CARGAR_MODELOS = [
    "app.routes.auth_routes",
    "app.routes.user_routes",
    "app.routes.maquila_routes",
    "app.routes.pedido_routes",
    "app.routes.seguimiento_routes",
    "app.routes.role_routes",
    "app.routes.permiso_routes",
    "app.routes.rol_permiso_routes",
    "app.routes.insumo_routes",
    "app.routes.movimiento_routes",
    "app.routes.asignacion_routes",
    "app.routes.archivo_routes",
    "app.routes.control_calidad_routes",
    "app.routes.envio_insumo_routes",
    "app.routes.prenda_routes",
    "app.routes.fase_routes",
    "app.routes.tarea_routes",
    "app.routes.historial_routes",
    "app.routes.informe_routes",
]

TABLAS_COMPARTIDAS = {
    "cuentas",
    "roles",
    "rol",
    "permisos",
    "permiso",
    "rol_permiso",
    "rol_permisos",
    "roles_permisos",
}


def cargar_modelos():
    # Cuenta debe estar cargada antes que User por la FK/relationship.
    importlib.import_module("app.models.cuenta_model")
    for modulo in ROUTERS_PARA_CARGAR_MODELOS:
        importlib.import_module(modulo)

    from app.core.tenant import preparar_modelos_multicuenta

    return preparar_modelos_multicuenta()


def nombre_tabla(modelo) -> str:
    return modelo.__table__.name


def quote(nombre: str) -> str:
    return engine.dialect.identifier_preparer.quote_identifier(nombre)


def agregar_columna_id_cuenta(tabla: str) -> bool:
    insp = inspect(engine)
    columnas = {col["name"] for col in insp.get_columns(tabla)}
    if "id_cuenta" in columnas:
        return False

    with engine.begin() as conn:
        conn.execute(
            text(
                f"ALTER TABLE {quote(tabla)} "
                "ADD COLUMN id_cuenta INTEGER NULL"
            )
        )
    return True


def crear_indice_si_falta(tabla: str) -> None:
    try:
        insp = inspect(engine)
        indices = insp.get_indexes(tabla)
        if any("id_cuenta" in (idx.get("column_names") or []) for idx in indices):
            return
        nombre_idx = f"ix_{tabla}_id_cuenta"
        with engine.begin() as conn:
            conn.execute(
                text(
                    f"CREATE INDEX {quote(nombre_idx)} "
                    f"ON {quote(tabla)} (id_cuenta)"
                )
            )
    except Exception as exc:
        # El índice mejora rendimiento, pero no es requisito para no perder la migración.
        print(f"  Aviso: no se creó índice para {tabla}: {exc}")


def cuenta_por_codigo(session, codigo: str):
    return session.query(Cuenta).filter(Cuenta.codigo == codigo).first()


def crear_cuenta(session, nombre: str, codigo: str | None = None) -> Cuenta:
    cuenta = Cuenta(
        codigo=codigo or f"ACC-{uuid4().hex[:16].upper()}",
        nombre=nombre[:150],
    )
    session.add(cuenta)
    session.flush()
    return cuenta


def mostrar_supervisores(session, User):
    supervisores = (
        session.query(User)
        .execution_options(ignorar_cuenta=True)
        .filter(User.id_rol == 1)
        .order_by(User.id_usuario.asc())
        .all()
    )
    print("\nSUPERVISORES ENCONTRADOS")
    if not supervisores:
        print("  (ninguno)")
    for u in supervisores:
        print(
            f"  ID {u.id_usuario}: {u.nombres} {u.apellidos} "
            f"<{u.correo}>  id_cuenta={getattr(u, 'id_cuenta', None)}"
        )
    return supervisores


def migrar(correo_aislar: str | None):
    modelos = cargar_modelos()

    # Crea solo la nueva tabla; create_all NO modifica tablas ya existentes.
    Cuenta.__table__.create(bind=engine, checkfirst=True)

    inspector = inspect(engine)
    tablas_bd = set(inspector.get_table_names())

    tablas_tenant = []
    for modelo in modelos:
        tabla = nombre_tabla(modelo)
        if tabla.lower() in TABLAS_COMPARTIDAS or tabla not in tablas_bd:
            continue
        tablas_tenant.append(tabla)

    tablas_tenant = sorted(set(tablas_tenant))

    print("\n1) Preparando columnas id_cuenta...")
    for tabla in tablas_tenant:
        creada = agregar_columna_id_cuenta(tabla)
        print(f"  {tabla}: {'columna agregada' if creada else 'ya existía'}")
        crear_indice_si_falta(tabla)

    # Volvemos a inspeccionar después de los ALTER TABLE.
    SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    session = SessionLocal()

    try:
        from app.models.user_model import User

        legacy = cuenta_por_codigo(session, "LEGACY-HISTORICO")
        if legacy is None:
            legacy = crear_cuenta(
                session,
                "Cuenta histórica (datos existentes antes de multicuenta)",
                codigo="LEGACY-HISTORICO",
            )

        supervisores = mostrar_supervisores(session, User)

        if correo_aislar is None:
            print(
                "\nEscriba el correo del Supervisor NUEVO que debe abrir el sistema "
                "completamente en blanco."
            )
            print("Si no desea aislar ninguno ahora, presione Enter.")
            correo_aislar = input("Correo a aislar: ").strip().lower() or None
        else:
            correo_aislar = correo_aislar.strip().lower()

        target = None
        if correo_aislar:
            target = (
                session.query(User)
                .execution_options(ignorar_cuenta=True)
                .filter(User.correo.ilike(correo_aislar))
                .first()
            )
            if target is None:
                raise RuntimeError(
                    f"No existe un usuario con el correo {correo_aislar!r}. "
                    "No se realizó la asignación final."
                )
            if target.id_rol != 1:
                raise RuntimeError(
                    "El usuario elegido no es Supervisor (id_rol=1). "
                    "Seleccione la cuenta creada desde el Login."
                )

        print("\n2) Conservando todos los datos anteriores en la cuenta histórica...")
        for tabla in tablas_tenant:
            if tabla == "usuarios":
                continue
            with engine.begin() as conn:
                resultado = conn.execute(
                    text(
                        f"UPDATE {quote(tabla)} SET id_cuenta = :legacy "
                        "WHERE id_cuenta IS NULL"
                    ),
                    {"legacy": legacy.id_cuenta},
                )
            print(f"  {tabla}: {resultado.rowcount} registro(s) asignado(s)")

        print("\n3) Asignando usuarios...")
        usuarios_sin_cuenta = (
            session.query(User)
            .execution_options(ignorar_cuenta=True)
            .filter(User.id_cuenta.is_(None))
            .order_by(User.id_usuario.asc())
            .all()
        )

        for usuario in usuarios_sin_cuenta:
            if target is not None and usuario.id_usuario == target.id_usuario:
                cuenta_nueva = crear_cuenta(
                    session,
                    f"Espacio de {usuario.nombres} {usuario.apellidos}",
                )
                usuario.id_cuenta = cuenta_nueva.id_cuenta
                print(
                    f"  {usuario.correo}: NUEVA cuenta #{cuenta_nueva.id_cuenta} "
                    "(inicia sin datos)"
                )
            else:
                usuario.id_cuenta = legacy.id_cuenta
                print(f"  {usuario.correo}: cuenta histórica #{legacy.id_cuenta}")

        session.commit()

        print("\nMIGRACIÓN TERMINADA")
        print(f"Cuenta histórica: #{legacy.id_cuenta}")
        if target is not None:
            session.refresh(target)
            print(
                f"Supervisor aislado: {target.correo} -> cuenta #{target.id_cuenta}. "
                "Su panel quedará en cero."
            )
        print(
            "\nAhora reemplace main.py/auth_routes.py/user_routes.py, reinicie FastAPI "
            "y vuelva a iniciar sesión."
        )

    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--aislar-correo",
        default=None,
        help=(
            "Correo del Supervisor recién creado desde Login que debe recibir "
            "un espacio completamente vacío."
        ),
    )
    args = parser.parse_args()
    migrar(args.aislar_correo)


if __name__ == "__main__":
    main()
