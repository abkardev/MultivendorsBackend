import { config as loadEnv } from 'dotenv';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createInterface } from 'node:readline';
import mongoose from 'mongoose';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, '../../.env'), override: false });
loadEnv();

const execFileAsync = promisify(execFile);

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace';
const backupDir = process.env.MONGODB_BACKUP_DIR || resolve(__dirname, '../../backups');

const args = process.argv.slice(2);
const fileIdx = args.indexOf('--file');
const force = args.includes('--force');
const dropExisting = args.includes('--drop');

if (fileIdx < 0 || !args[fileIdx + 1]) {
  console.error('Usage: node src/scripts/restoreMongoDB.js --file <backup|json.gz> [--drop] [--force]');
  console.error('  --file   path to a mongodb-*.archive.gz (mongodump) or mongodb-*.json.gz (JS dump)');
  console.error('  --drop   drop collections before restoring (default: overwrite)');
  console.error('  --force  allow restore in NODE_ENV=production (DANGEROUS)');
  process.exit(2);
}

const requested = resolve(args[fileIdx + 1]);
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !force) {
  console.error('[restore] REFUSED: running in production requires --force. Verify backups and data before restoring.');
  process.exit(1);
}

async function resolveFile(input) {
  if ((await import('node:fs/promises').then((m) => m.stat(input).catch(() => null)))?.isFile()) return input;
  const files = await readdir(backupDir).catch(() => []);
  const candidates = files.filter((f) => /^mongodb-.*\.(archive\.gz|json\.gz)$/.test(f)).sort();
  const match = candidates.filter((f) => f.includes(input) || input.includes(f));
  const latest = match.length ? match[match.length - 1] : candidates[candidates.length - 1];
  if (!latest) throw new Error(`No backup archive found in ${backupDir}`);
  return join(backupDir, latest);
}

async function jsRestore(archive) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  const rl = createInterface({ input: createReadStream(archive).pipe(createGunzip()), crlfDelay: Infinity });
  let currentName = null;
  const indexesByName = new Map();
  let batch = [];
  const counters = {};
  const flush = async () => {
    if (!currentName || !batch.length) return;
    const coll = db.collection(currentName);
    if (dropExisting) await coll.deleteMany({});
    const result = await coll.insertMany(batch, { ordered: false });
    counters[currentName] = (counters[currentName] || 0) + (result.insertedCount ?? batch.length);
    batch = [];
  };

  for await (const line of rl) {
    if (line.startsWith('@@end')) break;
    if (line.startsWith('@@meta')) {
      console.log('[restore] meta:', line.slice(6));
      continue;
    }
    if (line.startsWith('@@collection')) {
      await flush();
      const meta = JSON.parse(line.slice(12));
      currentName = meta.name;
      if (!dropExisting && counters[currentName]) throw new Error(`Target already contains data for ${currentName}; use --drop to overwrite.`);
      console.log(`[restore] restoring ${currentName} (source count ${meta.count})`);
      continue;
    }
    if (line.startsWith('@@indexes')) {
      indexesByName.set(currentName, JSON.parse(line.slice(9)));
      continue;
    }
    if (currentName) {
      batch.push(JSON.parse(line));
      if (batch.length >= 500) await flush();
    }
  }
  await flush();

  // Re-apply indexes after data load.
  for (const [name, indexes] of indexesByName) {
    const coll = db.collection(name);
    for (const idx of indexes || []) {
      if (idx.name === '_id_') continue;
      try {
        const keys = idx.key || {};
        const options = Object.fromEntries(Object.entries(idx).filter(([k]) => !['key', 'name', 'v', 'ns'].includes(k)));
        await coll.createIndex(keys, { ...options, name: idx.name });
      } catch (e) {
        console.warn(`[restore] index ${idx.name} on ${name} failed: ${e.message}`);
      }
    }
  }
  await mongoose.disconnect();
  console.log('[restore] js: restored counts:', JSON.stringify(counters));
  return counters;
}

async function mongorestorePath(archive) {
  const restoreArgs = ['--uri', uri, '--archive', archive, '--gzip'];
  if (dropExisting) restoreArgs.push('--drop');
  console.log(`[restore] mongorestore ${dropExisting ? 'with --drop' : ''}`);
  try {
    await execFileAsync('mongorestore', restoreArgs, { timeout: 6 * 60 * 60 * 1000 });
  } catch (err) {
    if (/ENOENT/.test(err.message || '')) {
      throw new Error('mongorestore not installed. Install MongoDB Database Tools (https://www.mongodb.com/try/download/database-tools) or use a .json.gz backup.');
    }
    console.error(err.stderr || err.message);
    throw err;
  }
}

async function run() {
  const archive = await resolveFile(requested);
  const isJson = /\.json\.gz$/.test(archive);
  console.log(`[restore] restoring ${archive} (${isJson ? 'JS json.gz' : 'mongodump archive'} format)`);
  if (isJson) await jsRestore(archive);
  else await mongorestorePath(archive);
  console.log('[restore] ok');
}

run().then(() => process.exit(0)).catch((err) => {
  console.error('[restore] fatal:', err.message);
  process.exit(1);
});