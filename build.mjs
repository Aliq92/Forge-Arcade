// Static Arcade keeps native game documents and relative links; no new framework.
import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('.', import.meta.url));
const output = path.join(root, 'dist');
await rm(output, { recursive: true, force: true });
await mkdir(output);
for (const entry of await readdir(root)) {
  if (entry.startsWith('.') || ['dist', 'tests', 'node_modules', 'build.mjs', 'INTEGRATION.md'].includes(entry)) continue;
  await cp(path.join(root, entry), path.join(output, entry), { recursive: true, filter: item => {
    const relative = path.relative(root, item).replaceAll(path.sep, '/');
    return !relative.includes('/node_modules/') && !relative.includes('/tests/') &&
      !/games\/forge-beast\/(src|tests|node_modules)(\/|$)/.test(relative) &&
      !/games\/forge-beast\/(package.*\.json|tsconfig.json|playwright.config.ts|build.mjs|.*\.md)$/.test(relative);
  } });
}
console.log(`Static Forge Arcade production build: ${output}`);
