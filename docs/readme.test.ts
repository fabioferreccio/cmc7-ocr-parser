/**
 * T-026 — Documentação e Release
 * Testes de red phase: verificam a existência e conteúdo das seções obrigatórias
 * nos arquivos de documentação do projeto.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = join(import.meta.dirname, '..');

describe('README.md', () => {
  const readmePath = join(ROOT, 'README.md');

  it('deve existir', () => {
    expect(existsSync(readmePath)).toBe(true);
  });

  it('deve conter seção ## Installation', () => {
    const content = readFileSync(readmePath, 'utf-8');
    expect(content).toMatch(/^## Installation/m);
  });

  it('deve conter seção ## Quick Start', () => {
    const content = readFileSync(readmePath, 'utf-8');
    expect(content).toMatch(/^## Quick Start/m);
  });

  it('deve conter seção ## API Reference', () => {
    const content = readFileSync(readmePath, 'utf-8');
    expect(content).toMatch(/^## API Reference/m);
  });

  it('deve conter seção ## Browser Support', () => {
    const content = readFileSync(readmePath, 'utf-8');
    expect(content).toMatch(/^## Browser Support/m);
  });

  it('deve conter exemplos para React', () => {
    const content = readFileSync(readmePath, 'utf-8');
    expect(content).toMatch(/useCMC7Reader|react/i);
  });

  it('deve conter exemplos para Vue', () => {
    const content = readFileSync(readmePath, 'utf-8');
    expect(content).toMatch(/useCMC7Reader|vue/i);
  });

  it('deve conter exemplo para vanilla JS', () => {
    const content = readFileSync(readmePath, 'utf-8');
    expect(content).toMatch(/createCMC7Reader/);
  });
});

describe('CHANGELOG.md', () => {
  const changelogPath = join(ROOT, 'CHANGELOG.md');

  it('deve existir', () => {
    expect(existsSync(changelogPath)).toBe(true);
  });

  it('deve conter entrada para v1.0.0', () => {
    const content = readFileSync(changelogPath, 'utf-8');
    expect(content).toMatch(/1\.0\.0/);
  });
});

describe('LICENSE', () => {
  const licensePath = join(ROOT, 'LICENSE');

  it('deve existir', () => {
    expect(existsSync(licensePath)).toBe(true);
  });

  it('deve ser MIT', () => {
    const content = readFileSync(licensePath, 'utf-8');
    expect(content).toMatch(/MIT License/);
  });

  it('deve conter o ano correto (2026)', () => {
    const content = readFileSync(licensePath, 'utf-8');
    expect(content).toMatch(/2026/);
  });

  it('deve conter o autor', () => {
    const content = readFileSync(licensePath, 'utf-8');
    expect(content).toMatch(/Fábio Ferreccio|Fabio Ferreccio/);
  });
});
