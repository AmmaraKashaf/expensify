import os
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv

load_dotenv()

_raw_url = os.environ["DATABASE_URL"]
# Strip Prisma-specific pgbouncer param — psycopg2 doesn't understand it
_db_url = _raw_url.split("?")[0]

# NullPool disables SQLAlchemy's own connection pool, which is required when
# connecting via a pgbouncer transaction-mode pooler (Supabase port 6543).
engine = create_engine(_db_url, poolclass=NullPool)
