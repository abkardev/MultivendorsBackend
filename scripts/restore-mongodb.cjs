#!/usr/bin/env node
/**
 * restore-mongodb.cjs — thin wrapper around the canonical src/scripts/restoreMongoDB.js
 *
 * Restores a mongodump archive. Refuses to run against production unless --force is
 * given explicitly (the underlying script enforces this too).
 *
 * Usage:
 *   node scripts/restore-mongodb.cjs --file <backup.archive.gz> [--drop] [--force]
 *
 * Safe drill example (non-production):
 *   MONGODB_URI=mongodb://localhost:27018/restore_drill \
 *     node scripts/restore-mongodb.cjs --file path/to/mongodb-....archive.gz --drop
 */
const { spawnSync } = require('child_process');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'scripts', 'restoreMongoDB.js');
const r = spawnSync(process.execPath, [src, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});
process.exit(r.status ?? 1);