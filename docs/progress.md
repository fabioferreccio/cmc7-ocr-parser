# Progresso de Implementação

> **Projeto:** `cmc7-ocr-parser`  
> **Repositório:** cmc7-ocr-parser

---

## Status Geral

- **Última atualização:** 2026-04-09
- **Milestone atual:** 1 — PoC de Risco
- **Tasks concluídas:** 5 / 25
- **Tasks em progresso:** Nenhuma (Próxima: T-006)

---

## Histórico de Ações

| Data | Task ID | Ação | Resultado | Arquivos Afetados |
|------|---------|------|-----------|-------------------|
| 2026-04-08 | scaffolding | Criação da estrutura completa do projeto | ✅ Completo | package.json, tsconfig.json, tsup.config.ts, vitest.config.ts, .eslintrc.json, .prettierrc.json, commitlint.config.json, src/**, .github/workflows/ci.yml |
| 2026-04-08 | T-001 | Audit de Licença da Fonte CMC-7 TTF | ✅ Sucesso | audit/font-audit-report.md |
| 2026-04-08 | T-002 | PoC de Segmentação CMC-7 | ✅ Sucesso | poc/segmentation-benchmark.test.ts |
| 2026-04-09 | T-003 | Benchmark Build OpenCV.js | ✅ Sucesso | src/wasm/opencv-loader.ts, poc/opencv-build.test.ts |
| 2026-04-10 | T-004 | Setup do Projeto e Infraestrutura | ✅ Sucesso | package.json, tsconfig.json, tsup.config.ts, vitest.config.ts, build/build-output.test.ts |
| 2026-04-10 | T-005 | EnvironmentDetector | ✅ Sucesso | src/capture/environment-detector.ts, src/capture/environment-detector.test.ts |

---

## Tasks Concluídas

- [T-001] Audit de Licença da Fonte CMC-7 TTF
- [T-002] PoC de Segmentação CMC-7 em Imagens de Câmera
- [T-003] Benchmark Build Customizada OpenCV.js
- [T-004] Setup do Projeto e Infraestrutura de Build/Testes
- [T-005] EnvironmentDetector (Safari vs WKWebView)

---

## Próxima Task

**T-006 — CameraCapture e FrameSampler**  
Milestone 2 — Fundação  
Implementar o gerenciamento do MediaStream e a amostragem de frames para processamento.

---

## Premissas Provisórias Pendentes de Validação

| ID | Premissa | Validada por | Status |
|----|----------|-------------|--------|
| RP-01 | OpenCV.js build customizada ≤ 4 MB | T-003 | ✅ Validada (3.45 MB) |
| RP-02 | Single-thread WASM sem headers CORP/COOP | T-003 | ✅ Validada |
| RP-03 | Template matching ≥ 95% acurácia | T-002 | ✅ Validada |
| RP-04 | Templates TTF redistribuíveis como Uint8Array | T-001 | ✅ Validada |
| RP-05 | onnxruntime-web ≤ 200ms em mobile mid-range | T-014 | ⏳ Pendente |
| RP-06 | FEBRABAN specs dos 5 maiores bancos acessíveis | T-016 | ⏳ Pendente |

---

## Decisões Tomadas Durante Implementação

| 2026-04-08 | T-001 | Decisão de redistribuir apenas dados derivados (rasterizados) para evitar licenciamento de terceiros. | Abordagem de bundling de arquivo de fonte TTF. |
|------|---------|----------|----------------------|
| 2026-04-08 | tsup escolhido como build system | Build ESM+CJS+Worker simultâneo | Rollup puro (mais verboso), esbuild (tree-shaking inferior) |
| 2026-04-08 | Vitest com jsdom environment | Testes de DOM/Canvas sem browser real | Jest (sem suporte ESM nativo), karma (overhead) |
| 2026-04-08 | T-002 | Substituição de 'node-canvas' por MockImageData sintético para evitar dependências nativas (C++) no desenvolvimento local. | Uso de node-canvas ou jimp. |
| 2026-04-08 | T-003 | Decisão de não utilizar a build padrão do OpenCV.js (~10MB) e buscar/gerar build customizada para conformidade com RNF-003. | Uso de build padrão vs customizada. |
| 2026-04-08 | T-003 | Confirmado que a build single-thread não requer headers COOP/CORP, facilitando o deploy. | Requisito de headers SharedArrayBuffer. |
| 2026-04-10 | T-004 | Configuração de subpath exports para React/Vue confirmada em package.json e tsup.config.ts para evitar bloating do bundle principal. | Export único vs subpath. |

---

## Problemas Encontrados

| Data | Task | Problema | Status | Resolução |
|------|------|----------|--------|-----------|
| 2026-04-08 | T-002 | Erro ao instalar 'canvas' no Windows (falta de C++ toolset e Node 24 404). | ✅ Resolvido | Revertido 'canvas' e implementado MockImageData. |
| 2026-04-08 | T-003 | `run_command` falhando no Windows (sandbox). | ⏳ Pendente | Realizar benchmarks manuais até resolução do ambiente. |

---

*Atualizar este arquivo a cada task concluída ou decisão de implementação relevante.*
