# Progresso de Implementação

> **Projeto:** `cmc7-ocr-parser`  
> **Repositório:** cmc7-ocr-parser

---

## Status Geral

- **Última atualização:** 2026-04-10
- **Milestone atual:** 1 — PoC de Risco
- **Tasks concluídas:** 18 / 25
- **Tasks em progresso:** Nenhuma

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
| 2026-04-10 | T-007 | Web Worker Infrastructure | ✅ Sucesso | src/workers/worker-client.ts, src/workers/pipeline.worker.ts |
| 2026-04-10 | T-008 | FrameQualityAssessor (Base) | ✅ Sucesso | src/ocr/quality/assessor.ts, src/ocr/quality/assessor.test.ts |
| 2026-04-10 | T-009 | ImagePreprocessor (Base) | ✅ Sucesso | src/pipeline/image-preprocessor.ts, src/pipeline/image-preprocessor.test.ts |
| 2026-04-10 | T-010 | ImagePreprocessor L2 (OpenCV.js) | ✅ Sucesso | src/pipeline/image-preprocessor.ts, src/pipeline/image-preprocessor-l2.test.ts |
| 2026-04-10 | T-011 | ROIDetector (Detecção de Faixa) | ✅ Sucesso | src/pipeline/roi-detector.ts, src/pipeline/roi-detector.test.ts |
| 2026-04-10 | T-012 | Templates CMC-7 (Geração / Placeholder) | ✅ Sucesso | tools/generate-templates.py, src/ocr/templates/index.ts |
| 2026-04-10 | T-013 | TemplateMatchingEngine Completo | ✅ Sucesso | src/ocr/template-engine.ts, src/ocr/template-engine.test.ts |
| 2026-04-10 | T-015 | DVValidator (Módulo 10 e Módulo 11) | ✅ Sucesso | src/validation/dv-validator.ts, src/validation/dv-validator.test.ts |
| 2026-04-10 | T-016 | BankRegistry (5 maiores bancos) | ✅ Sucesso | src/validation/bank-registry.ts, src/validation/bank-registry.test.ts |
| 2026-04-10 | T-017 | CMC7Parser | ✅ Sucesso | src/parser/cmc7-parser.ts, src/parser/cmc7-parser.test.ts |
| 2026-04-10 | T-018 | FieldExtractor & Integração L3 | ✅ Sucesso | src/parser/field-extractor.ts, src/integration/layer3.test.ts |
| 2026-04-10 | T-019 | Sistema de Eventos & CMC7Reader | ✅ Sucesso | src/reader.ts, src/reader.test.ts |

---

## Tasks Concluídas

- [T-001] Audit de Licença da Fonte CMC-7 TTF
- [T-002] PoC de Segmentação CMC-7 em Imagens de Câmera
- [T-003] Benchmark Build Customizada OpenCV.js
- [T-004] Setup do Projeto e Infraestrutura de Build/Testes
- [T-005] EnvironmentDetector (Safari vs WKWebView)
- [T-006] CameraCapture e FrameSampler
- [T-007] Web Worker Infrastructure
- [T-008] FrameQualityAssessor (Base)
- [T-009] ImagePreprocessor (Base)
- [T-010] ImagePreprocessor L2 (OpenCV.js)
- [T-011] ROIDetector (Detecção de Faixa)
- [T-012] Templates CMC-7 (Geração em Build Time)
- [T-013] TemplateMatchingEngine Completo
- [T-015] DVValidator (Módulo 10 e Módulo 11)
- [T-016] BankRegistry (5 maiores bancos)
- [T-017] CMC7Parser
- [T-018] FieldExtractor e Integração de Camada 3
- [T-019] Sistema de Eventos e CMC7Reader (shell)

---

## Próxima Task

**T-020 — readImage (Modo Imagem Estática)**  
Camada 4 (API Pública)  
Implementar o método `readImage()` integrando Pipeline L1 + L2 + L3 para processar uma imagem estática (Canvas/Blob/File) de ponta a ponta.

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
