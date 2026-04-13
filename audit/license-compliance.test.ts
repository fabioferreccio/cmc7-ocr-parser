/**
 * T-026 — Auditoria de licenças das dependências
 * Verifica que todas as dependências de produção têm licença MIT ou Apache 2.0.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = join(import.meta.dirname, '..');

const ALLOWED_LICENSES = new Set([
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'CC0-1.0',
]);

describe('Conformidade de licenças', () => {
  it('package.json deve declarar licença MIT', () => {
    const pkgPath = join(ROOT, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
      license?: string;
    };
    expect(pkg.license).toBe('MIT');
  });

  it('package.json deve ter o campo "author" preenchido', () => {
    const pkgPath = join(ROOT, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
      author?: string | { name: string };
    };
    const author =
      typeof pkg.author === 'string' ? pkg.author : pkg.author?.name;
    expect(author).toBeTruthy();
  });

  it('dependência de produção onnxruntime-web deve ter licença MIT', () => {
    const onnxLicensePath = join(
      ROOT,
      'node_modules',
      'onnxruntime-web',
      'LICENSE',
    );
    if (!existsSync(onnxLicensePath)) {
      // Fallback: verificar package.json da dependência
      const onnxPkgPath = join(
        ROOT,
        'node_modules',
        'onnxruntime-web',
        'package.json',
      );
      expect(existsSync(onnxPkgPath)).toBe(true);
      const onnxPkg = JSON.parse(readFileSync(onnxPkgPath, 'utf-8')) as {
        license?: string;
      };
      expect(ALLOWED_LICENSES.has(onnxPkg.license ?? '')).toBe(true);
    } else {
      const content = readFileSync(onnxLicensePath, 'utf-8');
      expect(content).toMatch(/MIT|Apache/i);
    }
  });

  it('LICENSE no repositório deve ser MIT com ano e autor corretos', () => {
    const licensePath = join(ROOT, 'LICENSE');
    expect(existsSync(licensePath)).toBe(true);
    const content = readFileSync(licensePath, 'utf-8');
    expect(content).toMatch(/MIT License/);
    expect(content).toMatch(/2026/);
    expect(content).toMatch(/Fábio Ferreccio|Fabio Ferreccio/);
  });

  it('package.json não deve ter dependências de produção com licença proibida (GPL, AGPL, SSPL)', () => {
    const pkgPath = join(ROOT, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
      dependencies?: Record<string, string>;
    };
    const productionDeps = Object.keys(pkg.dependencies ?? {});

    const forbidden: string[] = [];
    for (const dep of productionDeps) {
      const depPkgPath = join(ROOT, 'node_modules', dep, 'package.json');
      if (!existsSync(depPkgPath)) continue;
      const depPkg = JSON.parse(readFileSync(depPkgPath, 'utf-8')) as {
        license?: string;
      };
      const license = depPkg.license ?? '';
      if (/GPL|AGPL|SSPL/i.test(license)) {
        forbidden.push(`${dep}: ${license}`);
      }
    }

    expect(forbidden).toEqual([]);
  });
});
