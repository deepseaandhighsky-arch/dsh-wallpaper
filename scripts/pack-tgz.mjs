#!/usr/bin/env node
/** Pack and verify the installable DSH bundle; never publish to a registry. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const expectedTag = `refs/tags/v${pkg.version}`;
const gitRef = process.env.GITHUB_REF ?? '';
const expectedFiles = [
  'LICENSE', 'README.en.md', 'README.md', 'client.js', 'cordis.patch.yml',
  'icon.svg', 'index.js', 'locale/en.json', 'locale/zh.json', 'package.json',
].sort();

assert.equal(pkg.private, true, 'Registry publication must remain disabled');
assert.equal(pkg.license, 'MIT', 'The tarball must include the approved license');
assert.equal(pkg.dsh?.bundle?.patch, './cordis.patch.yml', 'Missing DSH bundle patch');
assert.match(pkg.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, 'Invalid package version');
if (gitRef.startsWith('refs/tags/')) {
  assert.equal(gitRef, expectedTag, `Git tag must match package.json version: ${expectedTag}`);
}

const filename = `${pkg.name.replace(/^@/, '').replace(/\//g, '-')}-${pkg.version}.tgz`;
const dist = join(root, 'dist');
const target = join(dist, filename);
mkdirSync(dist, { recursive: true });
rmSync(target, { force: true });
rmSync(`${target}.sha256`, { force: true });

// npm supplies npm_execpath when this is invoked using `npm run pack:tgz`.
// Invoke its JavaScript CLI through Node so the script works on Windows as well.
const npmCli = process.env.npm_execpath;
const command = npmCli ? process.execPath : process.platform === 'win32' ? 'npm.cmd' : 'npm';
const args = [
  ...(npmCli ? [npmCli] : []),
  'pack', '--json', '--ignore-scripts', '--pack-destination', dist,
];
const result = spawnSync(command, args, {
  cwd: root,
  encoding: 'utf8',
  shell: !npmCli && process.platform === 'win32',
  maxBuffer: 8 * 1024 * 1024,
});
if (result.error) throw result.error;
if (result.status !== 0) {
  throw new Error(`npm pack failed (${result.status}): ${result.stderr || result.stdout}`);
}
const packed = JSON.parse(result.stdout);
assert.equal(packed.length, 1, 'Expected exactly one package');
assert.equal(packed[0].name, pkg.name, 'Pack name mismatch');
assert.equal(packed[0].version, pkg.version, 'Pack version mismatch');
assert.equal(packed[0].filename, filename, 'Unexpected package filename');
assert.deepEqual(packed[0].files.map(f => f.path).sort(), expectedFiles,
  'Unexpected files in installable tarball (possibly private content or missing entry)');

// Independently inspect the actual .tgz instead of trusting npm's JSON listing.
const bytes = readFileSync(target);
const tar = gunzipSync(bytes);
const entries = new Map();
const tarField = (header, offset, size) => header.subarray(offset, offset + size)
  .toString('utf8').split('\0')[0];
for (let offset = 0; offset + 512 <= tar.length;) {
  const header = tar.subarray(offset, offset + 512);
  if (header.every(byte => byte === 0)) break;
  const name = tarField(header, 0, 100);
  const prefix = tarField(header, 345, 155);
  const path = prefix ? `${prefix}/${name}` : name;
  const size = Number.parseInt(tarField(header, 124, 12).trim(), 8);
  assert.ok(Number.isSafeInteger(size) && size >= 0, `Invalid tar entry size: ${path}`);
  assert.ok(header[156] === 0 || header[156] === 48, `Non-file tar entry: ${path}`);
  assert.ok(path.startsWith('package/') && !path.includes('..'), `Unsafe tar entry: ${path}`);
  assert.ok(!entries.has(path), `Duplicate tar entry: ${path}`);
  const start = offset + 512;
  assert.ok(start + size <= tar.length, `Truncated tar entry: ${path}`);
  entries.set(path, tar.subarray(start, start + size));
  offset = start + Math.ceil(size / 512) * 512;
}
assert.deepEqual([...entries.keys()].map(path => path.slice('package/'.length)).sort(),
  expectedFiles, 'Actual tgz entries differ from reviewed source allowlist');
for (const file of expectedFiles) {
  assert.deepEqual(entries.get(`package/${file}`), readFileSync(join(root, file)),
    `Tarball file differs from source: ${file}`);
}
const embeddedManifest = JSON.parse(entries.get('package/package.json').toString('utf8'));
assert.equal(embeddedManifest.version, pkg.version);
assert.equal(embeddedManifest.dsh?.bundle?.patch, './cordis.patch.yml');
const sha256 = createHash('sha256').update(bytes).digest('hex');
writeFileSync(`${target}.sha256`, `${sha256}  ${filename}\n`);
process.stdout.write(`OK ${filename}: ${expectedFiles.length} reviewed files, SHA-256 ${sha256}\n`);
