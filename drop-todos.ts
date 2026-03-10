import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function main() {
    await db.execute(sql`DROP TABLE todos CASCADE`);
    console.log('Dropped todos table');
    process.exit(0);
}

main().catch(console.error);
