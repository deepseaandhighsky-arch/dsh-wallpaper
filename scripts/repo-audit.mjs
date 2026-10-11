#!/usr/bin/env node
/** Dependency-free pre-publication source hygiene and version checks. */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, lstatSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const requirePublic = process.argv.includes('--public');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = packageJson.version;
const errors = [];
function check(test, message) { if (!test) errors.push(message); }

const required = [
  'client.js', 'index.js', 'cordis.patch.yml', 'package.json',
  'README.md', 'README.en.md', 'CHANGELOG.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md',
  'icon.svg', 'locale/en.json', 'locale/zh.json',
  'test/plugin.test.mjs', 'scripts/browser-smoke.mjs',
  '.github/workflows/check.yml', 'SECURITY.md', 'CONTRIBUTING.md',
  'docs/INSTALLATION.md', 'docs/COMPATIBILITY.md',
  'docs/PRIVACY.md', 'docs/RELEASE_CHECKLIST.md'
];
for (const path of required) check(existsSync(join(root, path)), `Missing expected file: ${path}`);
check(typeof version === 'string' && version.length > 0, 'Package version missing');
const client = readFileSync(join(root, 'client.js'), 'utf8');
const readme = readFileSync(join(root, 'README.md'), 'utf8');
const english = readFileSync(join(root, 'README.en.md'), 'utf8');
const changes = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
check(client.includes(`PLUGIN_VERSION = '${version}'`), 'client.js version differs from package.json');
check(readme.includes(version), 'README.md does not name current package version');
check(english.includes(version), 'README.en.md does not name current package version');
check(changes.includes(version), 'CHANGELOG.md does not list current version');
check(packageJson.license === 'MIT', 'Package license must match approved MIT LICENSE');
check(packageJson.repository?.url?.includes('github.com/deepseaandhighsky-arch/dsh-wallpaper.git'), 'Repository must point to the new clean publication project');
check(packageJson.private === true, 'Package is not intentionally blocked from accidental npm publication');
check(packageJson.dsh?.bundle?.patch === './cordis.patch.yml', 'DSH bundle patch is not declared correctly');
check(packageJson.exports?.['./client'] === './client.js', 'DSH client export is not declared correctly');

const ignoredRoots = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage']);
const forbiddenNames = /^(?:\.env(?:\..*)?|\.npmrc|id_rsa(?:\.pub)?|credentials(?:\..*)?|.*\.p(?:em|12|fx)|.*\.key)$/i;
const mediaExtensions = /\.(?:png|jpe?g|gif|webp|apng|mp4|mov|m4v|webm|ogg|mkv|avi)$/i;
const sensitivePatterns = [
  ['PEM private key', /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/],
  ['GitHub access token', /\b(?:gh[pousr]_[A-Za-z0-9]{24,}|github_pat_[A-Za-z0-9_]{50,})\b/],
  ['Likely API secret', /\bsk-[A-Za-z0-9_-]{38,}\b/],
];
let inspected = 0;
function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (ignoredRoots.has(e.name) && dir === root) continue;
    const path = join(dir, e.name);
    const rel = relative(root, path).split(sep).join('/');
    const mode = lstatSync(path);
    if (mode.isSymbolicLink()) { errors.push(`Symlink must be audited explicitly: ${rel}`); continue; }
    if (e.isDirectory()) { walk(path); continue; }
    if (!e.isFile()) continue;
    inspected++;
    check(!forbiddenNames.test(e.name), `Sensitive filename present: ${rel}`);
    check(!mediaExtensions.test(e.name), `Media file must be reviewed and kept out of source tree: ${rel}`);
    const bytes = readFileSync(path);
    if (bytes.includes(0)) { errors.push(`Unexpected binary file: ${rel}`); continue; }
    const content = bytes.toString('utf8');
    for (const [type, pattern] of sensitivePatterns) if (pattern.test(content)) errors.push(`${type} pattern in ${rel}`);
  }
}
walk(root);
if (requirePublic) {
  const licensePath = join(root, 'LICENSE');
  check(existsSync(licensePath), 'A public open-source release requires LICENSE');
  check(packageJson.license === 'MIT' && readFileSync(licensePath, 'utf8').startsWith('MIT License\n'),
    'A public open-source release requires approved SPDX license metadata');
  check(!english.includes('No open-source license is granted yet'),
    'Remove license-pending disclaimer from README.en.md');
  check(!readme.includes('no open-source license has been granted yet'),
    'Remove license-pending disclaimer from README.md');
}
if (errors.length) {
  for (const e of errors) process.stderr.write(`FAIL ${e}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`OK ${inspected} source files; version ${version}; license gate ${requirePublic ? 'public' : 'pre-publication'}\n`);
}
