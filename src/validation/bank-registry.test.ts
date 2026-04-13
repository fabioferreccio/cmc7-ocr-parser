import { describe, it, expect, beforeEach } from 'vitest';
import { BankRegistry } from './bank-registry.js';
import type { BankSpec } from '../types/index.js';

describe('BankRegistry', () => {
  let registry: BankRegistry;

  beforeEach(() => {
    registry = new BankRegistry();
  });

  it('deve retornar spec para código "001" (Banco do Brasil)', () => {
    const spec = registry.getSpec('001');
    expect(spec).not.toBeNull();
    expect(spec?.name).toContain('Banco do Brasil');
    expect(spec?.dvAlgorithm).toBeDefined();
  });

  it('deve retornar spec para código "104" (Caixa Econômica Federal)', () => {
    const spec = registry.getSpec('104');
    expect(spec).not.toBeNull();
    expect(spec?.name).toContain('Caixa Econômica Federal');
  });

  it('deve retornar spec para código "237" (Bradesco)', () => {
    const spec = registry.getSpec('237');
    expect(spec).not.toBeNull();
    expect(spec?.name).toContain('Bradesco');
  });

  it('deve retornar spec para código "341" (Itaú)', () => {
    const spec = registry.getSpec('341');
    expect(spec).not.toBeNull();
    expect(spec?.name).toContain('Itaú');
  });

  it('deve retornar spec para código "033" (Santander)', () => {
    const spec = registry.getSpec('033');
    expect(spec).not.toBeNull();
    expect(spec?.name).toContain('Santander');
  });

  it('deve retornar null para código desconhecido (não crashar)', () => {
    const spec = registry.getSpec('999');
    expect(spec).toBeNull();
  });

  it('deve permitir registro de banco customizado via register()', () => {
    const customBank: BankSpec = {
      compeCode: '999',
      name: 'Banco Fictício',
      dvAlgorithm: 'mod10',
      block1Layout: { agencyDigits: 4, accountDigits: 6, checkNumDigits: 6 },
    };

    registry.register(customBank);

    const retrieved = registry.getSpec('999');
    expect(retrieved).toEqual(customBank);
  });

  it('deve sobrescrever spec existente quando register() chamado com mesmo código', () => {
    // Override do Itaú, por exemplo
    const overrideSpec: BankSpec = {
      compeCode: '341',
      name: 'Itaú Override',
      dvAlgorithm: 'mod11',
      block1Layout: { agencyDigits: 5, accountDigits: 7, checkNumDigits: 6 },
    };

    registry.register(overrideSpec);

    const retrieved = registry.getSpec('341');
    expect(retrieved?.name).toBe('Itaú Override');
    expect(retrieved?.dvAlgorithm).toBe('mod11');
  });
});
