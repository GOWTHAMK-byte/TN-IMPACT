import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function clearDb() {
    console.log("Clearing database...");

    try {
        // TRUNCATE cascade will delete all rows in all tables that have foreign keys pointing to them
        // This effectively wipes the whole database clean while keeping the schema.
        await db.execute(sql`TRUNCATE TABLE users CASCADE;`);
        console.log("Database cleared successfully!");
    } catch (err) {
        console.error("Error clearing database:", err);
    }

    process.exit(0);
}

clearDb();
