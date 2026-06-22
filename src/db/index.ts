import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

// Function to create a new connection pool.
export const createPool = () => {
  return new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    connectionTimeoutMillis: 15000,
  });
};

// Create a pool instance. Let's lazily initialize or provide fallback to prevent module loading problems
let poolInstance: Pool | null = null;
export const getPool = () => {
  if (!poolInstance) {
    poolInstance = createPool();
    poolInstance.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return poolInstance;
};

// Initialize Drizzle dynamically to prevent issues before connection is ready
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
export const getDb = () => {
  if (!dbInstance) {
    const pool = getPool();
    dbInstance = drizzle(pool, { schema });
  }
  return dbInstance;
};
