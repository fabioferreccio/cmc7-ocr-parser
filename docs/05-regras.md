# Regras de Desenvolvimento — `cmc7-ocr-parser`

> **Versão:** 1.0-draft | **Data:** 2026-04-08  
> **Baseado em:** docs/01-viabilidade.md, docs/02-prd.md, docs/03-arquitetura.md, docs/04-tasks.md  
> **Vigência:** Regras marcadas `[PROVISÓRIA]` serão revisadas após Milestone 1

---

## 1. Padrões de Código

---

> **Regra 1.1 — TypeScript strict mode obrigatório**  
> **Origem:** docs/02-prd.md RNF-006; docs/03-arquitetura.md §4.2  
> **Razão:** A API pública exporta tipos usados por consumidores externos. Qualquer `any` infiltrado nos tipos públicos quebra a DX e pode esconder bugs de runtime em checagens de DV que são críticas para correção financeira.

```jsonc
// tsconfig.json — obrigatório
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
  },
}
```

**Proibido na API pública:**

- `any` (use `unknown` + type guard)
- `as Type` sem verificação prévia
- `!` (non-null assertion) sem comentário justificando

---

> **Regra 1.2 — Convenção de nomenclatura**  
> **Origem:** docs/03-arquitetura.md §1–5 (nomes de módulos definidos por camada)  
> **Razão:** A arquitetura define 5 camadas com módulos nomeados explicitamente. Seguir esses nomes evita ambiguidade ao referenciar componentes nos PRs e no código.

| Artefato              | Convenção                    | Exemplo                      |
| --------------------- | ---------------------------- | ---------------------------- |
| Arquivos de módulo    | `kebab-case.ts`              | `dv-validator.ts`            |
| Arquivos de teste     | `kebab-case.test.ts`         | `dv-validator.test.ts`       |
| Classes               | `PascalCase`                 | `TemplateMatchingEngine`     |
| Interfaces (públicas) | `PascalCase` sem prefixo `I` | `CMC7Result`, `CMC7Fields`   |
| Types / Union types   | `PascalCase`                 | `QualityIssue`, `CMC7Error`  |
| Enums                 | `PascalCase`                 | `RecognitionMode`            |
| Funções e métodos     | `camelCase`                  | `detectCMC7Strip()`          |
| Constantes exportadas | `UPPER_SNAKE_CASE`           | `BANK_REGISTRY`, `TEMPLATES` |
| Web Worker files      | `kebab-case.worker.ts`       | `pipeline.worker.ts`         |

---

> **Regra 1.3 — Sem `any` nos tipos de eventos e mensagens de Worker**  
> **Origem:** docs/03-arquitetura.md §4.3 (protocolo de mensagens tipado); docs/04-tasks.md T-007  
> **Razão:** Mensagens entre main thread e Worker são a fronteira mais frágil da arquitetura. Um `any` aqui significa ausência de verificação de protocolo em runtime — falhas silenciosas são piores que falhas ruidosas num contexto financeiro.

```typescript
// ✅ Correto
type WorkerInbound = { type: 'PROCESS_FRAME'; bitmap: ImageBitmap } | { type: 'STOP' };

type WorkerOutbound =
  | { type: 'RESULT'; payload: CMC7Result }
  | { type: 'FRAME_QUALITY'; payload: FrameQualityReport }
  | { type: 'ERROR'; payload: CMC7Error };

// ❌ Proibido
worker.postMessage({ type: 'anything', data: someValue as any });
```

---

> **Regra 1.4 — Organização de exports: barrel files apenas na raiz pública**  
> **Origem:** docs/03-arquitetura.md §5.1 (estrutura de diretórios); docs/02-prd.md R-05 (ESM + CJS)  
> **Razão:** Barrel files intermediários (`src/ocr/index.ts`, `src/parser/index.ts`) impedem tree-shaking eficiente em bundlers que não resolvem re-exports. Com RNF-003 exigindo ≤ 50 KB de bundle principal, cada re-export desnecessário é proibição.

```typescript
// ✅ Correto: barrel SOMENTE em src/index.ts (ponto de entrada público)
// src/index.ts
export { createCMC7Reader } from './reader';
export type { CMC7Result, CMC7Fields, CMC7ReaderOptions /* ... */ } from './types';

// ❌ Proibido: barrel intermediário
// src/ocr/index.ts  ← NÃO CRIAR
export { TemplateMatchingEngine } from './template-engine';
export { CNNEngine } from './cnn-engine';
```

---

> **Regra 1.5 — Linting e formatação**  
> **Origem:** docs/02-prd.md RNF-006; docs/04-tasks.md T-004  
> **Razão:** Biblioteca open-source com múltiplos contribuidores. Formatação automática elimina debate de estilo, mantendo PRs focados no comportamento.

```jsonc
// .eslintrc — regras obrigatórias
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "@typescript-eslint/explicit-function-return-type": "error", // em funções públicas
    "no-console": "error", // usar logger interno ou silêncio
    "no-restricted-globals": ["error", "fetch", "XMLHttpRequest"], // proibir rede
  },
}
```

**Formatação:** Prettier com `printWidth: 100`, `singleQuote: true`, `trailingComma: 'all'`. Aplicado automaticamente via `lint-staged` no pre-commit.

---

## 2. Padrões de Arquitetura

---

> **Regra 2.1 — Dependências unidirecionais entre camadas**  
> **Origem:** docs/03-arquitetura.md §(Visão Geral) — diagrama de camadas  
> **Razão:** O diagrama de componentes define dependências explícitas. Inversão de dependência entre camadas introduz acoplamento circular que impossibilita testes unitários isolados.

```
Camada 5 (API) → Camada 4 (Build) → Camada 3 (Parsing) → Camada 2 (OCR) → Camada 1 (Pipeline)
```

**Regras derivadas:**

- Camada 3 (Parsing/Validação) **jamais** importa de Camada 2 (OCR) ou Camada 1
- Camada 2 (OCR) **jamais** importa de Camada 3
- Camada 1 (Pipeline) **jamais** importa de Camada 2 ou superior
- Camada 4 (API Pública) pode importar de qualquer camada inferior

**Verificação:** `eslint-plugin-import` com `no-restricted-imports` configurado por diretório.

---

> **Regra 2.2 — Toda E/S com OpenCV.js ocorre dentro do Web Worker**  
> **Origem:** docs/03-arquitetura.md §1.1 (AD-01); docs/04-tasks.md T-007  
> **Razão:** A decisão arquitetural AD-01 estabelece que todo processamento pesado ocorre no Worker. Qualquer chamada a `cv.*` na main thread viola o requisito RF-002 de não bloquear a thread principal.

```typescript
// ✅ Correto — dentro de pipeline.worker.ts
self.onmessage = async ({ data }: MessageEvent<WorkerInbound>) => {
  const mat = cv.matFromImageData(data.imageData);
  // ...
};

// ❌ Proibido — em qualquer arquivo de src/ fora de workers/
import cv from '@techstark/opencv-js';
cv.GaussianBlur(mat, dst, ksize, 0); // NUNCA na main thread
```

---

> **Regra 2.3 — Carregamento de WASM e modelos sempre lazy (dynamic import)**  
> **Origem:** docs/03-arquitetura.md §1.2 (AD-10), §5.4; docs/02-prd.md RNF-003  
> **Razão:** O bundle principal deve ter ≤ 50 KB gzip. Static imports de `opencv.js` (~3–4 MB) ou `onnxruntime-web` inviabilizam esse target.

```typescript
// ✅ Correto — lazy load
async function loadOpenCV(): Promise<typeof cv> {
  const { default: cvLib } = await import(/* webpackChunkName: "opencv" */ '../wasm/opencv.js');
  return cvLib;
}

// ❌ Proibido — static import no topo do arquivo
import cv from '@techstark/opencv-js'; // aumenta bundle principal
```

---

> **Regra 2.4 — BankRegistry é extensível; specs internas são imutáveis em runtime**  
> **Origem:** docs/03-arquitetura.md §3.3; docs/04-tasks.md T-016  
> **Razão:** O `BANK_REGISTRY` embutido na biblioteca é curado manualmente e pode ter erros. O método `registerBank()` permite ao consumidor corrigir specs sem esperar nova release. As specs internas são `readonly` para evitar mutação acidental.

```typescript
// ✅ Correto — specs internas como const assertado
export const BANK_REGISTRY = {
  '001': { ... } as const,
} satisfies Record<string, BankSpec>;

// Extensão pelo consumidor
reader.registerBank({ compeCode: '999', name: 'Banco Teste', ... });
```

---

> **Regra 2.5 — Erros são sempre tipados; nunca throw de string ou Error genérico**  
> **Origem:** docs/02-prd.md (guardrail: "Taxa de falha silenciosa = 0%"); docs/03-arquitetura.md §4.2  
> **Razão:** A API pública define 5 tipos de erro discriminados. Consumidores precisam de `error.type` para tomar decisões (ex: mostrar "abrir no Safari" vs "cheque não encontrado"). Um `new Error('algo deu errado')` é inútil para o consumidor.

```typescript
// ✅ Correto
throw { type: 'CMC7_NOT_FOUND', message: '...', frameQuality: 32 } satisfies CMC7NotFoundError;

// ❌ Proibido
throw new Error('CMC-7 não encontrado');
throw 'falha no processamento';
```

---

## 3. Padrões de Teste (TDD)

---

> **Regra 3.1 — Framework de teste: Vitest**  
> **Origem:** docs/04-tasks.md T-004; docs/03-arquitetura.md §5.2 (tsup como build system)  
> **Razão:** Vitest é nativo para projetos ESM/TypeScript com tsup, elimina a necessidade de configuração separada de Babel/Jest para ESM. Tem HMR de testes (`vitest --watch`) que acelera o ciclo red-green-refactor do TDD.

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom', // para testes de DOM/Canvas
    coverage: {
      provider: 'v8',
      thresholds: { lines: 80, functions: 80, branches: 75 },
    },
  },
});
```

---

> **Regra 3.2 — Tests escritos ANTES da implementação (Red-Green-Refactor)**  
> **Origem:** docs/04-tasks.md §(Princípio TDD); estrutura de cada tarefa  
> **Razão:** Toda tarefa no task breakdown define "Testes a escrever primeiro". Um PR que adiciona testes e implementação no mesmo commit com todos os testes verdes desde o início indica que os testes foram escritos depois — isso é auditável no histórico git.

**Verificação via CI:**

- Branch de feature inicia com commit `test: [T-XXX] red phase` (todos falhando)
- Commit subsequente `feat: [T-XXX] green phase` (testes passando)
- CI rejeita PRs onde o primeiro commit já tem testes passando (via diff analysis)

---

> **Regra 3.3 — Estrutura de diretórios de teste: colocation**  
> **Origem:** docs/04-tasks.md (cada tarefa tem `src/módulo/arquivo.test.ts`)  
> **Razão:** Testes colocados junto ao fonte facilitam manutenção: ao mover ou renomear um módulo, o teste vai junto. Diretório `__tests__/` separado causa drift onde testes ficam órfãos.

```
src/
├── validation/
│   ├── dv-validator.ts
│   └── dv-validator.test.ts    ← colocation
├── parser/
│   ├── cmc7-parser.ts
│   └── cmc7-parser.test.ts
e2e/                             ← exceção: testes E2E ficam fora de src/
└── camera-to-result.test.ts
poc/                             ← scripts de benchmark do M1
└── segmentation-benchmark.test.ts
```

---

> **Regra 3.4 — Cobertura mínima por camada**  
> **Origem:** docs/02-prd.md RNF-006 (≥ 80% geral); risco de bugs silenciosos em validação financeira  
> **Razão:** Camadas determinísticas (Validação/Parsing) têm zero desculpa para cobrir menos de 100%. Camadas com I/O externo (câmera, WASM) têm threshold menor porque dependem de mocks.

| Camada                     | Arquivo(s)              | Coverage mínima |
| -------------------------- | ----------------------- | --------------- |
| Camada 3 — DVValidator     | `dv-validator.ts`       | **100% lines**  |
| Camada 3 — CMC7Parser      | `cmc7-parser.ts`        | **95% lines**   |
| Camada 3 — BankRegistry    | `bank-registry.ts`      | **90% lines**   |
| Camada 2 — QualityAssessor | `assessor.ts`           | **90% lines**   |
| Camada 2 — TemplateEngine  | `template-engine.ts`    | **85% lines**   |
| Camada 1 — Preprocessor    | `image-preprocessor.ts` | **80% lines**   |
| Camada 1 — CameraCapture   | `camera-capture.ts`     | **75% lines**   |
| Camada 4 — API Pública     | `reader.ts`, `index.ts` | **85% lines**   |

---

> **Regra 3.5 — Estratégia de mock para câmera, Canvas e WASM**  
> **Origem:** docs/04-tasks.md T-006, T-007, T-010  
> **Razão:** Sem uma estratégia consistente de mocking, cada desenvolvedor inventa sua abordagem, tornando os testes frágeis e não-reproduzíveis.

```typescript
// src/test-helpers/mocks.ts — centralizar todos os mocks

// Mock de MediaStream/getUserMedia
export function mockGetUserMedia(config?: Partial<MediaStream>) {
  const stream = { getTracks: () => [{ stop: vi.fn() }], ...config };
  vi.stubGlobal('navigator', {
    mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) },
  });
  return stream;
}

// Mock de HTMLVideoElement com dimensões
export function mockVideoElement(): HTMLVideoElement {
  return Object.assign(document.createElement('video'), {
    videoWidth: 1280,
    videoHeight: 720,
    readyState: 4,
  });
}

// Mock de OpenCV.js (não carrega WASM em testes unitários)
export const mockCV = {
  Mat: class {
    data = new Uint8Array(100);
    rows = 10;
    cols = 10;
    delete = vi.fn();
  },
  GaussianBlur: vi.fn(),
  adaptiveThreshold: vi.fn(),
  findContours: vi.fn(),
  // ... outros métodos usados
};
vi.mock('../wasm/opencv.js', () => ({ default: mockCV }));

// Mock de ImageBitmap
export function mockImageBitmap(width = 960, height = 80): ImageBitmap {
  return { width, height, close: vi.fn() } as unknown as ImageBitmap;
}
```

**Regra:** Mocks de câmera e WASM devem ser importados de `src/test-helpers/mocks.ts`. **Proibido** redefinir mocks inline nos arquivos de teste — inconsistências causam falsos positivos.

---

> **Regra 3.6 — Testes de integração E2E com Playwright**  
> **Origem:** docs/04-tasks.md T-022  
> **Razão:** Testes unitários com mocks não detectam bugs de integração entre WASM e DOM. O Playwright com `--device` simula mobile real para validar RNF-002.

```typescript
// e2e/camera-to-result.test.ts
test('detecta CMC-7 em Chrome desktop', async ({ page }) => {
  await page.goto('http://localhost:5173/examples/vanilla/');
  // Usar fake camera via --use-fake-device-for-media-stream
  await page.waitForSelector('[data-testid="cmc7-result"]', { timeout: 15_000 });
});
```

CI executa Playwright com `--project=chromium,firefox,webkit` na matrix.

---

## 4. Restrições de Privacidade e Compliance

---

> **Regra 4.1 — Proibição absoluta de chamadas de rede no core da biblioteca**  
> **Origem:** docs/02-prd.md RNF-004 ("zero tráfego para terceiros"); R-01 (restrição não-negociável)  
> **Razão:** Dados de cheques são informações financeiras sensíveis. Uma chamada de rede acidental (ex: error reporting, analytics) configuraria transmissão não autorizada de dados financeiros — risco legal e de reputação crítico.

**Operações proibidas em qualquer arquivo de `src/`:**

- `fetch()` para qualquer URL externa
- `XMLHttpRequest` para qualquer URL externa
- `navigator.sendBeacon()`
- `WebSocket` para endpoints externos
- `import()` de URLs (`import('https://cdn.example.com/...')`)
- `new Image().src = 'http://...'` (tracking pixel)

**Verificação automática:**

```json
// .eslintrc — regras de rede
"no-restricted-globals": ["error", "fetch", "XMLHttpRequest"],
"no-restricted-syntax": [
  "error",
  { "selector": "NewExpression[callee.name='WebSocket']", "message": "WebSocket proibido" },
  { "selector": "CallExpression[callee.name='fetch']", "message": "fetch() proibido em src/" }
]
```

**Exceção permitida:** `assetsBaseUrl` — o consumidor pode configurar URL para seus próprios assets (WASM, modelos). O carregamento é feito via `import()` dinâmico para arquivos estáticos, não para APIs.

---

> **Regra 4.2 — Sem persistência de imagens ou dados de cheques**  
> **Origem:** docs/02-prd.md RNF-004 ("Sem persistência")  
> **Razão:** Frames de cheques contendo dados financeiros não podem ser armazenados sem consentimento explícito do usuário final.

**Proibido em `src/`:**

- `localStorage.setItem()` com qualquer dado de imagem ou CMC-7
- `sessionStorage.setItem()` com dados de frames
- `indexedDB` para armazenar frames ou resultados
- Cache de Service Worker para respostas de API com dados do cheque
- `document.cookie` com dados de sessão de leitura

---

> **Regra 4.3 — Auditoria de dependências: nenhuma dependência pode fazer chamadas de rede implícitas**  
> **Origem:** docs/02-prd.md RNF-004; R-02  
> **Razão:** Uma dependência pode introduzir telemetria silenciosa (ex: `sentry`, `amplitude` embutidos em SDKs).

**Checklist pré-adição de dependência:**

1. Rodar `npm pack <package>` e inspecionar o bundle com `source-map-explorer` ou `bundle-buddy`
2. Verificar se o package tem `fetch`, `XMLHttpRequest` ou `WebSocket` no source via `grep`
3. Se package tem dependências transitivas: repetir para cada uma
4. Documentar resultado em `audit/deps/<package-name>.md`

**CI:** `npx is-my-node-vulnerable` no lockfile a cada PR.

---

> **Regra 4.4 — Imagens de frame são descartadas após processamento**  
> **Origem:** docs/02-prd.md RNF-004; docs/03-arquitetura.md §4.3 (lifecycle)  
> **Razão:** `ImageBitmap` e `cv.Mat` com dados de frame devem ser liberados explicitamente para não vazar memória e não manter dados de cheque além do necessário.

```typescript
// ✅ Obrigatório após uso
bitmap.close(); // libera GPU memory do ImageBitmap
mat.delete(); // libera heap WASM do cv.Mat
```

**Revisores devem rejeitar PRs** onde `cv.Mat` é criado sem `mat.delete()` no finally correspondente.

---

## 5. Restrições de Licenciamento

---

> **Regra 5.1 — Licenças explicitamente permitidas**  
> **Origem:** docs/01-viabilidade.md §6; docs/02-prd.md RNF-005  
> **Razão:** A biblioteca é distribuída como MIT. Dependências com licenças incompatíveis contaminariam o projeto e impediriam uso comercial.

| Licença          | Permitida?      | Condição                                                 |
| ---------------- | --------------- | -------------------------------------------------------- |
| MIT              | ✅ Sim          | Sem condições                                            |
| Apache-2.0       | ✅ Sim          | Incluir NOTICE se existir                                |
| BSD-2-Clause     | ✅ Sim          | Incluir copyright notice                                 |
| BSD-3-Clause     | ✅ Sim          | Incluir copyright notice                                 |
| ISC              | ✅ Sim          | Sem condições adicionais                                 |
| CC0-1.0          | ✅ Sim          | Domínio público                                          |
| **GPL-2.0**      | ❌ **Proibida** | Contamina MIT                                            |
| **GPL-3.0**      | ❌ **Proibida** | Contamina MIT                                            |
| **AGPL-3.0**     | ❌ **Proibida** | Contamina + exige abertura de backend                    |
| **LGPL-2.1**     | ⚠️ Restrita     | Apenas se linkagem dinâmica — requer análise caso a caso |
| **LGPL-3.0**     | ⚠️ Restrita     | Idem                                                     |
| **SSPL**         | ❌ **Proibida** | Não OSI-aprovada, contamina projetos SaaS                |
| **Proprietária** | ❌ **Proibida** | Viola MIT e RNF-005                                      |

---

> **Regra 5.2 — Processo obrigatório antes de adicionar qualquer dependência**  
> **Origem:** docs/01-viabilidade.md §6 ([VERIFICAR] sobre modelos e fontes); docs/02-prd.md RNF-005  
> **Razão:** Modelos ONNX e traineddata têm licenças **independentes** da engine que os executa. O Tesseract engine é Apache-2.0, mas um traineddata comunitário pode ser GPL.

```bash
# Verificação obrigatória antes de `npm install <package>`
npx license-checker --production --onlyAllow 'MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC;CC0-1.0'
```

**Para assets binários (modelos ONNX, fontes TTF, arquivos WASM):**

1. Verificar arquivo `LICENSE` ou `NOTICE` no repositório de origem
2. Verificar cabeçalho do arquivo com `strings <arquivo> | grep -i license`
3. Registrar em `audit/assets/<nome-do-asset>.md` com: URL de origem, licença, data de verificação, hash SHA-256

---

> **Regra 5.3 — SBOM gerado e publicado em cada release**  
> **Origem:** docs/02-prd.md RNF-006 ("NPM package com provenance e SBOM")  
> **Razão:** Usuários corporativos com compliance de segurança exigem SBOM para aprovação. Ausência de SBOM bloqueia adoção em bancos e fintechs grandes — que são o público-alvo primário.

```bash
# No pipeline de release
npx @cyclonedx/cyclonedx-npm --output-format json --output-file sbom.json
```

SBOM publicado como release asset no GitHub e referenciado no `package.json`:

```json
{ "sbom": "https://github.com/org/cmc7-ocr-parser/releases/download/v1.0.0/sbom.json" }
```

---

## 6. Padrões de Performance

---

> **Regra 6.1 — Budget de bundle size por chunk (hard limits)**  
> **Origem:** docs/02-prd.md RNF-003; docs/03-arquitetura.md §5.1  
> **Razão:** Esses são targets do PRD, não sugestões. Uma biblioteca que viola esses limites falha no critério de aceite do MVP.

| Chunk                                  | Limite máximo  | Medição                              |
| -------------------------------------- | -------------- | ------------------------------------ |
| `dist/esm/index.js` (bundle principal) | **50 KB gzip** | `gzip -c dist/esm/index.js \| wc -c` |
| `dist/workers/pipeline.worker.js`      | **30 KB gzip** | Idem                                 |
| `dist/wasm/opencv.wasm`                | **4 MB raw**   | `wc -c dist/wasm/opencv.wasm`        |
| `dist/models/cmc7-cnn.onnx`            | **2 MB raw**   | `wc -c dist/models/cmc7-cnn.onnx`    |
| **Total lazy load (WASM + modelo)**    | **6 MB raw**   | Soma dos anteriores                  |

**CI check obrigatório:**

```yaml
# .github/workflows/ci.yml
- name: Bundle size check
  run: |
    SIZE=$(gzip -c dist/esm/index.js | wc -c)
    if [ $SIZE -gt 51200 ]; then echo "FAIL: bundle $SIZE bytes > 50KB"; exit 1; fi
```

---

> **Regra 6.2 — Tempo máximo de processamento por fase**  
> **Origem:** docs/02-prd.md RNF-001; docs/03-arquitetura.md §1.2 (pipeline detalhado)  
> **Razão:** Os targets foram calculados com base na estimativa de latência por operação em mobile mid-range (Snapdragon 695). Qualquer fase que exceda o budget impacta a experiência em tempo real.

| Fase                         | Target (mobile mid-range) | Target (desktop) | Onde medir                      |
| ---------------------------- | ------------------------- | ---------------- | ------------------------------- |
| Quality assessment (L1)      | ≤ 15ms                    | ≤ 5ms            | `assessor.test.ts` (benchmark)  |
| Preprocessor L1 total        | ≤ 20ms                    | ≤ 8ms            | `image-preprocessor-l1.test.ts` |
| Preprocessor L2 + OpenCV     | ≤ 200ms                   | ≤ 50ms           | `image-preprocessor-l2.test.ts` |
| ROI detection                | ≤ 30ms                    | ≤ 10ms           | `roi-detector.test.ts`          |
| Template matching (60 chars) | ≤ 300ms                   | ≤ 80ms           | `template-engine.test.ts`       |
| CNN inference (onnxruntime)  | ≤ 200ms                   | ≤ 50ms           | `cnn-engine.test.ts`            |
| Parsing + validation total   | ≤ 10ms                    | ≤ 2ms            | `field-extractor.test.ts`       |
| **Pipeline total**           | **≤ 800ms**               | **≤ 300ms**      | E2E benchmark                   |

**Cada arquivo de teste de camada 1 e 2 tem um test case de benchmark** com `performance.now()` que falha se exceder o target.

---

> **Regra 6.3 — Sem polling mais rápido que `frameIntervalMs`**  
> **Origem:** docs/03-arquitetura.md §4.3 (lifecycle); docs/02-prd.md RF-002  
> **Razão:** Processar frames mais rápido que o Worker consegue consumir causa queue de bitmaps na memória. Em mobile, isso leva a throttling térmico e degrada a experiência.

```typescript
// ✅ Correto — só emite novo frame se worker livre
let workerBusy = false;
const interval = setInterval(() => {
  if (workerBusy) return; // drop frame, não enfileira
  workerBusy = true;
  const bitmap = await createImageBitmap(canvas);
  worker.postMessage({ type: 'PROCESS_FRAME', bitmap }, [bitmap]);
}, options.frameIntervalMs);

// Na resposta do worker
worker.onmessage = () => {
  workerBusy = false;
};
```

---

> **Regra 6.4 — Liberar recursos WASM explicitamente (sem GC implícito)**  
> **Origem:** docs/03-arquitetura.md §1.2, §4.3; docs/04-tasks.md T-010  
> **Razão:** Objetos `cv.Mat` alocam no heap WASM, não no heap JS. O GC do JavaScript não os libera. Em um stream de 30s a 3fps, cada `Mat` não liberado resulta em ~90 objetos acumulados — crash por OOM em mobile.

```typescript
// ✅ Padrão obrigatório para todo cv.Mat
const mat = new cv.Mat();
try {
  cv.GaussianBlur(src, mat, ksize, 0);
  // ... usar mat ...
  return result;
} finally {
  mat.delete(); // SEMPRE no finally
}
```

**Code review:** Qualquer `new cv.Mat()` sem `finally { mat.delete() }` é motivo de bloqueio de PR.

---

## 7. Padrões de Documentação

---

> **Regra 7.1 — TSDoc obrigatório em toda função e tipo da API pública**  
> **Origem:** docs/02-prd.md RNF-006 ("JSDoc em todas as funções públicas")  
> **Razão:** A biblioteca é consumida por desenvolvedores que não têm acesso ao source. TSDoc é renderizado pelo IntelliSense do VS Code/WebStorm, reduzindo a necessidade de consultar README para uso básico.

````typescript
/**
 * Inicializa uma instância do leitor CMC-7.
 *
 * @param options - Opções de configuração. Todas são opcionais.
 * @returns Promise que resolve com um {@link CMC7Reader} pronto para uso.
 *
 * @throws {@link CMC7InitError} Se WebAssembly não for suportado pelo browser.
 *
 * @example
 * ```typescript
 * const reader = await createCMC7Reader({ recognitionMode: 'cnn' });
 * reader.on('result', (result) => console.log(result.fields.bankCode));
 * await reader.start(videoElement);
 * ```
 */
export async function createCMC7Reader(options?: CMC7ReaderOptions): Promise<CMC7Reader> { ... }
````

**Mínimo exigido:**

- `@param` para cada parâmetro não-óbvio
- `@returns` descrevendo o retorno
- `@throws` para cada tipo de erro que pode ser lançado
- `@example` para toda função pública principal

---

> **Regra 7.2 — Decisões de trade-off documentadas inline**  
> **Origem:** docs/03-arquitetura.md §(Decisões de Arquitetura — Resumo) tabela AD-01 a AD-10  
> **Razão:** As 10 decisões de arquitetura têm alternativas descartadas. Sem documentação inline, futuros contribuidores reintroduzirão as alternativas descartadas (ex: tentar usar `OffscreenCanvas`, não entendendo a restrição do Safari).

```typescript
// ✅ Formato obrigatório para decisões não-óbvias
// DECISÃO (AD-01): Usamos ImageBitmap transferível em vez de OffscreenCanvas.
// Razão: OffscreenCanvas não suportado no Safari iOS < 16.4 (target RNF-002).
// Alternativa descartada: OffscreenCanvas — ver docs/03-arquitetura.md
const bitmap = await createImageBitmap(canvas);
worker.postMessage({ type: 'PROCESS_FRAME', bitmap }, [bitmap]);
```

---

> **Regra 7.3 — README do repositório com seções obrigatórias**  
> **Origem:** docs/04-tasks.md T-025; docs/02-prd.md RNF-006  
> **Razão:** Público-alvo são desenvolvedores que decidem adotar ou não a biblioteca em 5 minutos. README incompleto aumenta a taxa de abandono.

**Seções obrigatórias no README:**

1. `## Installation` — npm/yarn/pnpm command
2. `## Quick Start` — exemplo mínimo funcional (< 20 linhas)
3. `## Browser Support` — tabela com todos os browsers e limitações iOS
4. `## API Reference` — link para TypeDoc gerado
5. `## Examples` — links para React, Vue e vanilla
6. `## Privacy` — confirma zero data leakage (constrói confiança para fintechs)
7. `## License` — MIT + lista de dependências com licenças

---

## 8. Git e Versionamento

---

> **Regra 8.1 — Conventional Commits obrigatório**  
> **Origem:** docs/04-tasks.md T-004; necessidade de CHANGELOG automático para releases  
> **Razão:** CHANGELOG.md é gerado automaticamente via `conventional-changelog`. Commits sem prefixo bloqueiam release automatizado.

**Formato:** `<type>(<scope>): <description> [T-XXX]`

| Type       | Quando usar                              |
| ---------- | ---------------------------------------- |
| `feat`     | Nova funcionalidade                      |
| `fix`      | Correção de bug                          |
| `test`     | Adição/modificação de testes             |
| `perf`     | Melhoria de performance                  |
| `refactor` | Refatoração sem mudança de comportamento |
| `docs`     | Documentação apenas                      |
| `build`    | Build system, dependências               |
| `ci`       | Pipeline de CI                           |
| `chore`    | Tarefas de manutenção                    |
| `spike`    | PoC/experimento (M1 apenas)              |

**Exemplos:**

```
test(dv-validator): red phase — mod10 e mod11 [T-015]
feat(dv-validator): implementa mod10 e mod11 [T-015]
spike(segmentation): benchmark com 30 imagens de câmera [T-002]
```

**Enforcement:** `commitlint` no pre-commit hook via `husky`.

---

> **Regra 8.2 — Estratégia de branching**  
> **Origem:** docs/04-tasks.md (milestones M1–M7)  
> **Razão:** Milestones têm critério de go/no-go explícito. A estratégia de branch reflete esse fluxo.

```
main ─────────────────────────────────────────── (releases tags: v1.0.0)
  │
  ├── milestone/m1-poc ──── PR → main (após go/no-go M1)
  ├── milestone/m2-foundation ──── PR → main
  ├── ...
  │
  └── feature/T-XXX-nome-curto ──── PR → milestone/mX-nome
```

**Regras:**

- `main` é protegido: nenhum push direto
- PRs para `main` exigem: (a) todos os testes passando, (b) coverage ≥ threshold, (c) bundle size check verde, (d) 1 review aprovado
- PRs para `milestone/*` exigem: (a) testes passando, (b) description com referência ao task ID

---

> **Regra 8.3 — Critérios de merge (Pull Request checklist)**  
> **Origem:** docs/04-tasks.md (critério de done de cada tarefa); docs/02-prd.md RNF-006  
> **Razão:** "Done" tem definição formal em cada tarefa. O checklist de PR é a verificação automática dessa definição.

**PR template obrigatório:**

```markdown
## Task

Closes T-XXX

## Checklist

- [ ] Testes escritos ANTES da implementação (red phase commitado separadamente)
- [ ] Todos os testes passando (`npm test`)
- [ ] Coverage não reduziu abaixo do threshold da camada
- [ ] Bundle size check verde (`npm run check:bundle`)
- [ ] Sem `any` na API pública (`npm run lint`)
- [ ] TSDoc em todas as funções públicas novas
- [ ] Nenhum `cv.Mat` criado sem `finally { mat.delete() }` (se aplicável)
- [ ] Nenhuma chamada de rede (`fetch`, `XHR`, `WebSocket`) em `src/`

## Decisões de trade-off (se houver)

<!-- Descreva qualquer decisão não-óbvia tomada durante a implementação -->
```

---

> **Regra 8.4 — Versionamento semântico (SemVer) estrito**  
> **Origem:** docs/02-prd.md §2 (roadmap com versões explícitas v1.0, v1.1, v1.2)  
> **Razão:** Consumidores de fintechs usam pinning de versão (`"cmc7-ocr-parser": "^1.0.0"`). Uma breaking change não sinalizada em `MAJOR` causa regressões silenciosas em produção financeira.

| Mudança                                                | Version bump                             |
| ------------------------------------------------------ | ---------------------------------------- |
| Novo método ou tipo na API pública                     | `MINOR`                                  |
| Remoção ou renomeação de método/tipo público           | `MAJOR`                                  |
| Bug fix sem mudança de API                             | `PATCH`                                  |
| Feature experimental (`experimental: true`) adicionada | `MINOR`                                  |
| Feature experimental removida                          | `MINOR` (não `MAJOR` — era experimental) |
| Aumento de cobertura de `BankRegistry`                 | `PATCH`                                  |

---

## Resumo de Regras Provisórias

As seguintes regras são válidas até a conclusão do **Milestone 1** (T-001, T-002, T-003). Devem ser revisadas com os resultados dos spikes antes do início do Milestone 2.

| ID        | Regra Provisória                                                                         | Condição de Revisão                                                | Task de Validação |
| --------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------- |
| **RP-01** | OpenCV.js com build customizada `core+imgproc` tem ≤ 4 MB                                | ✅ Confirmado: Build TechStark v4.9.0 tem ~3.45 MB total (JS+WASM) | T-003             |
| **RP-02** | Build single-thread do OpenCV.js não exige headers CORP/COOP                             | ✅ Confirmado: Verificado em ambiente local sem headers especiais  | T-003             |
| **RP-03** | [PROVISÓRIA] Template matching como engine padrão atinge ≥ 95% de acurácia               | T-002: benchmark com câmera real                                   | T-002             |
| **RP-04** | [PROVISÓRIA] Templates CMC-7 gerados da fonte TTF são redistribuíveis como Uint8Array    | T-001: audit de licença da fonte                                   | T-001             |
| **RP-05** | [PROVISÓRIA] onnxruntime-web completa inferência CNN ~1MB em ≤ 200ms em mobile mid-range | T-014: benchmark em device físico                                  | T-014             |
| **RP-06** | [PROVISÓRIA] Especificações FEBRABAN dos 5 maiores bancos estão acessíveis publicamente  | T-016: curadoria manual das specs                                  | T-016             |

**Protocolo de revisão:** Após cada spike do M1, o responsável pela task abre um PR em `docs/05-regras.md` removendo o marcador `[PROVISÓRIA]` e adicionando o resultado confirmado abaixo da regra. PRs para milestones seguintes são bloqueados se regras provisórias relacionadas não foram revisadas.

---

_Este documento é a fonte de verdade para padrões de desenvolvimento. Conflitos entre este documento e qualquer outro doc devem ser resolvidos atualizando este documento — não criando exceções ad-hoc no código._
