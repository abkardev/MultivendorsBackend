#!/usr/bin/env node
/**
 * backup-mongodb.cjs — thin wrapper around the canonical src/scripts/backupMongoDB.js
 *
 * Platform-equivalent of backup-mongodb.sh for Windows/Node deployments.
 * Delegates to the same implementation the `npm run backup` script uses so there is
 * exactly one backup code path.
 *
 * Usage:
 *   node scripts/backup-mongodb.cjs [--dir <backupDir>] [--retention <days>] [--no-oplog]
 *
 * Reads MONGODB_URI / MONGODB_BACKUP_DIR / MONGODB_BACKUP_RETENTION_DAYS /
 * MONGODB_BACKUP_OPLOG from the environment or .env (loaded by the underlying script).
 */
const { spawnSync } = require('child_process');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'scripts', 'backupMongoDB.js');
const r = spawnSync(process.execPath, [src, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});
process.exit(r.status ?? 1);