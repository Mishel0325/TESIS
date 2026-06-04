from passlib.context import CryptContext
from app.database import SessionLocal
from app.models.user_model import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def is_hashed_password(password: str) -> bool:
    if not password:
        return False
    return pwd_context.identify(password) is not None


def migrate_passwords():
    with SessionLocal() as db:
        users = db.query(User).all()
        migrated = 0
        for user in users:
            if user.password is None:
                continue
            if is_hashed_password(user.password):
                continue
            print(f"Migrando usuario {user.id_usuario} ({user.correo})")
            user.password = pwd_context.hash(user.password)
            migrated += 1

        if migrated > 0:
            db.commit()

    print(f"Migración completada: {migrated} usuario(s) actualizados.")


if __name__ == "__main__":
    migrate_passwords()
