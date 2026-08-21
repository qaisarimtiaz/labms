import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const LOCAL_URI = 'mongodb://localhost:27017/healthinn';
const ATLAS_URI = process.argv[2];

if (!ATLAS_URI) {
  console.error('Usage: npx tsx scripts/migrateToAtlas.ts "mongodb+srv://user:pass@cluster.mongodb.net/healthinn"');
  process.exit(1);
}

const COLLECTIONS = [
  'users',
  'patients',
  'labtests',
  'testtemplates',
  'testorders',
  'testresults',
];

async function migrate() {
  console.log('Connecting to local MongoDB...');
  const local = await mongoose.createConnection(LOCAL_URI).asPromise();
  console.log('Connected to local.\n');

  console.log('Connecting to Atlas...');
  const atlas = await mongoose.createConnection(ATLAS_URI).asPromise();
  console.log('Connected to Atlas.\n');

  for (const collName of COLLECTIONS) {
    const localColl = local.collection(collName);
    const atlasColl = atlas.collection(collName);

    const docs = await localColl.find({}).toArray();

    if (docs.length === 0) {
      console.log(`  SKIP  ${collName} (empty)`);
      continue;
    }

    // Drop existing atlas collection and re-insert
    await atlasColl.deleteMany({});
    await atlasColl.insertMany(docs);
    console.log(`  OK    ${collName} — ${docs.length} documents`);
  }

  console.log('\nMigration complete!');
  await local.close();
  await atlas.close();
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
