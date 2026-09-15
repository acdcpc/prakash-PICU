#!/usr/bin/env node
/**
 * Scan tracked files for accidentally committed secrets.
 * Usage: node scripts/scan-secrets.mjs
 *
 * JWTs are decoded: a Supabase `anon` key is a public client key protected by
 * RLS, so it is reported as informational rather than a failure. Any other role
 * (notably `service_role`) fails the scan.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PATTERNS = [
  ['private key block', /BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY/],
  ['AWS access key', /AKIA[0-9A-Z]{16}/],
  ['OpenAI-style key', /\bsk-[A-Za-z0-9]{20,}\b/],
  ['service_role assignment', /service_role["']?\s*[:=]\s*["']eyJ/],
  ['generic password assignment', /(password|passwd|secret)\s*[:=]\s*['"][^'"\s]{12,}['"]/i],
];
const JWT_RE = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;

function jwtRole(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8')).role || null;
  } catch { return null; }
}

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n')
  .filter((f) => f && !/\.(png|jpg|jpeg|gif|webp|ico|pdf|woff2?|ttf)$/i.test(f) && !f.endsWith('package-lock.json'));

let findings = 0;
let informational = 0;
for (const file of files) {
  let content;
  try { content = readFileSync(file, 'utf8'); } catch { continue; }
  if (content.length > 2_000_000) continue;
  const lines = content.split('\n');
  for (const [label, re] of PATTERNS) {
    lines.forEach((line, index) => {
      if (re.test(line)) { findings += 1; console.log(`FINDING  ${file}:${index + 1}  ${label}`); }
    });
  }
  lines.forEach((line, index) => {
    for (const token of line.match(JWT_RE) || []) {
      const role = jwtRole(token);
      if (role === 'anon') { informational += 1; console.log(`info     ${file}:${index + 1}  public anon key (expected)`); }
      else { findings += 1; console.log(`FINDING  ${file}:${index + 1}  JWT with role=${role ?? 'unknown'}`); }
    }
  });
}
console.log(findings ? `\n${findings} potential secret(s) found (${informational} informational).` : `\nNo committed secrets detected (${informational} public key(s) noted).`);
process.exit(findings ? 1 : 0);
