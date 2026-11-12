'use strict';

// Local development asset preparation only; never changes active gallery wiring.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require(process.env.FORGE_SHARP || 'C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1105-1297-0_26.1105.1297.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '..');
const recordsDir = path.join(root, 'test-results/card-art/pixel-source-records');
const reportPath = path.join(root, 'test-results/card-art/pixel-assets-report.json');
const outputDir = path.join(root, 'assets/thumbnails/pixel');

async function optionalStat(file) {
  try { return await fs.lstat(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
function within(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}
async function safeOutputDirectory(directory, canonicalRoot) {
  // Check every existing ancestor before creating anything; reject redirected outputs.
  let ancestor = directory;
  while (!(await optionalStat(ancestor))) {
    const next = path.dirname(ancestor);
    if (next === ancestor) throw new Error('Cannot resolve output directory');
    ancestor = next;
  }
  if (!within(canonicalRoot, await fs.realpath(ancestor))) throw new Error('Output ancestor escapes workspace');
  await fs.mkdir(directory, { recursive: true });
  if (!within(canonicalRoot, await fs.realpath(directory))) throw new Error('Output directory escapes workspace');
}
async function run() {
  const arguments_ = process.argv.slice(2);
  if (arguments_.some(value => value !== '--require-all')) throw new Error('Usage: node tests/install-pixel-card-art.cjs [--require-all]');
  const requireAll = arguments_.includes('--require-all');
  const prompts = JSON.parse(await fs.readFile(path.join(root, 'artwork/card-prompts.json'), 'utf8'));
  if (!Array.isArray(prompts) || prompts.length !== 38 || new Set(prompts.map(p => p.id)).size !== 38 || prompts.some(p => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.id))) throw new Error('Expected 38 distinct safe ids in artwork/card-prompts.json');
  const ids = new Set(prompts.map(p => p.id));
  let files;
  try { files = await fs.readdir(recordsDir); } catch (error) { if (error.code !== 'ENOENT') throw error; files = []; }
  const records = new Map();
  for (const filename of files.filter(file => file.endsWith('.json')).sort()) {
    const record = JSON.parse(await fs.readFile(path.join(recordsDir, filename), 'utf8'));
    if (!record || !ids.has(record.id) || filename !== record.id + '.json') throw new Error(`Unknown or mismatched pixel source record: ${filename}`);
    if (records.has(record.id)) throw new Error(`Duplicate record: ${record.id}`);
    const expected = `assets/thumbnails/pixel/${record.id}.webp`;
    if (record.output !== expected || !within(root, path.resolve(root, record.output))) throw new Error(`Unexpected output for ${record.id}`);
    if (typeof record.source !== 'string' || !path.isAbsolute(record.source) || /^(?:[a-z]+:\/\/|\\\\|\/\/)/i.test(record.source) || path.extname(record.source).toLowerCase() !== '.png') throw new Error(`Source must be an absolute local PNG path: ${record.id}`);
    if (typeof record.tool !== 'string' || !record.tool.trim() || record.tool.length > 100 || typeof record.prompt !== 'string' || !record.prompt.trim()) throw new Error(`Missing generation provenance: ${record.id}`);
    records.set(record.id, record);
  }
  const canonicalRoot = await fs.realpath(root);
  await safeOutputDirectory(outputDir, canonicalRoot);
  await safeOutputDirectory(path.dirname(reportPath), canonicalRoot);
  const assets = [], missing = [];
  for (const { id } of prompts) {
    const record = records.get(id);
    if (!record) { missing.push(id); continue; }
    const target = path.resolve(root, record.output);
    if (target !== path.join(outputDir, id + '.webp')) throw new Error(`Noncanonical output: ${id}`);
    const sourceStat = await fs.stat(record.source);
    if (!sourceStat.isFile()) throw new Error(`Source is not a file: ${id}`);
    const sourceMetadata = await sharp(record.source, { failOn: 'error' }).metadata();
    if (sourceMetadata.format !== 'png' || !sourceMetadata.width || !sourceMetadata.height || (sourceMetadata.pages || 1) !== 1) throw new Error(`Source is not a single PNG image: ${id}`);
    const existing = await optionalStat(target);
    if (existing?.isSymbolicLink() || (existing && !existing.isFile())) throw new Error(`Refusing redirected or non-file output: ${id}`);
    let fresh = false;
    if (existing && existing.mtimeMs >= sourceStat.mtimeMs) {
      try { const metadata = await sharp(target).metadata(); fresh = metadata.format === 'webp' && metadata.width === 960 && metadata.height === 540; } catch {}
    }
    if (!fresh) {
      // Two explicit pipelines preserve the intentionally low-resolution pixel grid.
      const pixels = await sharp(record.source, { failOn: 'error' })
        .resize(480, 270, { fit: 'cover', position: 'centre', kernel: 'nearest' })
        .png().toBuffer();
      const temporary = target + `.${process.pid}-${Date.now()}.tmp`;
      try {
        const encoded = await sharp(pixels)
          .resize(960, 540, { fit: 'fill', kernel: 'nearest' })
          .webp({ lossless: true, effort: 6 }).toBuffer();
        await fs.writeFile(temporary, encoded, { flag: 'wx' });
        await fs.rename(temporary, target);
      } finally { try { await fs.unlink(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
    }
    const metadata = await sharp(target).metadata(), installed = await fs.stat(target);
    if (metadata.format !== 'webp' || metadata.width !== 960 || metadata.height !== 540) throw new Error(`Invalid encoded dimensions: ${id}`);
    assets.push({ id, width: metadata.width, height: metadata.height, bytes: installed.size, source: path.basename(record.source), tool: record.tool, status: fresh ? 'skipped-current' : 'encoded' });
  }
  const report = { expected: prompts.length, available: assets.length, assets, missing };
  const previousReport = await optionalStat(reportPath);
  if (previousReport?.isSymbolicLink() || (previousReport && !previousReport.isFile())) throw new Error('Refusing redirected report output');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ expected: prompts.length, installed: assets.length, encoded: assets.filter(asset => asset.status === 'encoded').length, missing: missing.length }));
  if (requireAll && missing.length) throw new Error(`Missing ${missing.length} pixel source records: ${missing.join(', ')}`);
}

run().catch(error => { console.error(error.message); process.exitCode = 1; });
