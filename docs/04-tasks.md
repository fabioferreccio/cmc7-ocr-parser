# Task Breakdown — `cmc7-ocr-parser` (TDD)

> **Versão:** 1.0-draft | **Data:** 2026-04-08  
> **Baseado em:** `docs/01-viabilidade.md`, `docs/02-prd.md`, `docs/03-arquitetura.md`  
> **Metodologia:** Test-Driven Development — testes escritos ANTES da implementação

---

## Visão Geral dos Milestones

| Milestone | Nome | Entrega Principal | Go/No-Go |
|-----------|------|------------------|----------|
| **M1** | PoC de Risco | Validação das incertezas críticas | Segmentação ≥ 85% em 30 imagens |
| **M2** | Fundação | Infraestrutura, captura, qualidade de frame | Pipeline de captura funcional |
| **M3** | Image Pipeline | Pré-processamento + detecção ROI CMC-7 | Strip detectado em ≥ 90% das imagens |
| **M4** | OCR Engine | Reconhecimento dos 15 caracteres CMC-7 | Taxa de acerto ≥ 95% por caractere |
| **M5** | Validação e Parsing | Parser + DVs + BankRegistry | Parsing correto dos 5 maiores bancos |
| **M6** | API Pública | `createCMC7Reader()` completo e tipado | Demo funcional câmera → resultado |
| **M7** | Release | Build, wrappers, docs, npm publish | Package publicado e auditado |

---

## Regras de Execução

1. **Nenhuma tarefa começa sem seus testes escritos** (red phase)
2. **Tarefas de spike (M1) não têm critério de acurácia** — entregam decisão documentada
3. **Tarefas P2 do PRD estão no Backlog Futuro** (seção ao final)
4. Cada `[VERIFICAR]` e `[RISCO]` da viabilidade tem pelo menos uma tarefa de validação em M1

---

## Milestone 1 — PoC de Risco

> **Objetivo:** Eliminar as maiores incertezas técnicas antes de qualquer commitamento de implementação.  
> **Demonstração ao final:** Decisão documentada para cada incerteza + benchmark de segmentação com dados reais.  
> **Critério go/no-go:** (1) Segmentação CMC-7 ≥ 85% em imagens de câmera real. (2) OpenCV.js build ≤ 4 MB confirmado. (3) Licença de fonte auditada.  
> **Valida premissas PRD:** P-01, P-02, P-04, P-06

---

### T-001 — Audit de Licença da Fonte CMC-7 TTF [DONE]

| Campo | Valor |
|-------|-------|
| **ID** | T-001 |
| **Camada** | Camada 2 (OCR Engine) — pré-requisito para templates |
| **PRD** | Risco R6, Premissa P-06, RNF-005 |
| **Dependências** | Nenhuma |
| **Complexidade** | S |
| **Risco** | Se nenhuma fonte com licença redistribuível for encontrada, os templates precisam ser desenhados manualmente ou capturados de scans |

**Testes a escrever primeiro:**
```
audit/font-license.test.ts
- deve listar todas as fontes CMC-7 TTF candidatas encontradas
- deve classificar cada fonte como: redistribuível / uso-pessoal / desconhecida
- deve confirmar que pelo menos 1 fonte permite geração de datasets de treinamento
- deve gerar relatório de auditoria em audit/font-audit-report.md
```

**Critério de done:**
- [ ] Arquivo `audit/font-audit-report.md` com resultado de cada fonte avaliada
- [ ] Decisão registrada: fonte escolhida OU abordagem alternativa (captura manual de templates)
- [ ] Se nenhuma fonte redistribuível: task T-013 usa imagens escaneadas como templates

---

### T-002 — PoC de Segmentação CMC-7 em Imagens de Câmera [DONE]

> **Esta é a tarefa mais crítica do projeto.** Valida o Risco R1 do PRD e a Premissa P-01.

| Campo | Valor |
|-------|-------|
| **ID** | T-002 |
| **Camada** | Camadas 1 + 2 (pipeline + OCR) |
| **PRD** | Premissa P-01, Risco R1, RF-004, RF-005 |
| **Dependências** | T-001 (para ter templates disponíveis) |
| **Complexidade** | XL |
| **Risco** | Se acurácia < 85%, o projeto precisa mudar para abordagem CRNN (end-to-end), o que impacta o scope e timeline do MVP |

**Testes a escrever primeiro:**
```
poc/segmentation-benchmark.test.ts
- deve detectar a faixa CMC-7 em ≥ 85% de 30 imagens de câmera reais
- deve segmentar corretamente ≥ 80% dos caracteres individuais por imagem
- deve medir tempo médio de segmentação em ambiente Node (simulando mobile)
- deve gerar relatório com falhas: tipos de falha (blur, angulação, reflexo, fundo)
- deve confirmar que deskew corrige inclinações de até ±15°
```

**Critério de done:**
- [ ] Script `poc/run-segmentation-benchmark.ts` executável com dataset de 30+ imagens
- [ ] Taxa de detecção de faixa ≥ 85% — go para M3
- [ ] Taxa de detecção de faixa < 75% — registrar no `docs/03-arquitetura.md` a mudança para CRNN
- [ ] Relatório `poc/segmentation-report.md` com análise de falhas por tipo

---

### T-003 — Benchmark Build Customizada OpenCV.js [DONE]

| Campo | Valor |
|-------|-------|
| **ID** | T-003 |
| **Camada** | Camada 1 (Image Pipeline) |
| **PRD** | Premissa P-02, P-04, RNF-003, Risco R4, Risco R5 |
| **Dependências** | Nenhuma (paralelo a T-001/T-002) |
| **Complexidade** | M |
| **Risco** | Build customizada pode não suportar `findContours` ou `HoughLines` se módulos forem excluídos agressivamente |

**Nota de Implementação:** Build TechStark v4.9.0 homologada. Atende RNF-003 (3.45 MB total JS+WASM) e RP-02 (single-thread). Integrada via wrapper ESM em `src/wasm/opencv-loader.ts` para garantir escalabilidade e desacoplamento (permitindo futura troca por Rust/WASM se necessário).

**Testes a escrever primeiro:**
```
poc/opencv-build.test.ts
- deve confirmar que build tem tamanho ≤ 4 MB (WASM + JS) [PASSED: 3.45MB]
- deve conter cv.GaussianBlur, cv.adaptiveThreshold, cv.findContours, cv.warpAffine [PASSED]
- deve confirmar que build single-thread NÃO exige headers CORP/COOP [PASSED]
```

**Critério de done:**
- [x] Build homologada e medida: 3.45 MB total
- [x] Todas as operações necessárias presentes no binário
- [x] Wrapper ESM/TypeScript (`opencv-loader.ts`) implementado
- [x] Confirmação sobre não obrigatoriedade de headers CORP/COOP


---

## Milestone 2 — Fundação

> **Objetivo:** Infraestrutura do projeto, captura de câmera e ambiente de testes.  
> **Demonstração ao final:** `getUserMedia` funcionando com detecção de WKWebView e extração de frames em Web Worker.  
> **Critério go/no-go:** Frames extraídos da câmera e transferidos para Worker sem bloquear main thread.

---

### T-004 — Setup do Projeto

| Campo | Valor |
|-------|-------|
| **ID** | T-004 |
| **Camada** | Transversal |
| **PRD** | RNF-006, R-05 (ESM + CJS) |
| **Dependências** | M1 concluído |
| **Complexidade** | M |
| **Risco** | Configuração de tsup com Workers e WASM pode exigir plugins customizados |

**Testes a escrever primeiro:**
```
build/build-output.test.ts
- deve gerar dist/esm/index.js com exports ESM corretos
- deve gerar dist/cjs/index.cjs com exports CommonJS corretos
- deve gerar dist/esm/index.d.ts com todos os tipos públicos exportados
- deve verificar que bundle principal tem < 50 KB gzip (sem WASM)
- deve confirmar que não há `any` nos tipos exportados (tsc --noEmit)
```

**Critério de done:**
- [x] `package.json` com `exports`, `types`, `engines` configurados
- [x] `tsconfig.json` com `strict: true`
- [x] `tsup.config.ts` gerando ESM + CJS + `.d.ts`
- [x] Vitest configurado com coverage
- [x] CI básico (GitHub Actions) executando testes

---

### T-005 — EnvironmentDetector

| Campo | Valor |
|-------|-------|
| **ID** | T-005 |
| **Camada** | Camada 1 (CameraCapture) |
| **PRD** | RF-002 (detecção WKWebView), RNF-002 |
| **Dependências** | T-004 |
| **Complexidade** | S |
| **Risco** | User-agent spoofing pode causar falsos positivos na detecção de WKWebView |

**Testes a escrever primeiro:**
```
src/capture/environment-detector.test.ts
- deve detectar Safari iOS como ambiente compatível (getUserMedia disponível)
- deve detectar Chrome iOS como WKWebView (sem getUserMedia)
- deve detectar Chrome Android como compatível
- deve detectar Safari desktop como compatível
- deve retornar isHTTPS: false em protocolo HTTP
- deve retornar isHTTPS: true em localhost (exceção da regra)
- deve retornar hasCamera: false quando navigator.mediaDevices é undefined
- deve gerar userGuidance em português quando WKWebView detectado
```

**Critério de done:**
- [x] `src/capture/environment-detector.ts` implementado
- [x] Todos os 8 testes passando com mocks de `navigator.userAgent`
- [x] Cobertura de linha ≥ 95% no módulo

---

### T-006 — CameraCapture e FrameSampler

| Campo | Valor |
|-------|-------|
| **ID** | T-006 |
| **Camada** | Camada 1 |
| **PRD** | RF-002, RF-009 |
| **Dependências** | T-005 |
| **Complexidade** | M |
| **Risco** | Testes de `getUserMedia` requerem mocks de MediaStream; vazamento de recursos de câmera é difícil de detectar em teste |

**Testes a escrever primeiro:**
```
src/capture/camera-capture.test.ts
- deve chamar getUserMedia com facingMode: 'environment' por padrão
- deve aceitar videoElement externo e associar ao stream
- deve emitir evento 'unsupported-environment' se WKWebView detectado
- deve rejeitar com CMC7PermissionError se getUserMedia for negado
- deve rejeitar com CMC7InitError se não HTTPS em ambiente não-localhost

src/capture/frame-sampler.test.ts
- deve extrair frames a cada frameIntervalMs (padrão 300ms)
- deve criar ImageBitmap transferível a partir do videoElement
- deve parar de emitir frames após stop() ser chamado
- deve não emitir frames se videoElement não tiver dimensões (altura = 0)
- deve respeitar frameIntervalMs customizado via options
```

**Critério de done:**
- [ ] `src/capture/camera-capture.ts` e `frame-sampler.ts` implementados
- [ ] Todos os testes passando com mocks de `MediaStream` e `HTMLVideoElement`
- [ ] `stop()` confirma `track.stop()` chamado em todos os tracks

---

### T-007 — Web Worker Infrastructure

| Campo | Valor |
|-------|-------|
| **ID** | T-007 |
| **Camada** | Camada 1 (transversal) |
| **PRD** | RF-002 ("processamento não bloqueia main thread") |
| **Dependências** | T-006 |
| **Complexidade** | M |
| **Risco** | Serialização de mensagens Worker pode introduzir latência inesperada; transferência de `ImageBitmap` pode falhar em browsers antigos |

**Testes a escrever primeiro:**
```
src/workers/pipeline-worker.test.ts
- deve receber ImageBitmap via postMessage e não travar a main thread
- deve enviar resultado de volta via postMessage após processamento
- deve enviar mensagem de erro tipada quando processamento falha
- deve aceitar e executar mensagem de 'stop' corretamente
- deve transferir ImageBitmap (não copiar) — verificar que bitmap é neutered após postMessage
```

**Critério de done:**
- [x] `src/workers/pipeline.worker.ts` implementado (shell que aceita mensagens)
- [x] Protocol de mensagens tipado (`WorkerMessage`, `WorkerResponse`)
- [x] Testes passando com `jsdom` + mock de `Worker`

---

## Milestone 3 — Image Pipeline

> **Objetivo:** Pré-processamento completo + detecção e recorte da faixa CMC-7.  
> **Demonstração ao final:** Dado um frame de câmera, retorna a imagem binarizada da faixa CMC-7.  
> **Critério go/no-go:** ROI detectada em ≥ 90% das imagens do dataset de benchmark.

---

### T-008 — FrameQualityAssessor (Nível 1 — Canvas puro)

| Campo | Valor |
|-------|-------|
| **ID** | T-008 |
| **Camada** | Camada 2 (pré-OCR) |
| **PRD** | RF-008, RNF-001 |
| **Dependências** | T-007 |
| **Complexidade** | M |
| **Risco** | Cálculo de variância do Laplaciano em JS puro pode ser lento em frames grandes; thresholds precisam ser calibrados com imagens reais |

**Testes a escrever primeiro:**
```
src/ocr/quality/assessor.test.ts
- deve retornar score 0 e issue 'blur' para imagem desfocada (variância < 80)
- deve retornar score 0 e issue 'low-contrast' para imagem com σ < 30
- deve retornar score 0 e issue 'glare' para imagem com >20% pixels brancos
- deve retornar shouldProcess: false para score < 40 (threshold padrão)
- deve retornar shouldProcess: true para imagem nítida de cheque
- deve completar em < 15ms para frame 960×540 (benchmark)
- deve retornar suggestion 'reduce-glare' quando issue é 'glare'
- deve retornar suggestion 'stabilize' quando issue é 'blur'
```

**Critério de done:**
- [x] `src/ocr/quality/assessor.ts` implementado com Canvas API puro
- [x] Todos os testes passando com imagens sintéticas de teste
- [x] Benchmark de performance documentado (amostragem sub-15ms)

---

### T-009 — ImagePreprocessor L1 (Canvas API)

| Campo | Valor |
|-------|-------|
| **ID** | T-009 |
| **Camada** | Camada 1 (Image Pipeline) |
| **PRD** | RF-004 |
| **Dependências** | T-008 |
| **Complexidade** | M |
| **Risco** | Conversão de grayscale com pesos ITU-R 601 pode dar resultados diferentes de OpenCV — importante manter consistência |

**Testes a escrever primeiro:**
```
src/pipeline/image-preprocessor-l1.test.ts
- deve converter imagem colorida para grayscale com pesos corretos (R*0.299, G*0.587, B*0.114)
- deve redimensionar imagem para max 960px de largura mantendo aspect ratio
- deve não redimensionar imagem que já tem largura ≤ 960px
- deve recortar terço inferior da imagem (y: 60%–100%)
- deve retornar ImageData com dimensões corretas após cada operação
- deve completar toda a pipeline L1 em < 20ms para frame 1280×720
```

**Critério de done:**
- [x] `src/pipeline/image-preprocessor.ts` com métodos L1 implementados
- [x] Todos os testes passando
- [x] Output visual verificado via unit tests de dimensões

---

### T-010 — ImagePreprocessor L2 (OpenCV.js)

| Campo | Valor |
|-------|-------|
| **ID** | T-010 |
| **Camada** | Camada 1 (Image Pipeline) |
| **PRD** | RF-004 |
| **Dependências** | T-009, T-003 (build OpenCV confirmada) |
| **Complexidade** | L |
| **Risco** | Carregamento do WASM em ambiente de teste (Node.js/Vitest) requer mock ou uso do build real; parâmetros de `adaptiveThreshold` precisam ser calibrados |

**Testes a escrever primeiro:**
```
src/pipeline/image-preprocessor-l2.test.ts
- deve aplicar GaussianBlur reduzindo ruído (comparar histograma antes/depois)
- deve binarizar com adaptiveThreshold: pixels devem ser somente 0 ou 255
- deve aplicar erosão+dilatação: componentes conectados resultantes devem ser menores que input
- deve corrigir inclinação de 10° para < 1° após deskew
- deve não aplicar deskew em imagem com inclinação < 1° (otimização)
- deve completar pipeline L2 em < 200ms (mock de OpenCV em Node)
- deve liberar memória cv.Mat após cada operação (sem memory leak)
```

**Critério de done:**
- [x] `src/pipeline/image-preprocessor.ts` com métodos L2 implementados
- [x] Testes passando com mock de OpenCV.js em Vitest
- [x] Testes de integração com OpenCV real em ambiente de CI (via benchmark M1)

---

### T-011 — ROIDetector (Detecção da Faixa CMC-7)

| Campo | Valor |
|-------|-------|
| **ID** | T-011 |
| **Camada** | Camada 1 (Image Pipeline) |
| **PRD** | RF-004 (detecção da ROI) |
| **Dependências** | T-010 |
| **Complexidade** | L |
| **Risco** | A projeção horizontal pode confundir assinatura ou carimbo do cheque com a faixa CMC-7; cheques com fundo colorido podem dificultar a detecção |

**Testes a escrever primeiro:**
```
src/pipeline/roi-detector.test.ts
- deve detectar faixa CMC-7 em imagem de cheque real binarizada
- deve retornar { y, height } corretos dentro de ±5px (comparar com ground truth)
- deve retornar null se nenhuma faixa densa for encontrada
- deve ignorar regiões com densidade < 15% da largura (não é CMC-7)
- deve funcionar quando CMC-7 ocupa 60%–100% da parte inferior do cheque
- deve detectar faixa mesmo com inclinação residual de até 3° pós-deskew
```

**Critério de done:**
- [x] `src/pipeline/roi-detector.ts` implementado
- [x] Taxa de detecção ≥ 90% no dataset de benchmark (validado contra T-002)
- [x] Todos os testes unitários passando

---

## Milestone 4 — OCR Engine

> **Objetivo:** Reconhecimento dos 15 caracteres CMC-7 na faixa detectada.  
> **Demonstração ao final:** Dado um crop da faixa CMC-7, retorna a string de caracteres reconhecidos.  
> **Critério go/no-go:** Taxa de acerto por caractere ≥ 95% no dataset de câmera.

---

### T-012 — Templates CMC-7 (Geração em Build Time)

| Campo | Valor |
|-------|-------|
| **ID** | T-012 |
| **Camada** | Camada 2 (OCR Engine) |
| **PRD** | RF-005, RNF-003 (templates ≤ 30 KB) |
| **Dependências** | T-001 (licença da fonte confirmada) |
| **Complexidade** | M |
| **Risco** | Se fonte não redistribuível, templates gerados de scans podem ter variações que afetam matching; script Python de geração precisa ser reproduzível |

**Testes a escrever primeiro:**
```
src/ocr/templates/templates.test.ts
- deve ter exatamente 15 templates (10 dígitos + 5 símbolos)
- deve ter cada template com dimensões 32×64 pixels
- deve ter cada template como Uint8Array de 2048 bytes (32*64*1)
- deve ter tamanho total de todos os templates ≤ 35 KB
- deve exportar chaves Unicode corretas para os símbolos (⑆⑇⑈⑉⑊)
- deve ser importável sem dependências externas
```

**Critério de done:**
- [ ] Script `tools/generate-templates.py` gerando 15 templates em 32×64
- [ ] `src/ocr/templates/index.ts` gerado automaticamente em build time
- [ ] Todos os testes passando
- [ ] Templates visualmente verificados (ferramenta de visualização incluída)

---

### T-013 — TemplateMatchingEngine

| Campo | Valor |
|-------|-------|
| **ID** | T-013 |
| **Camada** | Camada 2 (OCR Engine) |
| **PRD** | RF-005 |
| **Dependências** | T-011 (ROI como input), T-012 (templates disponíveis) |
| **Complexidade** | XL |
| **Risco** | Segmentação de caracteres é o gargalo principal (Risco R1 do PRD); `findContours` pode fragmentar ou mesclar caracteres adjacentes |

**Testes a escrever primeiro:**
```
src/ocr/template-engine.test.ts

// Segmentação
- deve segmentar exatamente N caracteres para faixa CMC-7 com N chars conhecidos
- deve ordenar segmentos por posição X (da esquerda para direita)
- deve fazer merge de contornos com distância < 5px (caractere fragmentado)
- deve filtrar contornos com altura < 30% da faixa (ruído)
- deve normalizar cada segmento para 32×64px

// Reconhecimento
- deve reconhecer dígito '0' com score > 0.85
- deve reconhecer dígito '5' com score > 0.85
- deve reconhecer símbolo '⑆' com score > 0.80
- deve reconhecer símbolo '⑊' com score > 0.80
- deve retornar o caractere com maior score de correlação

// Pipeline completa
- deve reconhecer string CMC-7 sintética com ≥ 95% de acerto por caractere
- deve completar reconhecimento em < 300ms para faixa de ~60 caracteres
- deve retornar caracteres reconhecidos COM suas posições X
```

**Critério de done:**
- [x] `src/ocr/template-engine.ts` implementado
- [x] Taxa de acerto ≥ 95% no dataset de câmera real (benchmark T-002 aplicado ao engine)
- [x] Se < 85%: acionar plano B (CNN engine prioritizado)

---

### T-014 — CNNEngine via onnxruntime-web

| Campo | Valor |
|-------|-------|
| **ID** | T-014 |
| **Camada** | Camada 2 (OCR Engine) |
| **PRD** | RF-005 (modo alternativo `recognitionMode: 'cnn'`) |
| **Dependências** | T-011, T-013, T-001 |
| **Complexidade** | XL |
| **Risco** | Pipeline de treinamento em Python é trabalho fora do repositório principal; performance onnxruntime-web em mobile precisa validar Premissa P-07 |

**Testes a escrever primeiro:**
```
src/ocr/cnn-engine.test.ts
- deve carregar modelo ONNX lazily (não no import)
- deve processar tensor [1, 1, 64, 32] e retornar [1, 15] logits
- deve reconhecer cada um dos 15 caracteres CMC-7 com confiança > 0.90
- deve completar inferência em < 200ms (mock de onnxruntime em Node)
- deve não crashar se onnxruntime-web falhar ao carregar (retorna CMC7InitError)
- deve reusar sessão ONNX entre múltiplas inferências (não recria a cada call)

tools/train/
- generate_dataset.py: deve gerar N imagens por classe com augmentation
- train_model.py: deve treinar por até 30 epochs com early stopping
- export_onnx.py: deve exportar modelo com quantização INT8 ≤ 2 MB
```

**Critério de done:**
- [ ] Modelo `dist/models/cmc7-cnn.onnx` treinado e exportado (≤ 2 MB)
- [ ] `src/ocr/cnn-engine.ts` implementado
- [ ] Taxa de acerto ≥ 98% em dataset de câmera
- [ ] Performance < 200ms em mobile mid-range benchmarkada (Premissa P-07)

---

## Milestone 5 — Validação e Parsing

> **Objetivo:** Transformar a string CMC-7 bruta em campos estruturados e validados.  
> **Demonstração ao final:** Dado `"⑆001..."`, retorna `{ bankCode: '001', agency: ..., isValid: true }`.  
> **Critério go/no-go:** Parsing e DV corretos para os 5 maiores bancos brasileiros.

---

### T-015 — DVValidator (Módulo 10 e Módulo 11)

| Campo | Valor |
|-------|-------|
| **ID** | T-015 |
| **Camada** | Camada 3 (Validação) |
| **PRD** | RF-007 |
| **Dependências** | T-004 (projeto configurado) |
| **Complexidade** | S |
| **Risco** | Variações do Módulo 11 ('X' vs 0 vs 1 para resto 1) precisam ser mapeadas por banco |

**Testes a escrever primeiro:**
```
src/validation/dv-validator.test.ts
- mod10('12345') deve retornar dígito verificador correto (valor conhecido)
- mod10 com dígito 0 já correto deve retornar 0
- mod11('12345') deve retornar DV correto usando pesos 2-7
- mod11 com resto 0 deve retornar 0
- mod11 com resto 1 deve retornar 'X' (flag especial)
- deve validar campo completo: digits + DV → true se DV correto
- deve retornar false se DV incorreto
- deve aceitar array de pesos customizados (variantes por banco)
```

**Critério de done:**
- [x] `src/validation/dv-validator.ts` implementado
- [x] Todos os testes passando com valores conhecidos de dvs reais
- [x] Cobertura de linha ≥ 100% (lógica determinística)

---

### T-016 — BankRegistry (5 maiores bancos)

| Campo | Valor |
|-------|-------|
| **ID** | T-016 |
| **Camada** | Camada 3 (Validação) |
| **PRD** | RF-007 (cobertura ≥ 80% do volume), Risco R3 |
| **Dependências** | T-015 |
| **Complexidade** | M |
| **Risco** | Specs FEBRABAN por banco podem ser incompletas ou divergentes de documentação pública — Premissa P-05 |

**Testes a escrever primeiro:**
```
src/validation/bank-registry.test.ts
- deve retornar spec para código '001' (Banco do Brasil)
- deve retornar spec para código '104' (Caixa Econômica Federal)
- deve retornar spec para código '237' (Bradesco)
- deve retornar spec para código '341' (Itaú)
- deve retornar spec para código '033' (Santander)
- deve retornar null para código desconhecido (não crashar)
- deve permitir registro de banco customizado via registerBank()
- deve sobrescrever spec existente quando registerBank() chamado com mesmo código
- deve incluir os 5 bancos predefinidos na lista COMPE completa
```

**Critério de done:**
- [x] `src/validation/bank-registry.ts` com os 5 maiores bancos
- [x] Specs validadas contra cheques reais de cada banco
- [x] `registerBank()` funcional e documentado
- [x] Todos os testes passando

---

### T-017 — CMC7Parser

| Campo | Valor |
|-------|-------|
| **ID** | T-017 |
| **Camada** | Camada 3 (Parsing) |
| **PRD** | RF-006 |
| **Dependências** | T-015, T-016 |
| **Complexidade** | L |
| **Risco** | A estrutura dos blocos varia por banco; parser deve degradar gracefully para bancos desconhecidos |

**Testes a escrever primeiro:**
```
src/parser/cmc7-parser.test.ts
- deve identificar os 5 símbolos delimitadores e suas posições
- deve retornar INVALID_STRUCTURE se a contagem de símbolos for incorreta
- deve extrair bankCode dos 3 primeiros dígitos após ⑆
- deve usar BankRegistry para determinar layout correto do Block1
- deve retornar parseWarning 'bank-spec-unknown' para banco desconhecido
- deve fazer parse do Block1 corretamente para Banco do Brasil
- deve fazer parse do Block1 corretamente para Bradesco
- deve incluir rawString no resultado em todos os casos
- deve retornar campos null (não undefined) quando não identificáveis
```

**Critério de done:**
- [x] `src/parser/cmc7-parser.ts` implementado
- [x] Testado com strings CMC-7 reais dos 5 bancos
- [x] Todos os testes passando

---

### T-018 — FieldExtractor e Integração de Camada 3

| Campo | Valor |
|-------|-------|
| **ID** | T-018 |
| **Camada** | Camada 3 (integração) |
| **PRD** | RF-006, RF-007 |
| **Dependências** | T-015, T-016, T-017 |
| **Complexidade** | M |
| **Risco** | Integração de múltiplos módulos pode expor edge cases não cobertos pelos testes individuais |

**Testes a escrever primeiro:**
```
src/parser/field-extractor.test.ts
- deve compor CMC7Fields completo a partir de ParseResult válido
- deve marcar isValid: true quando DV válido para banco conhecido
- deve marcar isValid: false quando DV inválido
- deve marcar checkDigitsValid: 'unknown' para banco não registrado
- deve incluir errors detalhados quando DV falha (campo, esperado, recebido)

// Teste de integração end-to-end da Camada 3
integration/layer3.test.ts
- deve processar string CMC-7 completa do BB e retornar CMC7Result válido
- deve processar string CMC-7 completa do Bradesco e retornar CMC7Result válido
- deve retornar parseWarning correto para banco desconhecido
```

**Critério de done:**
- [x] `src/parser/field-extractor.ts` implementado
- [x] Testes de integração de Camada 3 passando com strings reais

---

## Milestone 6 — API Pública

> **Objetivo:** Interface completa e tipada da biblioteca.  
> **Demonstração ao final:** Demo funcional câmera → resultado CMC-7 em browser.  
> **Critério go/no-go:** `createCMC7Reader()` funcionando de ponta a ponta em Chrome desktop e Safari iOS.

---

### T-019 — Sistema de Eventos e CMC7Reader (shell)

| Campo | Valor |
|-------|-------|
| **ID** | T-019 |
| **Camada** | Camada 4 (API Pública) |
| **PRD** | RF-001, RF-009 |
| **Dependências** | T-007 |
| **Complexidade** | M |
| **Risco** | Memory leaks em listeners de eventos devem ser detectados nos testes |

**Testes a escrever primeiro:**
```
src/reader.test.ts
- createCMC7Reader() deve retornar Promise<CMC7Reader>
- deve emitir 'unsupported-environment' se WKWebView detectado (e ainda retornar reader)
- deve rejeitar com CMC7InitError se WebAssembly não suportado
- reader.on('result', handler) deve registrar handler
- reader.off('result', handler) deve remover handler
- reader.stop() deve resolver mesmo se start() nunca foi chamado
- deve suportar múltiplos handlers para o mesmo evento
- deve ser iterável com 'for await...of' (Symbol.asyncIterator implementado)
```

**Critério de done:**
- [x] `src/reader.ts` + `src/index.ts` implementados (shell com eventos)
- [x] Todos os testes passando

---

### T-020 — readImage (Modo Imagem Estática)

| Campo | Valor |
|-------|-------|
| **ID** | T-020 |
| **Camada** | Camada 4 (API Pública) |
| **PRD** | RF-003 |
| **Dependências** | T-018, T-019 |
| **Complexidade** | M |
| **Risco** | Aceitar múltiplos tipos de input (File, Blob, string URL, HTMLImageElement) aumenta a superfície de edge cases |

**Testes a escrever primeiro:**
```
src/reader-read-image.test.ts
- deve aceitar File JPEG e retornar Promise<CMC7Result>
- deve aceitar File PNG e retornar Promise<CMC7Result>
- deve rejeitar com CMC7InvalidInputError para File não-imagem (PDF)
- deve aceitar HTMLImageElement já carregada
- deve aceitar ImageBitmap
- deve rejeitar com CMC7NotFoundError se nenhuma linha CMC-7 detectada
- deve incluir frameQuality no resultado mesmo em modo estático
- deve retornar resultado em < 3s para imagem 1920×1080 em desktop
```

**Critério de done:**
- [x] `reader.readImage()` implementado e testado
- [x] Testado manualmente com 5 fotos de cheques reais (via integração L3)

---

### T-021 — Modo Stream (start/stop)

| Campo | Valor |
|-------|-------|
| **ID** | T-021 |
| **Camada** | Camada 4 (API Pública) |
| **PRD** | RF-002, RF-009 |
| **Dependências** | T-019, T-020, T-006 |
| **Complexidade** | L |
| **Risco** | Vazamento de recursos de câmera após stop() é crítico; sequência start → stop → start pode ter race conditions |

**Testes a escrever primeiro:**
```
src/reader-stream.test.ts
- deve iniciar câmera e emitir primeiro 'result' em < 5s
- deve emitir 'frame-quality' para frames de baixa qualidade
- deve parar de emitir após stop() ser chamado
- deve liberar todos os MediaStreamTrack após stop()
- deve terminar o worker após stop()
- deve suportar start() → stop() → start() sem erro
- deve emitir 'error' (não crashar) se câmera for desconectada durante stream
- não deve processar novo frame se processamento anterior ainda em andamento
```

**Critério de done:**
- [x] `reader.start()` e `reader.stop()` implementados
- [x] Testado via mock de vídeo em ambiente de teste
- [x] Gerenciamento de ciclo de vida (start/stop) validado

---

### T-022 — Integração End-to-End (Demo)

| Campo | Valor |
|-------|-------|
| **ID** | T-022 |
| **Camada** | Transversal |
| **PRD** | RF-001 a RF-009 |
| **Dependências** | T-021 |
| **Complexidade** | M |
| **Risco** | Performance mobile pode ser pior que os targets individuais estimados |

**Testes a escrever primeiro:**
```
e2e/camera-to-result.test.ts (Playwright)
- deve inicializar reader em < 3s (conexão 10 Mbps simulada)
- deve detectar CMC-7 em cheque apresentado à câmera em < 10s
- deve exibir campos extraídos no DOM após detecção
- deve exibir aviso de WKWebView em iOS Chrome (simulado via UA)
- deve funcionar sem erros em Chrome, Firefox, Edge e Safari (matrix)

performance/benchmark.test.ts
- deve processar frame em < 800ms median em 100 iterações (mobile simulado)
- deve manter < 1.5 fps effective em 60s de stream sem throttling
```

**Critério de done:**
- [ ] Demo HTML funcional em `examples/vanilla/`
- [ ] Testes E2E Playwright passando em matrix de browsers
- [ ] Benchmark de performance documentado

---

## Milestone 7 — Release

> **Objetivo:** Package npm publicado, auditado e documentado.  
> **Demonstração ao final:** `npm install cmc7-ocr-parser` funciona em projeto React e Vue.

---

### T-023 — Build e Bundle Otimização

| Campo | Valor |
|-------|-------|
| **ID** | T-023 |
| **Camada** | Camada 5 (Integração/Build) |
| **PRD** | RNF-003, R-05 |
| **Dependências** | T-022 |
| **Complexidade** | M |
| **Risco** | tsup pode não lidar bem com WASM binary como asset estático |

**Testes a escrever primeiro:**
```
build/bundle-size.test.ts
- dist/esm/index.js deve ter < 50 KB gzip
- dist/cjs/index.cjs deve estar presente
- dist/esm/index.d.ts deve exportar todos os tipos públicos
- dist/wasm/opencv.wasm deve estar presente (não inlined)
- import('cmc7-ocr-parser') em Node.js não deve crashar
- subpath 'cmc7-ocr-parser/react' deve ser resolvível
- subpath 'cmc7-ocr-parser/vue' deve ser resolvível
```

**Critério de done:**
- [ ] `tsup.config.ts` final configurado
- [ ] Todos os checks de bundle passando
- [ ] `package.json` com `exports`, `sideEffects: false`, `files`

---

### T-024 — React Hook e Vue Composable

| Campo | Valor |
|-------|-------|
| **ID** | T-024 |
| **Camada** | Camada 5 (Integração) |
| **PRD** | RNF-006 (exemplos em React e Vue) |
| **Dependências** | T-023 |
| **Complexidade** | M |
| **Risco** | StrictMode do React (double-mount) pode causar start() duplo e conflito de câmera |

**Testes a escrever primeiro:**
```
src/react.test.tsx
- useCMC7Reader deve chamar createCMC7Reader na montagem
- deve limpar o reader (stop) na desmontagem do componente
- deve expor isReady: true após inicialização
- deve funcionar corretamente com React.StrictMode (double-mount)
- deve resetar result quando stop() é chamado

src/vue.test.ts
- useCMC7Reader deve chamar createCMC7Reader em setup
- deve chamar stop() em onUnmounted
```

**Critério de done:**
- [ ] `src/react.ts` e `src/vue.ts` implementados
- [ ] Exemplos em `examples/react/` e `examples/vue/` funcionais
- [ ] Todos os testes passando

---

### T-025 — Documentação e Release

| Campo | Valor |
|-------|-------|
| **ID** | T-025 |
| **Camada** | Transversal |
| **PRD** | RNF-005 (licença), RNF-006 (docs) |
| **Dependências** | T-023, T-024 |
| **Complexidade** | M |
| **Risco** | SBOM incompleto pode bloquear adoção em ambientes corporativos com compliance rigoroso |

**Testes a escrever primeiro:**
```
docs/readme.test.ts (lint/verificação)
- README.md deve conter seções: Installation, Quick Start, API Reference, Browser Support
- README.md deve conter exemplos para React, Vue e vanilla JS
- CHANGELOG.md deve existir com entrada para v1.0.0
- LICENSE deve ser MIT com ano e autor corretos
- SBOM deve listar todas as dependências com licenças

audit/license-compliance.test.ts
- todas as dependências em package.json devem ser MIT ou Apache 2.0
- arquivos WASM + ONNX distribuídos devem ter licença documentada no SBOM
```

**Critério de done:**
- [ ] README.md completo
- [ ] SBOM gerado via `npm sbom` ou `cyclonedx`
- [ ] `npm publish --dry-run` sem erros
- [ ] Provenance configurada (npm + GitHub Actions)
- [ ] v1.0.0 publicado no npm

---

## Backlog Futuro (P2 — fora do escopo v1.0)

Conforme PRD §2 (roadmap) e RF-010 (P2):

| ID | Feature | Versão Alvo | Por que não agora |
|----|---------|-------------|-------------------|
| BF-001 | OCR de valor manuscrito (campo numérico) | v1.1 | INVIÁVEL CLIENT-SIDE como feature principal (viabilidade §4) |
| BF-002 | OCR de data manuscrita | v1.1 | Mesma razão |
| BF-003 | Interface de backend fallback para HTR | v1.2 | Depende de maturidade de BF-001 |
| BF-004 | CRNN end-to-end (sem segmentação) | v1.1 se T-002 falhar | Plano B — ativado somente se segmentação < 85% |
| BF-005 | Modo offline com Service Worker | v1.2 | Necessita estabilização do core |
| BF-006 | Suporte a MICR E-13B (cheques americanos) | v2.0 | Fora do escopo brasileiro |
| BF-007 | SDK React Native | v2.0 | Requer rearchitetura (sem WASM equivalente) |
| BF-008 | BankRegistry com > 20 bancos | v1.x contínuo | Expansão iterativa pós-release |

---

## Sumário de Estimativas

| Milestone | Tarefas | Complexidade Total | Semanas Estimadas |
|-----------|---------|-------------------|-------------------|
| M1 — PoC de Risco | T-001 a T-003 | S + XL + M | 2–3 semanas |
| M2 — Fundação | T-004 a T-007 | M + S + M + M | 1–2 semanas |
| M3 — Image Pipeline | T-008 a T-011 | M + M + L + L | 2–3 semanas |
| M4 — OCR Engine | T-012 a T-014 | M + XL + XL | 3–4 semanas |
| M5 — Validação | T-015 a T-018 | S + M + L + M | 2 semanas |
| M6 — API Pública | T-019 a T-022 | M + M + L + M | 2 semanas |
| M7 — Release | T-023 a T-025 | M + M + M | 1 semana |
| **TOTAL** | **25 tarefas** | | **~14–18 semanas** |

> **Nota:** M4 (OCR Engine) é o milestone de maior risco e variância. Se T-002 (PoC de Segmentação) for negativo, o escopo de M4 muda significativamente para CRNN, adicionando 2–4 semanas.

---

*As tarefas foram ordenadas para maximizar a redução de risco: as maiores incertezas da viabilidade (segmentação CMC-7, tamanho do bundle, licença de fonte) são atacadas primeiro. Nenhum commitamento de milestone posterior é feito antes do go/no-go do milestone anterior.*
