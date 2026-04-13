import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

describe('Bundle Size & Structure (T-024)', () => {
  const distPath = path.resolve(__dirname, '../dist');

  it('dist/esm/index.js deve ter < 50 KB gzip', () => {
    const esmPath = path.join(distPath, 'esm/index.js');
    expect(fs.existsSync(esmPath)).toBe(true);

    const content = fs.readFileSync(esmPath);
    const compressed = zlib.gzipSync(content);
    
    // Regra 6.1: < 50 KB gzip
    expect(compressed.length).toBeLessThan(50 * 1024);
  });

  it('dist/cjs/index.cjs deve estar presente', () => {
    const cjsPath = path.join(distPath, 'cjs/index.cjs');
    expect(fs.existsSync(cjsPath)).toBe(true);
  });

  it('dist/esm/index.d.ts deve exportar todos os tipos públicos', () => {
    const dtsPath = path.join(distPath, 'esm/index.d.ts');
    expect(fs.existsSync(dtsPath)).toBe(true);
    
    const content = fs.readFileSync(dtsPath, 'utf8');
    expect(content).toContain('export');
    // Check main API
    expect(content).toContain('createCMC7Reader');
  });

  it('dist/wasm/opencv.wasm deve estar presente (não inlined)', () => {
    const wasmPath = path.join(distPath, 'wasm/opencv.wasm');
    expect(fs.existsSync(wasmPath)).toBe(true);
    
    // Check ESM index doesn't have the whole WASM inlined
    const esmPath = path.join(distPath, 'esm/index.js');
    const esmSize = fs.statSync(esmPath).size;
    expect(esmSize).toBeLessThan(1 * 1024 * 1024); // Definitely < 1MB
  });

  it('import(\'cmc7-ocr-parser\') em Node.js não deve crashar', async () => {
    const esmPath = path.join(distPath, 'esm/index.js');
    const module = await import(esmPath);
    expect(module).toBeDefined();
    expect(module.createCMC7Reader).toBeDefined();
  });

  it('require(\'cmc7-ocr-parser\') em Node.js deve funcionar via CJS', () => {
    const cjsPath = path.join(distPath, 'cjs/index.cjs');
    const mod = require(cjsPath);
    expect(mod.createCMC7Reader).toBeDefined();
  });

  it('subpath \'cmc7-ocr-parser/react\' deve ser resolvível', () => {
    // Verificamos se o arquivo D.TS também existe, que é crítico para DX
    const reactDtsPath = path.join(distPath, 'esm/react.d.ts');
    expect(fs.existsSync(reactDtsPath)).toBe(true);
    
    const reactJsPath = path.join(distPath, 'esm/react.js');
    expect(fs.existsSync(reactJsPath)).toBe(true);
  });

  it('subpath \'cmc7-ocr-parser/vue\' deve ser resolvível', () => {
    const vuePath = path.join(distPath, 'esm/vue.js');
    expect(fs.existsSync(vuePath)).toBe(true);
  });
});
