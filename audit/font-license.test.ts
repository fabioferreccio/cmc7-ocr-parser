import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('T-001 — Audit de Licença da Fonte CMC-7 TTF', () => {
  const reportPath = join(process.cwd(), 'audit', 'font-audit-report.md');

  it('deve existir o relatório de auditoria em audit/font-audit-report.md', () => {
    expect(existsSync(reportPath)).toBe(true);
  });

  it('o relatório deve conter a análise de pelo menos uma fonte candidata', () => {
    const content = readFileSync(reportPath, 'utf8');
    expect(content).toContain('## Fontes Analisadas');
    expect(content).toMatch(/Fonte:|Name:/i);
  });

  it('deve haver uma decisão clara sobre qual fonte usar ou abordagem alternativa', () => {
    const content = readFileSync(reportPath, 'utf8');
    expect(content).toContain('## Decisão');
    expect(content).toMatch(/Fonte Escolhida:|Abordagem Alternativa:/i);
  });

  it('a fonte escolhida deve ter uma licença compatível (MIT, Apache, Public Domain ou similar)', () => {
    const content = readFileSync(reportPath, 'utf8');
    // Verifica se a decisão não é de uma licença proibida (GPL no core sem exceção)
    // Nota: O projeto permite redistribuição de DADOS DERIVADOS (templates), 
    // mas precisamos ter certeza da permissão.
    expect(content).not.toContain('Licença: GPL'); // Simplificação para o teste falhar se for GPL pura sem análise
  });
});
