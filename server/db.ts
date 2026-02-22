import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { config } from "./config";

if (!config.databaseUrl) {
    throw new Error(
        "DATABASE_URL is not set. Please set it in your .env file or environment.\n" +
        "Example: DATABASE_URL=postgresql://user:pass@localhost:5432/servicehub"
    );
}

const pool = new pg.Pool({
    connectionString: config.databaseUrl,
});

export const db = drizzle(pool, { schema });

export { pool };
