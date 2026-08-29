import { config as loadEnv } from 'dotenv';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readdir, rm } from 'node:fs/promises';
import { createWriteStream, createReadStream } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createGzip } from 'node:zlib';
import mongoose from 'mongoose';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, '../../.env'), override: false });
loadEnv();

const execFileAsync = promisify(execFile);

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace';
const backupDir = process.env.MONGODB_BACKUP_DIR || resolve(__dirname, '../../backups');
const retentionDays = parseInt(process.env.MONGODB_BACKUP_RETENTION_DAYS || '7', 10);
const withOplog = process.env.MONGODB_BACKUP_OPLOG !== 'false';

// --tool auto     (default) use mongodump, fall back to a zero-dependency JS dump if the binary is missing
// --tool mongodump require mongodump explicitly
// --tool js       always use the JS dump
const toolArg = process.argv.find((a) => a.startsWith('--tool'));
const tool = toolArg ? toolArg.split('=')[1] || process.argv[process.argv.indexOf(toolArg) + 1] || 'auto' : 'auto';

const label = new Date().toISOString().replace(/[:.]/g, '-');

async function prune() {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const files = await readdir(backupDir).catch(() => []);
  let removed = 0;
  for (const f of files) {
    const full = resolve(backupDir, f);
    const stat = await import('node:fs/promises').then((m) => m.stat(full).catch(() => null));
    if (stat && stat.mtimeMs < cutoff && (f.startsWith('mongodb-') && f.endsWith('.archive.gz'))) {
      await rm(full, { force: true });
      removed++;
      console.log(`[backup] pruned ${f}`);
    }
  }
  if (removed) console.log(`[backup] pruned ${removed} old backup(s)`);
}

async function jsDump() {
  const archive = resolve(backupDir, `mongodb-${label}.json.gz`);
  await mkdir(backupDir, { recursive: true });
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  const colls = (await db.listCollections().toArray()).filter((c) => !c.name.startsWith('system.'));
  const file = await createWriteStream(archive);
  const gzip = createGzip();
  async function* source() {
    yield `@@meta ${JSON.stringify({ db: db.databaseName, at: new Date().toISOString(), tool: 'js' })}\n`;
    for (const { name } of colls) {
      const coll = db.collection(name);
      const indexes = await coll.indexes();
      yield `@@collection ${JSON.stringify({ name, count: await coll.countDocuments() })}\n`;
      yield `@@indexes ${JSON.stringify(indexes)}\n`;
      const cursor = coll.find({}).sort({ _id: 1 });
      for await (const doc of cursor) {
        yield `${JSON.stringify(doc)}\n`;
      }
    }
    yield `@@end\n`;
  }
  await pipeline(Readable.from(source()), gzip, file);
  await mongoose.disconnect();
  console.log(`[backup] js: ${basename(archive)} (${colls.length} collections)`);
  return archive;
}

async function mongodumpDump() {
  const archive = resolve(backupDir, `mongodb-${label}.archive.gz`);
  await mkdir(backupDir, { recursive: true });
  const args = ['--uri', uri, '--archive', archive, '--gzip'];
  if (withOplog) args.push('--oplog');
  console.log(`[backup] starting: mongodump --archive --gzip${withOplog ? ' --oplog' : ''}`);
  try {
    await execFileAsync('mongodump', args, { timeout: 6 * 60 * 60 * 1000 });
  } catch (err) {
    if (tool === 'auto' && (err.code === 'ENOENT' || /ENOENT/.test(err.message))) {
      console.warn('[backup] mongodump not installed — falling back to JS dump (no oplog). Install MongoDB Database Tools for the native path.');
      return jsDump();
    }
    console.error(`[backup] FAILED (mongodump)`);
    console.error(err.stderr || err.message);
    throw err;
  }
  console.log(`[backup] mongodump: ${basename(archive)}`);
  return archive;
}

async function run() {
  let archive;
  if (tool === 'js') archive = await jsDump();
  else archive = await mongodumpDump();

  const sizeMb = (await import('node:fs/promises').then((m) => m.stat(archive))).size / 1024 / 1024;
  console.log(`[backup] ok — ${basename(archive)} (${sizeMb.toFixed(2)} MB)`);

  await prune();
  console.log(`[backup] done. restore with: node src/scripts/restoreMongoDB.js --file "${basename(archive)}"`);
}

run().then(() => process.exit(0)).catch((err) => {
  console.error('[backup] fatal:', err.message);
  process.exit(1);
});