import { describe, it, expect } from 'vitest';
import { mod10, mod11, validateField } from './dv-validator.js';

describe('DVValidator - Modulo 10', () => {
  it("mod10('12345') deve retornar dígito verificador correto", () => {
    // 12345
    // Pesos: 2 1 2 1 2
    // Calc: 5*2=10(1+0=1), 4*1=4, 3*2=6, 2*1=2, 1*2=2
    // Soma: 1+4+6+2+2 = 15
    // Mod10: Dezena superior (20) - 15 = 5
    // DV: 5
    expect(mod10('12345')).toBe(5);
  });

  it('mod10 com dígito já exato deve retornar 0', () => {
    // 0000 -> soma 0 -> Mod10(10)-0... usually if sum is multiple of 10, DV is 0
    // let's test a known zero-DV string.
    // 1: 1*2=2. 2: 2*1=2. 3: 3*2=6. Soma: 10. DV: 0
    expect(mod10('123')).toBe(0);
  });
});

describe('DVValidator - Modulo 11', () => {
  it("mod11('12345') deve retornar DV correto usando pesos padrão 2-7", () => {
    // 12345
    // Pesos padrão CMC-7/Boleto: 2, 3, 4, 5, 6, 7 (da direita para a esquerda)
    // Calc: 5*2=10 + 4*3=12 + 3*4=12 + 2*5=10 + 1*6=6
    // Soma: 10 + 12 + 12 + 10 + 6 = 50
    // Resto divisão por 11: 50 % 11 = 6
    // DV: 11 - 6 = 5
    expect(mod11('12345')).toBe(5);
  });

  it('mod11 com resto nulo (DV 11) deve retornar 0', () => {
    // Soma múltiplo de 11 -> resto 0 -> 11-0 = 11 -> regra dita que vira 0
    // Test: 1->1*6=6, 2->2*5=10, 3->3*4=12, 1->1*3=3, 1->1*2=2
    // Soma: 6+10+12+3+2 = 33 % 11 = 0 -> DV = 0
    expect(mod11('12311')).toBe(0);
  });

  it('mod11 com resto 1 (DV 10) deve retornar "X"', () => {
    // Soma cujo resto 11 seja 1 -> 11-1 = 10 -> regra vira 'X' (ou '0'/'1' dependendo do banco)
    // Usaremos 'X' como output por padrao para o modulo 11.
    // Test: Let's create sum 34. 34 % 11 = 1.
    // 1->1*6=6, 2->2*5=10, 3->3*4=12, 2->2*3=6, 0->0
    // Soma = 6+10+12+6 = 34. Resto 1. DV = 'X'.
    expect(mod11('12320')).toBe('X');
  });

  it('deve aceitar array de pesos customizados', () => {
    // Alguns bancos param em peso 9
    const customWeights = [2, 3, 4, 5, 6, 7, 8, 9];
    // 12345678
    // 8*2=16, 7*3=21, 6*4=24, 5*5=25, 4*6=24, 3*7=21, 2*8=16, 1*9=9
    // Soma: 156 % 11 = 2 -> 11 - 2 = 9
    expect(mod11('12345678', customWeights)).toBe(9);
  });
});

describe('DVValidator - validateField', () => {
  it('deve retornar true se campo completo e DV correto (mod10)', () => {
    // 12345 + dv 5
    expect(validateField('123455', 'mod10')).toBe(true);
  });

  it('deve retornar false se DV incorreto (mod10)', () => {
    expect(validateField('123456', 'mod10')).toBe(false);
  });

  it('deve retornar true se campo completo e DV correto (mod11)', () => {
    // 12345 + dv 5
    expect(validateField('123455', 'mod11')).toBe(true);
  });

  it('deve suportar X no mod11', () => {
    expect(validateField('12320X', 'mod11')).toBe(true);
  });
});
