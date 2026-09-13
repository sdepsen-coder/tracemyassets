from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
import sqlite3

from sqlalchemy import inspect

from app.db.session import engine
from app.models.asset import Asset


def main() -> None:
    if engine.dialect.name != "sqlite":
        raise RuntimeError("This script supports local SQLite databases only.")

    database_name = engine.url.database
    if not database_name or database_name == ":memory:":
        raise RuntimeError("A file-based SQLite database is required.")

    database_path = Path(database_name).resolve()
    if not database_path.is_file():
        raise RuntimeError(
            "Database file not found. Run this script from the backend folder."
        )

    expected_columns = set(Asset.__table__.columns.keys())

    # Inspect before making any changes.
    with engine.connect() as connection:
        inspector = inspect(connection)
        tables = inspector.get_table_names()

        if "assets" not in tables or "users" not in tables:
            raise RuntimeError("Expected assets and users tables were not found.")

        current_columns = {
            column["name"]
            for column in inspector.get_columns("assets")
        }

        if current_columns == expected_columns:
            print("Assets columns already match the model. No changes made.")
            return

        if not {"id", "tag", "name", "status"}.issubset(current_columns):
            raise RuntimeError(
                "Unrecognized assets schema. No automatic migration attempted."
            )

        # Do not orphan match records or other dependent data.
        quote = connection.dialect.identifier_preparer.quote

        for table in tables:
            for foreign_key in inspector.get_foreign_keys(table):
                if foreign_key.get("referred_table") == "assets":
                    row_count = connection.exec_driver_sql(
                        f"SELECT COUNT(*) FROM {quote(table)}"
                    ).scalar_one()

                    if row_count:
                        raise RuntimeError(
                            f"STOP: {table} contains {row_count} rows and "
                            "references assets. A data-specific migration "
                            "is required. Nothing has been changed."
                        )

        # Custom database objects need individual review.
        triggers = connection.exec_driver_sql(
            "SELECT name FROM sqlite_master "
            "WHERE type = 'trigger' AND tbl_name = 'assets'"
        ).all()

        if triggers:
            raise RuntimeError(
                "Assets has custom triggers. Review is required before migration."
            )

        for view in inspector.get_view_names():
            definition = inspector.get_view_definition(view) or ""
            if "assets" in definition.lower():
                raise RuntimeError(
                    f"View {view} may depend on assets. Review is required."
                )

    # SQLite backup API also handles committed data stored in a WAL file.
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")
    backup_directory = Path(__file__).resolve().parent / "backups"
    backup_directory.mkdir(parents=True, exist_ok=True)
    backup_path = backup_directory / f"before_assets_{timestamp}.sqlite3"

    source_uri = database_path.as_uri() + "?mode=ro"

    with closing(
        sqlite3.connect(source_uri, uri=True)
    ) as source:
        with closing(sqlite3.connect(str(backup_path))) as destination:
            source.backup(destination)

    print(f"Full database backup: {backup_path}")

    archive_table = f"assets_legacy_{timestamp}"

    with engine.connect() as connection:
        connection.exec_driver_sql("PRAGMA foreign_keys = ON")
        connection.commit()

        try:
            # Explicit BEGIN makes the DDL transactional on SQLite.
            connection.exec_driver_sql("BEGIN IMMEDIATE")

            quote = connection.dialect.identifier_preparer.quote
            archive_name = quote(archive_table)

            # Repeat the dependency check under the write lock.
            inspector = inspect(connection)
            for table in inspector.get_table_names():
                for foreign_key in inspector.get_foreign_keys(table):
                    if foreign_key.get("referred_table") == "assets":
                        count = connection.exec_driver_sql(
                            f"SELECT COUNT(*) FROM {quote(table)}"
                        ).scalar_one()
                        if count:
                            raise RuntimeError(
                                "Dependent records exist. Migration cancelled."
                            )

            original_count = connection.exec_driver_sql(
                "SELECT COUNT(*) FROM assets"
            ).scalar_one()

            # Archive the values without renaming assets.
            # Renaming could redirect foreign keys to the legacy table.
            connection.exec_driver_sql(
                f"CREATE TABLE {archive_name} AS SELECT * FROM assets"
            )

            archived_count = connection.exec_driver_sql(
                f"SELECT COUNT(*) FROM {archive_name}"
            ).scalar_one()

            if original_count != archived_count:
                raise RuntimeError("Archive row count verification failed.")

            connection.exec_driver_sql("DROP TABLE assets")
            Asset.__table__.create(bind=connection)

            actual_columns = {
                column["name"]
                for column in inspect(connection).get_columns("assets")
            }

            if actual_columns != expected_columns:
                raise RuntimeError("New assets schema verification failed.")

            violations = connection.exec_driver_sql(
                "PRAGMA foreign_key_check"
            ).all()

            if violations:
                raise RuntimeError(
                    "Foreign key verification failed. Migration rolled back."
                )

            connection.commit()

        except Exception:
            connection.rollback()
            raise

    print(f"Archived rows: {original_count}")
    print(f"Archive table: {archive_table}")
    print("New assets table created successfully.")
    print("Users were not modified. New assets table is empty.")


if __name__ == "__main__":
    try:
        main()
    finally:
        engine.dispose()