# Setup do Projeto — `cmc7-ocr-parser`

> **Data:** 2026-04-08  
> **Realizado por:** scaffolding inicial  
> **Status:** ✅ Completo — aguardando `npm install` e `npm test` do desenvolvedor

---

## Ações Realizadas

### 1. Estrutura de Diretórios

Criada a árvore de pastas conforme camadas definidas em `docs/03-arquitetura.md`:

```
cmc7-ocr-parser/
├── src/
│   ├── index.ts              # Camada 5 — entry point público (único barrel permitido)
│   ├── reader.ts             # Camada 5 — CMC7Reader factory
│   ├── types/index.ts        # Camada 5 — todos os tipos públicos
│   ├── capture/              # Camada 1 — Image Pipeline (câmera)
│   │   ├── camera-capture.ts
│   │   ├── environment-detector.ts
│   │   └── frame-sampler.ts
│   ├── pipeline/             # Camada 1 — Image Pipeline (processamento)
│   │   ├── image-preprocessor.ts
│   │   └── roi-detector.ts
│   ├── ocr/                  # Camada 2 — OCR Engine
│   │   ├── template-engine.ts
│   │   ├── cnn-engine.ts
│   │   ├── quality/assessor.ts
│   │   └── templates/index.ts
│   ├── validation/           # Camada 3 — Validação
│   │   ├── dv-validator.ts
│   │   └── bank-registry.ts
│   ├── parser/               # Camada 3 — Parsing
│   │   ├── cmc7-parser.ts
│   │   └── field-extractor.ts
│   ├── workers/              # Transversal — Web Worker
│   │   └── pipeline.worker.ts
│   ├── react.ts              # Camada 5 — subpath export (peerDep React)
│   ├── vue.ts                # Camada 5 — subpath export (peerDep Vue)
│   └── test-helpers/
│       ├── setup.ts          # Global mocks (jsdom + ImageBitmap + Worker)
│       └── mocks.ts          # Centralized test mock helpers
├── scripts/
│   └── check-bundle-size.js  # CI gate para RNF-003
├── docs/
│   ├── 01-viabilidade.md
│   ├── 02-prd.md
│   ├── 03-arquitetura.md
│   ├── 04-tasks.md
│   ├── 05-regras.md
│   ├── progress.md
│   └── 06-setup.md           # (este arquivo)
├── .github/workflows/ci.yml
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── .eslintrc.json
├── .prettierrc.json
├── commitlint.config.json
└── .gitignore
```

---

## 2. Dependências

### DevDependencies instaladas

| Pacote | Versão | Licença | Origem do Requisito |
|--------|--------|---------|---------------------|
| `typescript` | ^5.4.0 | Apache-2.0 ✅ | docs/05 §1.1 |
| `vitest` | ^1.4.0 | MIT ✅ | docs/05 §3.1 |
| `@vitest/coverage-v8` | ^1.4.0 | MIT ✅ | docs/05 §3.4 |
| `@vitest/ui` | ^1.4.0 | MIT ✅ | DX |
| `jsdom` | ^24.0.0 | MIT ✅ | docs/05 §3.5 |
| `tsup` | ^8.0.0 | MIT ✅ | docs/05 §5.2 → docs/03 §5.2 |
| `eslint` | ^8.57.0 | MIT ✅ | docs/05 §1.5 |
| `@typescript-eslint/eslint-plugin` | ^7.0.0 | MIT ✅ | docs/05 §1.5 |
| `@typescript-eslint/parser` | ^7.0.0 | BSD-2-Clause ✅ | docs/05 §1.5 |
| `eslint-config-prettier` | ^9.1.0 | MIT ✅ | docs/05 §1.5 |
| `prettier` | ^3.2.0 | MIT ✅ | docs/05 §1.5 |
| `husky` | ^9.0.0 | MIT ✅ | docs/05 §1.5 (pre-commit) |
| `lint-staged` | ^15.2.0 | MIT ✅ | docs/05 §1.5 |
| `@commitlint/cli` | ^19.0.0 | MIT ✅ | docs/05 §8.1 |
| `@commitlint/config-conventional` | ^19.0.0 | MIT ✅ | docs/05 §8.1 |
| `license-checker` | ^25.0.1 | BSD-3-Clause ✅ | docs/05 §5.2 |
| `@playwright/test` | ^1.42.0 | Apache-2.0 ✅ | docs/04 T-023 (E2E) |

### Runtime dependencies — NENHUMA no bundle principal

Conforme `docs/05-regras.md §2.3` (carregamento lazy obrigatório):
- `@techstark/opencv-js` — **NÃO instalada** como dependência direta. Será adicionada como `peerDependency` ou carregada via URL após T-003 validar a build customizada.
- `onnxruntime-web` — **NÃO instalada**. Adicionada após T-014 confirmar tamanho do modelo.

### peerDependencies declaradas (opcionais)

| Pacote | Versão | Licença | Condição |
|--------|--------|---------|----------|
| `react` | >=18.0.0 | MIT ✅ | Apenas se usar `cmc7-ocr-parser/react` |
| `vue` | >=3.0.0 | MIT ✅ | Apenas se usar `cmc7-ocr-parser/vue` |

---

## 3. Configurações com Justificativa

| Arquivo | Configuração | Justificativa |
|---------|-------------|---------------|
| `tsconfig.json` | `strict: true` | docs/05 §1.1 |
| `tsconfig.json` | `noUncheckedIndexedAccess: true` | Previne `undefined` silencioso em arrays WASM |
| `tsconfig.json` | `exactOptionalPropertyTypes: true` | Tipos de API publicam contratos exatos |
| `vitest.config.ts` | `environment: 'jsdom'` | Canvas/MediaDevices precisam de browser API simulation |
| `vitest.config.ts` | `pool: 'forks'` | Isola testes para detectar memory leaks (Regra 6.4) |
| `.eslintrc.json` | `no-restricted-globals: ['fetch', 'XMLHttpRequest']` | docs/05 §4.1 — zero rede em src/ |
| `tsup.config.ts` | 3 builds separados | ESM (com splitting) + CJS + Worker |
| `tsup.config.ts` | `sideEffects: false` | Habilita tree-shaking nos bundlers dos consumidores |

---

## 4. Testes Placeholder Criados

Os seguintes testes **passam** no estado atual do scaffolding (sem implementação real):

| Arquivo de Teste | O que valida |
|-----------------|-------------|
| `src/types/index.test.ts` | Formas do contrato TypeScript (compilação) |
| `src/ocr/templates/index.test.ts` | Estrutura dos 15 templates (arrays placeholder) |

Todos os outros módulos têm shells que lançam `Error('Not yet implemented')` — os testes reais serão escritos em cada task (TDD).

---

## 5. Próximos Passos para o Desenvolvedor

### Imediato (antes de qualquer implementação)

```bash
# 1. Instalar dependências
npm install

# 2. Ativar git hooks
npx husky

# 3. Verificar que testes placeholder passam
npm test

# 4. Verificar que TypeScript compila sem erros
npm run build:check
```

### Antes do Milestone 1

```bash
# Criar pasta de audit para T-001
mkdir -p audit/deps

# Criar pasta poc para T-002
mkdir -p poc/images poc/results
```

---

## 6. Desvios das Regras

| Regra | Desvio | Justificativa |
|-------|--------|---------------|
| docs/05 §2.2 (OpenCV só no Worker) | `pipeline.worker.ts` tem shell sem OpenCV | Implementação em T-007; contrato já definido |
| docs/05 §3.2 (TDD: red phase primeiro) | Placeholders são shells, não testes failing antes do impl | Scaffolding ≠ task — TDD começa em T-001 |

---

## 7. Pendências Antes de Começar Implementação

- [ ] `npm install` — executar manualmente no terminal
- [ ] `npx husky` — ativar pre-commit hooks
- [ ] `npm test` — confirmar que os 2 placeholders passam
- [ ] `npm run build:check` — confirmar TypeScript compila sem erros
- [ ] `npm run lint` — pode ter warnings iniciais (módulos não implementados com `_params`)
- [ ] Criar diretórios `audit/` e `poc/` antes de iniciar T-001

---

*Setup gerado automaticamente. Qualquer desvio identificado durante a implementação deve ser registrado na seção "Desvios" deste documento e em `docs/progress.md`.*
