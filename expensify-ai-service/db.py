import os
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv

load_dotenv()

_raw_url = os.environ["DATABASE_URL"]
# Strip Prisma-specific pgbouncer param
_db_url = _raw_url.split("?")[0]
# Use psycopg3 driver (package: psycopg[binary])
_db_url = _db_url.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(_db_url, poolclass=NullPool)
