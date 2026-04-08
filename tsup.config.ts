import { defineConfig } from 'tsup';

export default defineConfig([
  // ESM build — entry principal
  {
    entry: {
      index: 'src/index.ts',
      react: 'src/react.ts',
      vue: 'src/vue.ts',
    },
    format: ['esm'],
    dts: true,
    splitting: true,
    treeshake: true,
    sourcemap: true,
    clean: true,
    outDir: 'dist/esm',
    target: 'es2020',
    // Assets WASM e modelos são copiados como arquivos estáticos (Regra 2.3)
    // NÃO são inlined no bundle
  },
  // CJS build — apenas entry principal (sem React/Vue em CJS)
  {
    entry: { index: 'src/index.ts' },
    format: ['cjs'],
    dts: true,
    splitting: false,
    treeshake: true,
    sourcemap: true,
    outDir: 'dist/cjs',
    target: 'es2020',
  },
  // Web Worker — bundled separadamente (Regra 2.2)
  {
    entry: { 'pipeline.worker': 'src/workers/pipeline.worker.ts' },
    format: ['esm'],
    dts: false,
    splitting: false,
    sourcemap: true,
    outDir: 'dist/workers',
    target: 'es2020',
    // Workers não fazem parte do bundle principal
    noExternal: [],
  },
]);
