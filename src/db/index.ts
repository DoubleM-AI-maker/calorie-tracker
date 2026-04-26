import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// This file configures the connection pool for Postgres
// In Edge environments, one might need a connection string check or a library like `postgres`.
// However, since we're using Next.js 15's default Node.js rendering for server components,
// `pg` works perfectly.

const poolUrl = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres";

// We keep a singular pool in global scope to prevent hot-reloading from creating 
// endless database connections in development mode.
const globalForDb = globalThis as unknown as {
  conn: Pool | undefined;
};

const conn = globalForDb.conn ?? new Pool({ connectionString: poolUrl });

if (process.env.NODE_ENV !== "production") {
  globalForDb.conn = conn;
}

export const db = drizzle(conn, { schema });
