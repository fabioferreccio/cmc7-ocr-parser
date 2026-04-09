import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

// Nota: Em ambiente Node/Vitest, carregar o OpenCV.js real pode ser complexo
// sem as dependências corretas (emscripten, path mocks).
// Para este benchmark, focaremos no tamanho do arquivo e na validação programática
// do que a build exporta, se possível.

describe('T-003 — Benchmark Build OpenCV.js', () => {
  const DIST_WASM_DIR = path.resolve(process.cwd(), 'dist/wasm');
  const JS_PATH = path.join(DIST_WASM_DIR, 'opencv.js');
  const WASM_BIN_PATH = path.join(DIST_WASM_DIR, 'opencv_js.wasm');

  it('deve confirmar que build customizada tem tamanho total ≤ 4 MB (JS+WASM)', () => {
    if (!fs.existsSync(JS_PATH)) {
      throw new Error(
        `Arquivo OpenCV JS não encontrado em: ${JS_PATH}. Execute: npm run opencv:prepare`,
      );
    }
    if (!fs.existsSync(WASM_BIN_PATH)) {
      throw new Error(
        `Arquivo WASM não encontrado em: ${WASM_BIN_PATH}. Execute: npm run opencv:prepare`,
      );
    }

    const jsStats = fs.statSync(JS_PATH);
    const wasmStats = fs.statSync(WASM_BIN_PATH);
    const totalSizeInMB = (jsStats.size + wasmStats.size) / (1024 * 1024);
    
    console.log(`OpenCV Build Sizes:`);
    console.log(`- JS Glue: ${(jsStats.size / 1024).toFixed(2)} KB`);
    console.log(`- WASM: ${(wasmStats.size / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`- Total: ${totalSizeInMB.toFixed(2)} MB`);
    
    // Regra RNF-003: ≤ 4 MB (Total footprint)
    expect(totalSizeInMB).toBeLessThanOrEqual(4);
  });

  it('deve confirmar presença das operações core necessárias em runtime', () => {
    const runtimeCheckScript = `
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const projectRoot = process.cwd();
const wasmDir = path.resolve(projectRoot, 'dist/wasm');
const opencvPath = path.join(wasmDir, 'opencv.js');
const code = fs.readFileSync(opencvPath, 'utf8');

process.chdir(wasmDir);

const requiredFns = [
  'GaussianBlur',
  'adaptiveThreshold',
  'findContours',
  'warpAffine',
  'matchTemplate',
  'cvtColor',
  'morphologyEx'
];

const context = {
  module: { exports: {} },
  exports: {},
  require,
  process,
  console,
  __dirname: wasmDir,
  __filename: opencvPath,
  setTimeout,
  clearTimeout,
  Buffer
};

vm.createContext(context);
vm.runInContext(code, context, { filename: opencvPath });

const timeoutMs = 15000;
const start = Date.now();

const checkReady = () => {
  const cv = context.module.exports;
  const isReady = cv && typeof cv.Mat === 'function';

  if (isReady) {
    const missing = requiredFns.filter((fn) => typeof cv[fn] !== 'function');
    console.log(JSON.stringify({ missing }));
    process.exit(missing.length ? 2 : 0);
  }

  if (Date.now() - start > timeoutMs) {
    console.error('OpenCV runtime initialization timeout');
    process.exit(3);
  }

  setTimeout(checkReady, 100);
};

checkReady();
`;

    const result = spawnSync(process.execPath, ['--input-type=module', '-e', runtimeCheckScript], {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 30000,
    });

    if (result.status !== 0) {
      throw new Error(`Runtime check failed (code ${result.status}): ${result.stderr || result.stdout}`);
    }

    const stdout = result.stdout.trim();
    const lastLine = stdout.split(/\r?\n/).at(-1) ?? '{}';
    const parsed = JSON.parse(lastLine) as { missing: string[] };
    expect(parsed.missing).toEqual([]);
  });

  it('deve confirmar que não há referências a pthread se for single-thread', () => {
    const content = fs.readFileSync(JS_PATH, 'utf8');
    
    // Premissa RP-02: Single-thread (sem threads do emscripten)
    const hasPthreads = content.includes('PThread') || content.includes('SharedArrayBuffer');
    
    expect(hasPthreads).toBe(false);
  });
});
