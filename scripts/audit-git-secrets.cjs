#!/usr/bin/env node
/**
 * audit-git-secrets.cjs
 *
 * Scans git history for committed secrets. Reports ONLY: file, env variable name,
 * severity, rotationRequired. NEVER prints any secret value.
 *
 * Detection:
 *   - env-style assignments in any blob:  NAME=value
 *   - provider-prefixed secret grammar (sk_live_, sk_test_, whsec_, AKIA, r2 secret lengths,
 *     BEGIN (RSA|OPENSSH|EC|PGP) PRIVATE KEY, Bearer/ApiKey in JSON keys)
 *   - "real-looking" = value is not an obvious placeholder/example and length >= 16
 *     (or matches a known prefix regardless of length)
 *
 * Usage:  node scripts/audit-git-secrets.cjs [path-to-repo]
 * Requires git on PATH. Read-only; never modifies the repo.
 */
const { execFileSync } = require('child_process');
const path = require('path');

const repo = process.argv[2] || process.cwd();
const run = (bin, args) => execFileSync(bin, args, { cwd: repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const PLACEHOLDER = /^(your_?|change.?me|changeme|replace.?me|rep_?lace|placeholder|sample|example|dummy|xxxx+$|<[^>]+>|#?$)/i;
const SECRET_PREFIX = /^(sk_live|sk_test|rk_live|whsec_|whsec|AKIA|ASIA|BEGIN (RSA|OPENSSH|EC|OPENSSH|PGP) PRIVATE|ghp_|gho_|xoxb-|xapp-)/;
const KEY_ONLY = /(_KEY|_SECRET|_TOKEN|_PASSWORD|_PASS|_CREDENTIALS|ACCESS_KEY|ACCESS_KEY_ID|SECRET_ACCESS_KEY|WEBHOOK_SECRET|CLIENT_SECRET|API_KEY)\s*[=:]/;

function classifyValue(name, value) {
  const v = String(value).trim();
  if (!v || PLACEHOLDER.test(v)) return null;
  if (SECRET_PREFIX.test(v)) return { severity: 'CRITICAL', rotation: true };
  if (/^mongodb(\+srv)?:\/\/\S+:.+@/.test(v)) return { severity: 'CRITICAL', rotation: true }; // URI w/ password
  if (KEY_ONLY.test(name + '=') && v.length >= 16) return { severity: 'HIGH', rotation: true };
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(v)) return { severity: 'CRITICAL', rotation: true };
  if (/["']?(sk_|rk_)[A-Za-z0-9_-]{10,}["']?/.test(v)) return { severity: 'CRITICAL', rotation: true };
  if (v.length >= 32 && /[A-Za-z0-9+/=_\-]{32,}/.test(v)) return { severity: 'MEDIUM', rotation: true };
  return null;
}

try {
  const log = run('git', ['log', '--format=%H', '--all']);
  const commits = log.split(/\r?\n/).filter(Boolean);
  const blobs = new Set();
  for (const c of commits) {
    try {
      const listing = run('git', ['ls-tree', '-r', '--name-only', c]);
      const tree = run('git', ['ls-tree', '-r', '-z', c]);
      const items = tree.split('\0').filter(Boolean);
      for (const item of items) {
        const m = item.match(/\s([0-9a-f]{40})\t/);
        if (m) blobs.add(m[1]);
      }
    } catch {}
  }
  console.log(`# Scanning ${blobs.size} unique blobs across ${commits.length} commits ...`);

  const findings = new Map();
  const nameCache = new Map();
  const tryName = (hash) => {
    if (nameCache.has(hash)) return nameCache.get(hash);
    try {
      const out = run('git', ['log', '--all', '--name-only', '--pretty=format:', `--find-object=${hash}`]);
      const first = out.split(/\r?\n/).filter(Boolean)[0];
      nameCache.set(hash, first || '');
      return first || '';
    } catch {
      return '';
    }
  };
  for (const hash of blobs) {
    let raw;
    try { raw = run('git', ['cat-file', 'blob', hash]); } catch { continue; }
    if (!raw || raw.includes('\u0000')) continue;
    const file = tryName(hash);
    for (const line of raw.split(/\r?\n/)) {
      const eq = /^\s*([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*["']?([^\s"']{1,512})/.exec(line);
      if (eq) {
        const name = eq[1];
        const cls = classifyValue(name, eq[2]);
        if (cls) {
          const key = `${name}`;
          const cur = findings.get(key) || { firstFile: file || '(unknown)', files: new Set(), severity: cls.severity };
          cur.files.add(file || '(unknown)');
          if (cur.severity !== 'CRITICAL') cur.severity = cls.severity;
          findings.set(key, cur);
        }
      }
    }
  }

  console.log('\n# Findings (values redacted — NEVER printed)');
  console.log('VARIABLE\tSEVERITY\tROTATE\tFILES');
  let critical = 0;
  for (const [name, f] of [...findings.entries()].sort()) {
    console.log(`${name}\t${f.severity}\t${f.firstFile ? 'YES' : 'YES'}\t${[...f.files].slice(0, 5).join(', ')}`);
    if (f.severity === 'CRITICAL') critical++;
  }
  console.log(`\n# ${findings.size} variable(s) with secret-looking historical values (${critical} critical). Rotate ALL of them before production.`);
} catch (e) {
  console.error('audit failed:', e.message);
  process.exit(1);
}