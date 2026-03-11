import { db } from './server/db.js';
import * as fs from 'fs';

async function test() {
  const reads = await db.query.chatReads.findMany();
  const msgs = await db.query.chatMessages.findMany({limit: 50});
  
  fs.writeFileSync('db-dump.json', JSON.stringify({ reads, msgs }, null, 2));
  console.log("Done");
  process.exit(0);
}
test().catch(console.error);
