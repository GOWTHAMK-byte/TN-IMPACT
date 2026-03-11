import { db } from './server/db';
import { users } from './shared/schema';
import { getUsers } from './server/storage';

async function testSearch() {
  console.log("Searching for 'emp'...");
  const results = await getUsers({ search: 'emp' });
  console.log(`Found ${results.length} results`);
  console.log(results.map(u => ({ id: u.id, name: u.name, role: u.role })));
  process.exit(0);
}

testSearch();
