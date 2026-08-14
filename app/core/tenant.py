"""Aislamiento multicuenta para Maquila System.

El módulo agrega ``id_cuenta`` a los modelos de negocio ya cargados y aplica
el filtro automáticamente a las consultas ORM. De esta manera no es necesario
reescribir cada GET del proyecto.

IMPORTANTE: la base existente debe migrarse una sola vez con
``scripts/migrar_multicuenta.py`` antes de arrancar este código.
"""

from __future__ import annotations

import base64
import json
from contextvars import ContextVar
from typing import Iterable

from sqlalchemy import Column, ForeignKey, Integer, event, text
from sqlalchemy.orm import Session, with_loader_criteria

from app.database import Base, engine


_id_cuenta_actual: ContextVar[int | None] = ContextVar(
    "maquila_id_cuenta_actual",
    default=None,
)

_MODELOS_MULTI_CUENTA: list[type] = []
_INSTALADO = False

# Tablas realmente globales. Todo el resto de los modelos de app.models se
# considera información perteneciente a una cuenta.
_TABLAS_COMPARTIDAS = {
    "cuentas",
    "roles",
    "rol",
    "permisos",
    "permiso",
    "rol_permiso",
    "rol_permisos",
    "roles_permisos",
}


def id_cuenta_actual() -> int | None:
    return _id_cuenta_actual.get()


def _es_modelo_de_negocio(modelo: type) -> bool:
    tabla = getattr(modelo, "__table__", None)
    modulo = getattr(modelo, "__module__", "")
    if tabla is None or not modulo.startswith("app.models"):
        return False
    return tabla.name.lower() not in _TABLAS_COMPARTIDAS


def preparar_modelos_multicuenta() -> list[type]:
    """Agrega el atributo mapeado id_cuenta a todos los modelos de negocio."""

    global _MODELOS_MULTI_CUENTA

    modelos: list[type] = []
    # Copia para evitar que modificar un mapper cambie el iterable en curso.
    for mapper in list(Base.registry.mappers):
        modelo = mapper.class_
        if not _es_modelo_de_negocio(modelo):
            continue

        if not hasattr(modelo, "id_cuenta"):
            # SQLAlchemy Declarative admite agregar una columna después de haber
            # declarado la clase; queda mapeada en la misma Table/Mapper.
            setattr(
                modelo,
                "id_cuenta",
                Column(
                    Integer,
                    ForeignKey("cuentas.id_cuenta"),
                    nullable=True,
                    index=True,
                ),
            )

        modelos.append(modelo)

    # Sin duplicados y en orden estable por nombre de tabla.
    unicos = {modelo.__table__.name: modelo for modelo in modelos}
    _MODELOS_MULTI_CUENTA = [unicos[n] for n in sorted(unicos)]
    return list(_MODELOS_MULTI_CUENTA)


def modelos_multicuenta() -> list[type]:
    return list(_MODELOS_MULTI_CUENTA or preparar_modelos_multicuenta())


def _aplicar_filtro_select(execute_state) -> None:
    tenant_id = id_cuenta_actual()
    if tenant_id is None:
        return
    if execute_state.execution_options.get("ignorar_cuenta"):
        return
    if not execute_state.is_select:
        return
    if execute_state.is_column_load or execute_state.is_relationship_load:
        return

    statement = execute_state.statement
    for modelo in _MODELOS_MULTI_CUENTA:
        statement = statement.options(
            with_loader_criteria(
                modelo,
                modelo.id_cuenta == tenant_id,
                include_aliases=True,
                propagate_to_loaders=True,
            )
        )
    execute_state.statement = statement


def _proteger_update_delete(execute_state) -> None:
    tenant_id = id_cuenta_actual()
    if tenant_id is None:
        return
    if execute_state.execution_options.get("ignorar_cuenta"):
        return
    if not (execute_state.is_update or execute_state.is_delete):
        return

    mapper = getattr(execute_state, "bind_mapper", None)
    modelo = getattr(mapper, "class_", None) if mapper is not None else None
    if modelo in _MODELOS_MULTI_CUENTA:
        execute_state.statement = execute_state.statement.where(
            modelo.id_cuenta == tenant_id
        )


def _sellar_nuevos_registros(session: Session, _flush_context, _instances) -> None:
    tenant_id = id_cuenta_actual()
    if tenant_id is None:
        return

    modelos = tuple(_MODELOS_MULTI_CUENTA)
    for objeto in session.new:
        if modelos and isinstance(objeto, modelos):
            if getattr(objeto, "id_cuenta", None) is None:
                objeto.id_cuenta = tenant_id


def instalar_multicuenta() -> None:
    """Instala columnas dinámicas + filtros SQLAlchemy una sola vez."""

    global _INSTALADO
    if _INSTALADO:
        return

    preparar_modelos_multicuenta()
    event.listen(Session, "do_orm_execute", _aplicar_filtro_select)
    event.listen(Session, "do_orm_execute", _proteger_update_delete)
    event.listen(Session, "before_flush", _sellar_nuevos_registros)
    _INSTALADO = True


def _decodificar_payload_sin_verificar(token: str) -> dict:
    """Lee únicamente el payload para elegir el tenant.

    La autenticación real continúa a cargo de ``require_role``/security.py,
    que sí valida la firma. Este payload NO concede permisos.
    """

    try:
        partes = token.split(".")
        if len(partes) != 3:
            return {}
        payload = partes[1]
        payload += "=" * (-len(payload) % 4)
        datos = base64.urlsafe_b64decode(payload.encode("ascii"))
        resultado = json.loads(datos.decode("utf-8"))
        return resultado if isinstance(resultado, dict) else {}
    except Exception:
        return {}


def _buscar_cuenta_usuario(id_usuario) -> int | None:
    """Compatibilidad con tokens viejos que todavía no traen id_cuenta."""

    try:
        id_usuario = int(id_usuario)
    except (TypeError, ValueError):
        return None

    try:
        with engine.connect() as conexion:
            valor = conexion.execute(
                text(
                    "SELECT id_cuenta FROM usuarios "
                    "WHERE id_usuario = :id_usuario"
                ),
                {"id_usuario": id_usuario},
            ).scalar_one_or_none()
        return int(valor) if valor is not None else None
    except Exception:
        return None


async def middleware_multicuenta(request, call_next):
    """Obtiene id_cuenta del token y lo mantiene durante la petición."""

    # Login y registro público deben poder localizar correos globalmente.
    if request.url.path in {"/auth/login", "/auth/registro"}:
        token_ctx = _id_cuenta_actual.set(None)
        try:
            return await call_next(request)
        finally:
            _id_cuenta_actual.reset(token_ctx)

    tenant_id = None
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        token = auth.split(" ", 1)[1].strip()
        payload = _decodificar_payload_sin_verificar(token)
        tenant_id = payload.get("id_cuenta")
        if tenant_id is None:
            tenant_id = _buscar_cuenta_usuario(payload.get("id_usuario"))

    try:
        tenant_id = int(tenant_id) if tenant_id is not None else None
    except (TypeError, ValueError):
        tenant_id = None

    token_ctx = _id_cuenta_actual.set(tenant_id)
    try:
        return await call_next(request)
    finally:
        _id_cuenta_actual.reset(token_ctx)
