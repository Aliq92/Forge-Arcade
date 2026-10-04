import { build } from 'vite';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
await build({
  configFile: false, root,
  build: { outDir: 'module', emptyOutDir: true, target: 'es2022',
    lib: { entry: { 'forge-beast': `${root}src/index.ts`, launcher: `${root}src/launcher.ts` }, formats: ['es'], fileName: (_, name) => `${name}.js`, cssFileName: 'forge-beast' },
    rollupOptions: { output: { chunkFileNames: 'shared-[hash].js' } },
  },
});
