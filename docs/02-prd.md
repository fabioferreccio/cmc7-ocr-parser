# PRD — Biblioteca `cmc7-ocr-parser` (TypeScript)

> **Versão:** 1.0-draft  
> **Data:** 2026-04-08  
> **Baseado em:** `docs/01-viabilidade.md`  
> **Status:** Em revisão

---

## 1. Visão do Produto

### Problema que resolve

Sistemas financeiros brasileiros que precisam ler e validar cheques ainda dependem de scanners de mesa dedicados ou de integrações com SDKs proprietários e caros para capturar e interpretar a linha CMC-7 — o código magnético padronizado pela FEBRABAN que identifica banco, agência, conta e número do cheque. Aplicações web modernas não dispõem de uma biblioteca TypeScript open-source, de licença comercial-friendly e processamento client-side, capaz de ler essa linha diretamente via câmera do dispositivo sem enviar dados a servidores de terceiros.

### Proposta de valor

> **Uma biblioteca TypeScript MIT que lê, extrai e valida a linha CMC-7 de cheques brasileiros diretamente no browser via câmera, sem nenhum tráfego de dados para servidores externos.**

### Público-alvo

| Perfil                                                       | Descrição                                                               | Caso de uso típico                                                            |
| ------------------------------------------------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Primário — Desenvolvedores de fintechs e bancos digitais** | Engenheiros que constroem fluxos de depósito de cheques em apps/webapps | Foto do cheque pelo celular → extração automática do CMC-7 → crédito na conta |
| **Primário — Devs de ERPs e sistemas contábeis**             | Equipes que constroem módulos de contas a receber para PMEs             | Leitura em lote de cheques recebidos via webcam de desktop                    |
| **Secundário — Desenvolvedores de sistemas de cobrança**     | Integradores de gateways e sistemas de compensação                      | Validação de dados CMC-7 antes de envio ao banco                              |
| **Secundário — Pesquisadores e entusiastas**                 | Desenvolvedores open-source interessados em OCR/MICR                    | Contribuição e extensão da biblioteca                                         |

---

## 2. Escopo — MVP vs Roadmap

### Critério de corte

> **Regra**: Qualquer componente classificado como `[INVIÁVEL CLIENT-SIDE]` na análise de viabilidade **não entra no MVP como feature principal**. Itens com `[RISCO]` entram com mitigação explícita documentada. Itens com `[VERIFICAR]` são tratados como **premissas a validar** — não como features prometidas.

---

### MVP — v1.0

| Feature                                                          | Justificativa de inclusão                                                                         |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Captura de câmera via `getUserMedia`                             | VIÁVEL — API bem suportada em todos os targets relevantes                                         |
| Detecção e recorte automático da ROI (linha CMC-7)               | VIÁVEL COM RESSALVAS — pré-processamento client-side factível com OpenCV.js lazy-loaded           |
| OCR da linha CMC-7 via template matching ou CNN ~1MB             | VIÁVEL COM RESSALVAS — alfabeto de 15 classes é altamente favorável; estratégia confirmada em PoC |
| Extração dos campos estruturados (banco, agência, conta, cheque) | VIÁVEL — parsing determinístico após OCR                                                          |
| Validação de dígitos verificadores (Módulo 10/11)                | VIÁVEL — algoritmos determinísticos, 100% client-side                                             |
| Detecção de ambiente WKWebView + aviso ao usuário                | Mitigação do [RISCO] de iOS/in-app browsers                                                       |
| API TypeScript tipada com resultado estruturado                  | Requisito de usabilidade da biblioteca                                                            |
| Suporte a imagem estática como entrada (além do stream)          | Caso de uso válido para sistemas com upload de arquivo                                            |

---

### Fora do MVP — Roadmap

| Feature                                           | Versão alvo               | Justificativa de exclusão do MVP                                                                                        |
| ------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| OCR de valor manuscrito (campo numérico)          | v1.1 — experimental       | [INVIÁVEL CLIENT-SIDE] como feature principal; acurácia ~80–90% insuficiente para produção sem UI de confirmação madura |
| OCR de data manuscrita                            | v1.1 — experimental       | Mesma razão; factível apenas para letra de forma em condições ideais                                                    |
| HTR completo (valor por extenso)                  | v2.0 ou nunca client-side | [INVIÁVEL CLIENT-SIDE] — modelos de qualidade têm 300MB+; inviável para browser                                         |
| Interface de backend fallback para HTR            | v1.2                      | Depende da maturidade da feature experimental v1.1                                                                      |
| Suporte a múltiplos países (E-13B, CMC-7 francês) | v2.0                      | Fora do escopo brasileiro do MVP                                                                                        |
| Modo offline com Service Worker                   | v1.2                      | Necessita estabilização do core primeiro                                                                                |
| SDK React Native                                  | v2.0                      | Rearchitetura necessária (sem WebAssembly equivalente)                                                                  |

---

## 3. Requisitos Funcionais

### RF-001 — Inicialização da Biblioteca

| Campo                  | Valor                                                                                                                                                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                 | RF-001                                                                                                                                                                                                                              |
| **Descrição**          | A biblioteca deve expor uma função `createCMC7Reader(options?)` que inicializa os recursos necessários (carregamento lazy do WASM, calibração de templates/modelo) e retorna uma instância pronta para uso.                         |
| **Critério de aceite** | (1) Chamada retorna Promise que resolve em ≤ 3s em conexão de 10 Mbps na primeira carga; (2) Chamadas subsequentes resolvem em ≤ 200ms (WASM em cache); (3) Erro descritivo se browser não suporta `getUserMedia` ou `WebAssembly`. |
| **Prioridade**         | **P0**                                                                                                                                                                                                                              |

---

### RF-002 — Captura via Stream de Câmera

| Campo                  | Valor                                                                                                                                                                                                                                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                 | RF-002                                                                                                                                                                                                                                                                                                                           |
| **Descrição**          | O reader deve aceitar um `HTMLVideoElement` com stream ativo (ou iniciar o stream internamente) e processar frames continuamente, emitindo resultados via callback ou AsyncIterator.                                                                                                                                             |
| **Critério de aceite** | (1) `facingMode: 'environment'` solicitado por padrão em mobile; (2) Frame de análise capturado a cada intervalo configurável (padrão: 300ms); (3) Processamento não bloqueia a thread principal (uso de Web Worker obrigatório); (4) Detecção de WKWebView emite evento `'unsupported-environment'` com mensagem de orientação. |
| **Prioridade**         | **P0**                                                                                                                                                                                                                                                                                                                           |

---

### RF-003 — Entrada via Imagem Estática

| Campo                  | Valor                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                 | RF-003                                                                                                                                                                                      |
| **Descrição**          | O reader deve aceitar como entrada uma `HTMLImageElement`, `ImageBitmap`, `File` (JPEG/PNG/WEBP) ou `Blob` e processar de forma unitária (não-stream), retornando um `Promise<CMC7Result>`. |
| **Critério de aceite** | (1) Processa arquivos JPEG e PNG; (2) Rejeita com erro tipado se o arquivo não for uma imagem válida; (3) Rejeita com `CMC7NotFoundError` se nenhuma linha CMC-7 for detectada na imagem.   |
| **Prioridade**         | **P0**                                                                                                                                                                                      |

---

### RF-004 — Pré-Processamento de Imagem

| Campo                  | Valor                                                                                                                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ID**                 | RF-004                                                                                                                                                                                                                                                       |
| **Descrição**          | Antes do OCR, a biblioteca deve aplicar automaticamente: conversão para escala de cinza, binarização adaptativa, deskew (correção de inclinação ≤ 15°) e detecção + recorte da faixa CMC-7 na região inferior do cheque.                                     |
| **Critério de aceite** | (1) A faixa CMC-7 é detectada corretamente em ≥ 90% das imagens do conjunto de teste; (2) Deskew corrige inclinações de até ±15°; (3) Processamento completo de pré-processamento em ≤ 300ms em mobile mid-range (definição: Snapdragon 695 ou equivalente). |
| **Prioridade**         | **P0**                                                                                                                                                                                                                                                       |

---

### RF-005 — OCR da Linha CMC-7

| Campo                  | Valor                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                 | RF-005                                                                                                                                                                                                                                                                                                                                                               |
| **Descrição**          | A biblioteca deve reconhecer os 15 caracteres CMC-7 (dígitos 0–9 e símbolos ⑆⑇⑈⑉⑊) na faixa detectada, usando template matching ou modelo CNN via onnxruntime-web.                                                                                                                                                                                                   |
| **Critério de aceite** | (1) Taxa de reconhecimento de caracteres individuais ≥ 95% no conjunto de teste de câmera; (2) Tempo de OCR (excluindo pré-processamento) ≤ 500ms em mobile mid-range; (3) A abordagem de reconhecimento (template matching vs CNN) é selecionável via opção de inicialização; (4) **Nota:** esta meta de acurácia é condicionada ao sucesso da PoC — ver Premissas. |
| **Prioridade**         | **P0**                                                                                                                                                                                                                                                                                                                                                               |

---

### RF-006 — Extração de Campos Estruturados

| Campo                  | Valor                                                                                                                                                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                 | RF-006                                                                                                                                                                                                                                  |
| **Descrição**          | A partir da string CMC-7 bruta reconhecida, a biblioteca deve extrair e retornar os campos estruturados: código do banco (COMPE), agência, número da conta, número do cheque e posicionamento dos símbolos delimitadores.               |
| **Critério de aceite** | (1) Retornar objeto `CMC7Fields` com campos tipados; (2) Campos não identificáveis (variação por banco sem spec mapeada) são retornados como `null` com flag `parseWarning`; (3) A string bruta completa sempre é incluída na resposta. |
| **Prioridade**         | **P0**                                                                                                                                                                                                                                  |

---

### RF-007 — Validação de Dígitos Verificadores

| Campo                  | Valor                                                                                                                                                                                                                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                 | RF-007                                                                                                                                                                                                                                                                                                      |
| **Descrição**          | A biblioteca deve validar os dígitos verificadores dos campos CMC-7 usando Módulo 10 (e Módulo 11 onde aplicável), com cobertura dos algoritmos para os maiores bancos brasileiros por volume de cheques.                                                                                                   |
| **Critério de aceite** | (1) Validação de DV retorna `ValidationResult` com status `valid`, `invalid` ou `unknown` (banco sem spec mapeada); (2) Cobertura mínima de DV: 80% do volume de cheques em circulação no Brasil (estimativa baseada nos maiores bancos COMPE); (3) Código do banco verificado contra lista COMPE completa. |
| **Prioridade**         | **P0**                                                                                                                                                                                                                                                                                                      |

---

### RF-008 — Controle de Qualidade do Frame

| Campo                  | Valor                                                                                                                                                                                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                 | RF-008                                                                                                                                                                                                                                                          |
| **Descrição**          | Antes de rodar o OCR, a biblioteca deve estimar a qualidade do frame capturado e emitir feedback ao usuário: desfoque, baixo contraste, iluminação excessiva (reflexo).                                                                                         |
| **Critério de aceite** | (1) Emitir evento `'frame-quality'` com score 0–100 e array de problemas detectados; (2) Não executar OCR em frames com score < threshold configurável (padrão: 40); (3) Sugerir ação corretiva na resposta (`'move-closer'`, `'reduce-glare'`, `'stabilize'`). |
| **Prioridade**         | **P1**                                                                                                                                                                                                                                                          |

---

### RF-009 — API de Eventos e Cancelamento

| Campo                  | Valor                                                                                                                                                                                                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                 | RF-009                                                                                                                                                                                                                                                                       |
| **Descrição**          | O reader no modo stream deve implementar um mecanismo de cancelamento e emitir eventos de ciclo de vida para integração com frameworks reativos.                                                                                                                             |
| **Critério de aceite** | (1) `reader.stop()` para o stream e libera recursos de câmera; (2) Eventos: `'reading'`, `'result'`, `'error'`, `'frame-quality'`; (3) Retornar `AsyncIterable<CMC7Result>` como alternativa ao modelo de eventos; (4) Nenhum vazamento de recursos de câmera após `stop()`. |
| **Prioridade**         | **P1**                                                                                                                                                                                                                                                                       |

---

### RF-010 — OCR de Valor Manuscrito [EXPERIMENTAL]

| Campo                  | Valor                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                 | RF-010                                                                                                                                                                                                                                                                                                                                                |
| **Descrição**          | Feature opcional (ativada via flag `experimental: true`) para tentar extrair o valor numérico do cheque (campo impresso/manuscrito em dígitos, não por extenso) via modelo leve ONNX (~5–10MB).                                                                                                                                                       |
| **Critério de aceite** | (1) Ativada explicitamente via opção e documentada como não-garantida; (2) Retorna objeto com campo `value`, `confidence` (0–1) e obrigatoriamente `requiresConfirmation: true`; (3) Não bloqueia o fluxo principal se o carregamento do modelo falhar; (4) **Nota:** Meta de acurácia não definida no MVP — feature classificada como "best-effort". |
| **Prioridade**         | **P2**                                                                                                                                                                                                                                                                                                                                                |

---

## 4. Requisitos Não-Funcionais

### RNF-001 — Performance de Processamento

| Métrica                                           | Target               | Condição                                         |
| ------------------------------------------------- | -------------------- | ------------------------------------------------ |
| Tempo total de análise por frame (pré-proc + OCR) | ≤ 800ms              | Mobile mid-range (Snapdragon 695 ou equivalente) |
| Tempo total de análise por frame                  | ≤ 300ms              | Desktop moderno                                  |
| Taxa de análise sustentada em modo stream         | ≥ 1,5 fps de análise | Mobile mid-range sem throttling térmico          |
| Inicialização (WASM já em cache)                  | ≤ 200ms              | Qualquer device                                  |
| Inicialização (primeiro carregamento, 10 Mbps)    | ≤ 3.000ms            | Qualquer device                                  |

> **Justificativa (viabilidade §2):** Mobile mid-range executa operações OpenCV complexas em 80–200ms. Com pipeline de 3–5 operações, o target de 800ms é apertado mas factível com build customizada.

---

### RNF-002 — Compatibilidade de Browsers e Dispositivos

| Plataforma                                 | Suporte                | Observação                                                                 |
| ------------------------------------------ | ---------------------- | -------------------------------------------------------------------------- |
| Chrome (desktop) 90+                       | ✅ Completo            |                                                                            |
| Firefox (desktop) 88+                      | ✅ Completo            |                                                                            |
| Safari (desktop) 14+                       | ✅ Completo            |                                                                            |
| Edge 90+                                   | ✅ Completo            |                                                                            |
| Chrome Android 90+                         | ✅ Completo            | `facingMode: 'environment'` habilitado                                     |
| Safari iOS 14.3+ (Safari nativo)           | ✅ Completo            |                                                                            |
| Chrome iOS / Firefox iOS (qualquer versão) | ⚠️ Degradado           | WKWebView sem câmera — biblioteca emite aviso e orienta abertura no Safari |
| In-app browsers (WhatsApp, Instagram) iOS  | ❌ Sem câmera          | Idem acima                                                                 |
| in-app browsers Android                    | ✅ Geralmente funciona | Depende do app — não garantido                                             |

> **Justificativa (viabilidade §1):** A limitação iOS/WKWebView é estrutural e não contornável. Detecção e aviso ao usuário é a mitigação correta.

---

### RNF-003 — Bundle Size

| Componente                                           | Tamanho máximo  | Estratégia                                                 |
| ---------------------------------------------------- | --------------- | ---------------------------------------------------------- |
| Bundle principal (JS, sem WASM)                      | ≤ 50 KB (gzip)  | Tree-shaking agressivo                                     |
| OpenCV.js WASM (lazy-loaded)                         | ≤ 4 MB          | Build customizada `core` + `imgproc`                       |
| Modelo de reconhecimento CNN (lazy-loaded, se usado) | ≤ 2 MB          | ONNX quantizado INT8                                       |
| Modelo HTR experimental (lazy-loaded, se ativado)    | ≤ 15 MB         | ONNX quantizado, carregado somente se `experimental: true` |
| **Total footprint máximo**                           | **≤ 6 MB lazy** | Nada carregado no bundle inicial                           |

> **Justificativa (viabilidade §2):** O build completo do OpenCV.js (8–9 MB) é inaceitável. Build customizada com apenas `core` + `imgproc` resulta em ~3–4 MB.

---

### RNF-004 — Privacidade e Segurança de Dados

| Requisito                           | Detalhe                                                                                               |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Zero tráfego para terceiros         | Nenhum pixel ou metadado de imagem é enviado a qualquer servidor externo                              |
| Sem telemetria                      | Nenhum beacon, analytics ou error reporting automático para servidores da biblioteca                  |
| Processamento in-browser            | Todo OCR e validação rodam no processo do browser do usuário                                          |
| Sem persistência                    | A biblioteca não armazena imagens em `localStorage`, `IndexedDB` ou cache de Service Worker           |
| Backend fallback (opcional, futuro) | Se implementado pelo consumidor, é responsabilidade do consumidor garantir TLS e política de retenção |

---

### RNF-005 — Licenciamento

| Requisito              | Detalhe                                                          |
| ---------------------- | ---------------------------------------------------------------- |
| Licença da biblioteca  | MIT                                                              |
| Dependências diretas   | Somente Apache 2.0 e MIT — nenhum copyleft                       |
| Modelos distribuídos   | Devem ter licença auditada individualmente antes de cada release |
| Fontes CMC-7 incluídas | Auditoria de licença obrigatória antes de inclusão no bundle     |

> **Premissa a validar:** A licença de modelos e fontes de terceiros ainda não foi auditada — ver §5.

---

### RNF-006 — Qualidade de Código e DX

| Requisito            | Detalhe                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------ |
| Linguagem            | TypeScript strict mode                                                                     |
| Tipos exportados     | Todas as interfaces públicas devem ter tipos exportados, sem `any` na API pública          |
| Testes unitários     | Cobertura ≥ 80% das funções de parsing e validação                                         |
| Testes de integração | Pipeline completo com imagens sintéticas de CMC-7 como golden samples                      |
| Documentação         | JSDoc em todas as funções públicas + README com exemplos de uso em React, Vue e vanilla JS |
| Publicação           | NPM package com provenance e SBOM                                                          |

---

## 5. Restrições e Premissas

### Restrições (limitam decisões — não negociáveis)

| ID   | Restrição                                                                                                                    |
| ---- | ---------------------------------------------------------------------------------------------------------------------------- |
| R-01 | Biblioteca **não pode** fazer requisições HTTP para qualquer servidor externo durante o processamento                        |
| R-02 | Licença final deve ser **MIT** — todas as dependências devem ser compatíveis                                                 |
| R-03 | Não depender de plugins de browser, extensões ou APIs experimentais sem fallback                                             |
| R-04 | HTTPS é pré-requisito para o consumidor da biblioteca (exigência da `getUserMedia`)                                          |
| R-05 | Deve funcionar como módulo ES (ESM) e CommonJS para compatibilidade máxima                                                   |
| R-06 | O bundle principal (sem lazy-load) deve ter ≤ 50 KB gzip para não penalizar o tempo de carregamento da aplicação consumidora |

### Premissas (assumidas como verdade — precisam ser validadas)

| ID   | Premissa                                                                                                               | Origem                       | Como validar                              | Impacto se falsa                                                                           |
| ---- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| P-01 | A segmentação de caracteres CMC-7 em imagens de câmera atinge ≥ 90% de acurácia após otimização do pré-processamento   | Inferida da viabilidade §3   | PoC com 100+ imagens reais de câmera      | Alto — pode inviabilizar o MVP ou exigir abordagem CRNN                                    |
| P-02 | Build customizada do OpenCV.js com apenas `core` + `imgproc` resulta em bundle ≤ 4 MB                                  | Estimativa da viabilidade §2 | Compilar e medir                          | Médio — pode exigir troca de estratégia de pré-processamento                               |
| P-03 | Existe `.traineddata` CMC-7 comunitário com licença Apache/MIT auditável                                               | [VERIFICAR] viabilidade §3A  | Pesquisa GitHub + audit de LICENSE        | Médio — se não existir, ou usar template matching/CNN, ou investir no training customizado |
| P-04 | Os headers CORP/COOP são necessários apenas para build multi-thread do OpenCV.js; build single-thread não exige        | [VERIFICAR] viabilidade §2   | Teste em ambiente real                    | Alto — pode obrigar o consumidor a configurar headers específicos no servidor              |
| P-05 | As especificações de DV por banco (para os 20 maiores bancos por volume) estão acessíveis publicamente ou via FEBRABAN | [VERIFICAR] viabilidade §5   | Pesquisa no Manual SBC e no site FEBRABAN | Alto — impacta cobertura da validação                                                      |
| P-06 | A fonte CMC-7 TTF necessária para gerar templates/dataset de treinamento tem licença compatível com redistribuição     | [VERIFICAR] viabilidade §6   | Leitura dos headers da fonte              | Alto — pode impedir distribuição do modelo                                                 |
| P-07 | onnxruntime-web com WebGL backend processa uma inferência CNN ~1MB em ≤ 200ms em mobile mid-range                      | [VERIFICAR] viabilidade §3C  | Benchmark em dispositivo físico           | Médio — pode exigir rever target de performance                                            |

---

## 6. Métricas de Sucesso

### Métricas de produto (pós-lançamento)

| Métrica                                          | Meta v1.0                                           | Método de medição                                 |
| ------------------------------------------------ | --------------------------------------------------- | ------------------------------------------------- |
| **Taxa de leitura completa (CMC-7 decode rate)** | ≥ 85% das tentativas em condições normais de câmera | Dataset de teste com 200+ cheques reais de câmera |
| **Taxa de leitura com campos válidos**           | ≥ 80% (CMC-7 lido + DV correto)                     | Subconjunto validado manualmente                  |
| **Taxa de falso positivo**                       | ≤ 2% (aceitar leitura errada como correta)          | Comparação com ground truth do dataset            |
| **Tempo médio de leitura (câmera → resultado)**  | ≤ 5 segundos em condições normais                   | Medição em sessões reais de captura               |
| **Tempo de inicialização (cold start)**          | ≤ 3s em 10 Mbps                                     | Teste em conexão controlada                       |
| **Taxa de falha silenciosa**                     | 0% — toda falha deve retornar erro tipado           | Análise de logs de erro                           |

### Métricas de adoção (comunidade)

| Métrica                              | Meta 6 meses após lançamento |
| ------------------------------------ | ---------------------------- |
| Downloads npm semanais               | ≥ 500                        |
| Stars GitHub                         | ≥ 200                        |
| Issues abertas sem resposta > 7 dias | ≤ 5                          |
| Cobertura de testes                  | ≥ 80%                        |
| Bancos com DV validado               | ≥ 10 dos maiores por volume  |

### Guardrails (o que NÃO deve acontecer)

- ❌ Taxa de falso positivo > 5% (aceitar CMC-7 inválido como válido)
- ❌ Qualquer frame ou dado de imagem enviado a servidor externo
- ❌ Crash não tratado em qualquer browser target
- ❌ Bundle inicial (sem lazy-load) > 100 KB gzip

---

## 7. Riscos e Mitigações

| #   | Risco                                                                                       | Prob. | Impacto | Mitigação                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------- | ----- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | Segmentação de CMC-7 em câmera não atinge 90% de acurácia após otimização                   | Alta  | Crítico | Realizar PoC antes de qualquer commitamento de release; ter abordagem CRNN como plano B                                                          |
| R2  | iOS WKWebView sem câmera deixa usuários de in-app browsers sem solução                      | Alta  | Alto    | Detecção automática + mensagem orientando abertura no Safari; documentar limitação no README                                                     |
| R3  | Especificações de DV por banco não estão disponíveis publicamente para cobertura suficiente | Média | Alto    | Iniciar com os 5 maiores bancos (BB, Caixa, Itaú, Bradesco, Santander) e cobrir ~70% do volume; expandir iterativamente                          |
| R4  | Build customizada do OpenCV.js resulta em > 4 MB ou não suporta as funções necessárias      | Média | Médio   | Testar `@techstark/opencv-js` como alternativa; fallback: implementar binarização + segmentação manual em Canvas API puro                        |
| R5  | Headers CORP/COOP exigidos em produção para WASM quebram deployments existentes             | Média | Médio   | Usar build single-thread do OpenCV.js; documentar os headers como necessários apenas se multi-thread for explicitamente ativado                  |
| R6  | Fonte CMC-7 TTF sem licença de redistribuição                                               | Baixa | Alto    | Gerar templates binários (~15 caracteres × 32×64px = 30KB) a partir da fonte antes do release; distribuir apenas os dados derivados, não a fonte |
| R7  | Performance insuficiente em mobile low-end (< Snapdragon 695)                               | Média | Médio   | Documentar requisitos mínimos; implementar detecção de hardware e graceful degradation (modo foto única vs stream)                               |
| R8  | Modelo CNN com licença de traineddata CMC-7 incompatível com MIT                            | Baixa | Alto    | Gerar dataset sintético 100% próprio com a fonte CMC-7 (após audit de licença) antes de treinar; documenta provenance no SBOM                    |
| R9  | Acurácia da feature HTR experimental (v1.1) cria expectativa errada no mercado              | Média | Médio   | Feature flag explícito (`experimental: true`), retorno sempre com `requiresConfirmation: true`, documentar limitações de forma proeminente       |
| R10 | Concorrente lança biblioteca similar antes do v1.0                                          | Baixa | Baixo   | Não bloqueia: foco em qualidade, DX e licença MIT clara; community-building via exemplos e documentação                                          |

---

## Apêndice A — Tipos TypeScript da API Pública (rascunho)

```typescript
// Opções de inicialização
interface CMC7ReaderOptions {
  recognitionMode?: 'template' | 'cnn'; // Padrão: 'template'
  frameIntervalMs?: number; // Padrão: 300ms
  minFrameQualityScore?: number; // Padrão: 40 (0–100)
  experimental?: {
    handwrittenValue?: boolean; // Padrão: false
  };
}

// Resultado principal
interface CMC7Result {
  raw: string; // String CMC-7 bruta reconhecida
  fields: CMC7Fields;
  validation: CMC7Validation;
  frameQuality: number; // Score 0–100
  processingTimeMs: number;
  experimental?: {
    handwrittenValue?: {
      value: string | null;
      confidence: number; // 0–1
      requiresConfirmation: true; // Sempre true
    };
  };
}

// Campos estruturados
interface CMC7Fields {
  bankCode: string | null; // Código COMPE (3 dígitos)
  agency: string | null;
  account: string | null;
  checkNumber: string | null;
  rawSymbols: string[]; // Posições dos 5 símbolos
  parseWarnings: string[]; // Ex: ['bank-spec-unknown']
}

// Resultado de validação
interface CMC7Validation {
  isValid: boolean;
  bankCodeValid: boolean | null; // null se banco desconhecido
  checkDigitsValid: 'valid' | 'invalid' | 'unknown';
  errors: CMC7ValidationError[];
}

// Erros tipados
type CMC7Error =
  | CMC7NotFoundError // Nenhuma linha CMC-7 detectada
  | CMC7UnsupportedEnvError // WKWebView / sem câmera
  | CMC7InitError // Falha no carregamento de WASM/modelo
  | CMC7InvalidInputError; // Entrada não é imagem válida

// Eventos do reader
interface CMC7ReaderEvents {
  result: (result: CMC7Result) => void;
  'frame-quality': (score: number, issues: QualityIssue[]) => void;
  error: (error: CMC7Error) => void;
  'unsupported-environment': (details: UnsupportedEnvDetails) => void;
}

type QualityIssue = 'blur' | 'low-contrast' | 'glare' | 'too-far' | 'angled';
```

---

## Apêndice B — Marcos de Entrega (proposta)

| Marco                       | Entregável                                                           | Critério de saída                                                  |
| --------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **M1 — PoC de Segmentação** | Script de benchmark com 100+ imagens de câmera                       | Acurácia de segmentação ≥ 90% OU decisão de usar CRNN              |
| **M2 — Core Engine Alpha**  | Pipeline completo (captura → OCR → validação) em repositório privado | Todos os RF P0 implementados; testes unitários ≥ 60%               |
| **M3 — Beta Pública**       | Package npm `@beta` publicado                                        | RNF de bundle e performance atingidos; README e exemplos completos |
| **M4 — v1.0 Estável**       | Release com CHANGELOG, SBOM e audit de licenças                      | Taxa de leitura ≥ 85% no dataset de teste; zero known regressions  |
| **M5 — v1.1 Experimental**  | Feature flag HTR valor manuscrito                                    | Apenas se PoC de HTR mostrar ≥ 80% acurácia em digits numéricos    |

---

_Este PRD é um documento vivo. Decisões técnicas marcadas como `[Premissa a validar]` devem ser revisadas após cada PoC e o documento atualizado antes do início do desenvolvimento do componente correspondente._
