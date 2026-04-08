# Progresso de Implementação

> **Projeto:** `cmc7-ocr-parser`  
> **Repositório:** cmc7-ocr-parser

---

## Status Geral

- **Última atualização:** 2026-04-08
- **Milestone atual:** 0 — Scaffolding
- **Tasks concluídas:** 0 / 25
- **Tasks em progresso:** 0

---

## Histórico de Ações

| Data | Task ID | Ação | Resultado | Arquivos Afetados |
|------|---------|------|-----------|-------------------|
| 2026-04-08 | scaffolding | Criação da estrutura completa do projeto | ✅ Completo | package.json, tsconfig.json, tsup.config.ts, vitest.config.ts, .eslintrc.json, .prettierrc.json, commitlint.config.json, src/**, .github/workflows/ci.yml |

---

## Tasks Concluídas

*(nenhuma ainda — scaffolding não é task do task breakdown)*

---

## Próxima Task

**T-001 — Audit de Licença da Fonte CMC-7 TTF**  
Milestone 1 — PoC de Risco  
Criar `audit/font-audit-report.md` com resultado de auditoria de fontes CMC-7 TTF candidatas.

---

## Premissas Provisórias Pendentes de Validação

| ID | Premissa | Validada por | Status |
|----|----------|-------------|--------|
| RP-01 | OpenCV.js build customizada ≤ 4 MB | T-003 | ⏳ Pendente |
| RP-02 | Single-thread WASM sem headers CORP/COOP | T-003 | ⏳ Pendente |
| RP-03 | Template matching ≥ 95% acurácia | T-002 | ⏳ Pendente |
| RP-04 | Templates TTF redistribuíveis como Uint8Array | T-001 | ⏳ Pendente |
| RP-05 | onnxruntime-web ≤ 200ms em mobile mid-range | T-014 | ⏳ Pendente |
| RP-06 | FEBRABAN specs dos 5 maiores bancos acessíveis | T-016 | ⏳ Pendente |

---

## Decisões Tomadas Durante Implementação

| Data | Decisão | Contexto | Alternativa Descartada |
|------|---------|----------|----------------------|
| 2026-04-08 | tsup escolhido como build system | Build ESM+CJS+Worker simultâneo | Rollup puro (mais verboso), esbuild (tree-shaking inferior) |
| 2026-04-08 | Vitest com jsdom environment | Testes de DOM/Canvas sem browser real | Jest (sem suporte ESM nativo), karma (overhead) |
| 2026-04-08 | Colocation de testes (junto ao source) | Regra 3.3 do docs/05-regras.md | __tests__/ separado (causa drift) |

---

## Problemas Encontrados

| Data | Task | Problema | Status | Resolução |
|------|------|----------|--------|-----------|
| — | — | — | — | — |

---

*Atualizar este arquivo a cada task concluída ou decisão de implementação relevante.*
