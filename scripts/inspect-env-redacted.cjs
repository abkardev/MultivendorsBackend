#!/usr/bin/env node
/**
 * inspect-env-redacted.cjs
 *
 * PRINTS VARIABLE NAMES AND CLASSIFICATIONS ONLY. NEVER PRINTS VALUES.
 *
 * Safe redacted inventory tool:
 *   - Lists every env var name referenced by source (process.env.* / import.meta.env.*)
 *   - Optionally loads a .env file (same syntax as dotenv) via --dotenv <path> and
 *     classifies each value as one of: EMPTY / PLACEHOLDER / SANDBOX / SHORT / SECRET-LOOKING /
 *     URL / LIST / NUMBER / SET(class unknown).
 *   - The classification prints ONLY a category token — never the underlying value.
 *
 * Usage:
 *   node scripts/inspect-env-redacted.cjs                # scan source references only
 *   node scripts/inspect-env-redacted.cjs --dotenv .env  # add value classification (redacted)
 *   node scripts/inspect-env-redacted.cjs --dotenv .env --values  # writes a MASKED value
 *        representation (first 3 chars + '****') for FORENSIC team use only
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// ---- masked value classifier ------------------------------------------------
function classify(v) {
  if (v === undefined || v === null) return 'EMPTY';
  const s = String(v);
  if (s.trim() === '') return 'EMPTY';
  const low = s.toLowerCase();
  const placeholders =
    /your_|your-|changeme|change-this|replaceme|rep-lace|placeholder|xxxx+$|^\<.*\>$|example|sample|dummy|test-value|#$/;
  if (placeholders.test(low)) return 'PLACEHOLDER';
  if (/^sk_test_|^pk_test_|^sk_sandbox_|^testkey|^sandbox_/.test(low)) return 'SANDBOX';
  if (/^https?:\/\//.test(low)) return 'URL';
  if (/^(mongodb(\+srv)?):\/\//.test(low)) return 'DBURL';
  if (/^rediss?:\/\//.test(low)) return 'DBURL';
  if (/^[0-9]+$/.test(s)) return 'NUMBER';
  if (/^[0-9.]+%?$/.test(s) || low === 'true' || low === 'false' || low === 'yes' || low === 'no') return 'SCALAR';
  if (s.includes(',')) return 'LIST';
  if (s.length >= 20) return 'SECRET-LOOKING';
  if (s.length >= 4) return 'SHORT';
  return 'TINY';
}

function maskedValue(v) {
  const s = String(v);
  if (s.length <= 6) return '****';
  return s.slice(0, 3) + '****' + s.slice(-2);
}

// ---- collect source references ----------------------------------------------
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', 'uploads']);
const refs = new Map(); // key -> { files: Set, kind: 'process.env'|'import.meta.env' }
const rawRefRe = /(?:process\.env|import\.meta\.env)\.([A-Za-z_][A-Za-z0-9_]*)/g;
const keyRe = /([A-Za-z_][A-Za-z0-9_]*)/g;

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.') && ent.name !== '.env') continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      walk(full);
    } else if (/\.(js|mjs|cjs|ts|tsx|jsx|vue|sh|yml|yaml|json)$/.test(ent.name)) {
      let txt;
      try {
        txt = fs.readFileSync(full, 'utf8');
      } catch {
        continue;
      }
      rawRefRe.lastIndex = 0;
      let m;
      while ((m = rawRefRe.exec(txt)) !== null) {
        const key = m[1];
        if (!refs.has(key)) refs.set(key, { files: new Set(), kind: m[0].startsWith('import.meta') ? 'import.meta.env' : 'process.env' });
        refs.get(key).files.add(path.relative(ROOT, full));
        refs.get(key).kind = m[0].startsWith('import.meta') ? 'import.meta.env' : refs.get(key).kind;
      }
    }
  }
}

// ---- output -----------------------------------------------------------------
walk(ROOT);
const keys = [...refs.keys()].sort();

console.log(`# Source-referenced env vars: ${keys.length}`);
console.log('KEY\tKIND\tSOURCE_FILE_COUNT');

const dotenvIndex = process.argv.indexOf('--dotenv');
const showMasked = process.argv.includes('--values');
const envSource = {};
if (dotenvIndex > -1 && process.argv[dotenvIndex + 1]) {
  const p = path.resolve(ROOT, process.argv[dotenvIndex + 1]);
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const i = t.indexOf('=');
      envSource[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
    }
  } else {
    console.error(`env file not found: ${p}`);
    process.exit(2);
  }
}

for (const k of keys) {
  let cls = 'NO_LOCAL_VALUE';
  let masked = '-';
  if (envSource[k] !== undefined) {
    cls = classify(envSource[k]);
    masked = showMasked ? maskedValue(envSource[k]) : '(masked)';
  }
  console.log(`${k}\t${refs.get(k).kind}\t${refs.get(k).files.size}\t${cls}\t${masked}`);
}

// add keys present in the env file but not referenced by source (candidates for cleanup)
const unreferenced = Object.keys(envSource)
  .filter((k) => !refs.has(k) && k !== 'NODE_ENV')
  .sort();
if (unreferenced.length) {
  console.log('\n# Present in env file but NOT referenced by source:');
  for (const k of unreferenced) {
    console.log(`${k}\tUNREFERENCED\t${classify(envSource[k])}\t${showMasked ? maskedValue(envSource[k]) : '(masked)'}`);
  }
}