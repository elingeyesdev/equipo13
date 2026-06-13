from contextlib import contextmanager
import psycopg
from psycopg.rows import dict_row
from .config import settings


@contextmanager
def get_conn():
    conn = psycopg.connect(settings.DATABASE_URL, row_factory=dict_row)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def fetch_all(sql: str, params: tuple = ()) -> list[dict]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall()
