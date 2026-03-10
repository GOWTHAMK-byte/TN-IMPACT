import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";
import * as dotenv from 'dotenv';
import { sql } from 'drizzle-orm';
dotenv.config();

async function main() {
    if (!process.env.DATABASE_URL) throw new Error("No database URl");
    const sqlClient = neon(process.env.DATABASE_URL);
    const db = drizzle(sqlClient);
    await db.execute(sql`ALTER TABLE todos DROP COLUMN due_date`);
    console.log("Dropped due_date");
    process.exit(0);
}

main().catch(console.error);
