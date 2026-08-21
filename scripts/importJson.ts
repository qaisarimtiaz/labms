import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.argv[2] || process.env.MONGODB_URI;
const DATA_DIR = path.resolve(process.cwd(), 'proddata');

if (!MONGODB_URI) {
  console.error('Usage: npx tsx scripts/importJson.ts ["mongodb+srv://...uri..."]');
  console.error('(or set MONGODB_URI in .env.local)');
  process.exit(1);
}

// Import order: referenced collections before collections that reference them
const COLLECTIONS = [
  'users',
  'patients',
  'labtests',
  'testcategories',
  'testpackages',
  'testorders',
  'testresults',
];

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function reviveValue(key: string, value: unknown): unknown {
  if (typeof value === 'string') {
    if (key === '_id' || /(^|[A-Za-z])[iI]d$/.test(key)) {
      if (OBJECT_ID_RE.test(value)) return new ObjectId(value);
    }
    if (ISO_DATE_RE.test(value)) return new Date(value);
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => reviveValue(key, v));
  }
  if (value && typeof value === 'object') {
    return reviveDoc(value as Record<string, unknown>);
  }
  return value;
}

function reviveDoc(doc: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc)) {
    out[k] = reviveValue(k, v);
  }
  return out;
}

async function importAll() {
  const client = new MongoClient(MONGODB_URI as string);
  await client.connect();
  const db = client.db();
  console.log(`Connected to database: ${db.databaseName}\n`);

  for (const name of COLLECTIONS) {
    const file = path.join(DATA_DIR, `${name}.json`);
    if (!fs.existsSync(file)) {
      console.log(`  SKIP  ${name} (no file)`);
      continue;
    }

    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const docs: Record<string, unknown>[] = Array.isArray(raw) ? raw : [raw];

    if (docs.length === 0) {
      console.log(`  SKIP  ${name} (empty)`);
      continue;
    }

    const revived = docs.map(reviveDoc);
    const coll = db.collection(name);

    await coll.deleteMany({});
    const result = await coll.insertMany(revived, { ordered: false });
    console.log(`  OK    ${name} — ${result.insertedCount}/${docs.length} documents`);
  }

  console.log('\nImport complete!');
  await client.close();
}

importAll().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
