import hashlib
import os
from contextlib import contextmanager

import psycopg
from psycopg.rows import dict_row
from fastapi import HTTPException

def digest(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()

@contextmanager
def database(token: str | None = None, authenticated: bool = True):
    url = os.getenv("DATABASE_URL")
    if not url:
        raise HTTPException(503, "setup_required")
    with psycopg.connect(url, connect_timeout=10, row_factory=dict_row) as conn:
        conn.execute("SET LOCAL ROLE cc_runtime")
        conn.execute("SET LOCAL statement_timeout = '12s'")
        actor = None
        if token:
            actor = conn.execute("SELECT cc_private.bind_session(%s) AS actor", (digest(token),)).fetchone()["actor"]
        if authenticated and not actor:
            raise HTTPException(401, "sign_in_required")
        yield conn, actor

def rows(conn, query, params=()):
    return conn.execute(query, params).fetchall()

def one(conn, query, params=()):
    result = conn.execute(query, params).fetchone()
    if result is None:
        raise HTTPException(404, "not_found")
    return result

def role(actor, *allowed):
    if actor["role"] not in allowed:
        raise HTTPException(403, "not_allowed")
