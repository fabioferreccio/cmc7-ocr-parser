# Análise de Viabilidade Técnica — Biblioteca CMC-7 OCR (TypeScript)

> **Data:** 2026-04-08  
> **Âmbito:** Biblioteca client-side TypeScript para leitura de cheques no padrão CMC-7 brasileiro

---

## Sumário Executivo

| #   | Componente                              | Veredicto                                            |
| --- | --------------------------------------- | ---------------------------------------------------- |
| 1   | Captura de câmera em tempo real         | ✅ **VIÁVEL**                                        |
| 2   | Pré-processamento de imagem client-side | ✅ **VIÁVEL COM RESSALVAS**                          |
| 3   | OCR da linha CMC-7                      | ✅ **VIÁVEL COM RESSALVAS**                          |
| 4   | OCR de texto manuscrito (valor e data)  | ⚠️ **INVIÁVEL CLIENT-SIDE** (como feature principal) |
| 5   | Validação dos dados CMC-7               | ✅ **VIÁVEL**                                        |
| 6   | Compatibilidade de licenças             | ✅ **VIÁVEL**                                        |

---

## 1. Captura de Câmera em Tempo Real

### Análise

A API padrão para captura de câmera no browser é `MediaDevices.getUserMedia()`, parte da especificação Media Capture and Streams (W3C). A API retorna um `MediaStream` que pode ser exibido diretamente em um elemento `<video>` e frames podem ser extraídos periodicamente via `<canvas>`.

**Desktop:**

- Suporte amplo: Chrome 53+, Firefox 36+, Edge 12+, Safari 11+.
- Frame rate negociável via `constraints` (`frameRate: { ideal: 30 }`), com entrega real de 15–30 fps dependendo do hardware.
- Acesso à câmera traseira/frontal via `facingMode: 'environment'`.

**Mobile (Android):**

- Chrome para Android suporta bem, incluindo `facingMode: 'environment'` para câmera traseira desde Chrome 49+.
- Performance de captura: 15–30 fps viável.

**Mobile (iOS/Safari):**

- `getUserMedia` funciona no Safari desde iOS 11, mas **apenas dentro do Safari nativo**.
- **Limitação crítica:** Em iOS, apps que usam `WKWebView` (praticamente todos os browsers de terceiros: Chrome iOS, Firefox iOS, in-app browsers de WhatsApp/Instagram) **não têm acesso à câmera** — são forçados a usar o WebKit de sistema sem permissão de câmera.
- Desde iOS 14.3, PWAs instaladas via Safari ganham acesso completo à câmera.
- Não há suporte a `ImageCapture API` no Safari; o grab de frame deve ser via `canvas.drawImage(videoElement)`.

**Frame rate viável para processamento:**

- A captura pode operar a 30 fps, mas o **processamento OCR não precisa acompanhar**.
- Estratégia padrão: processar 1 frame a cada 200–500ms (2–5 fps de análise), enquanto o vídeo flui normalmente.
- Isso é suficiente para feedback em tempo real ao usuário.

### Riscos

- **[RISCO]** iOS em WebViews de terceiros (in-app browser de WhatsApp, Instagram, etc.) não terá acesso à câmera. A biblioteca deve detectar esse cenário e orientar o usuário a abrir no Safari diretamente.
- Permissões de câmera exigem contexto HTTPS (exceto `localhost`). A biblioteca deve ser documentada para deployment HTTPS-only.
- `getUserMedia` em Firefox para Android pode ter inconsistências com `facingMode` em dispositivos com múltiplas câmeras.

### Veredicto: ✅ VIÁVEL

Com a ressalva de documentar as limitações de iOS/WKWebView e exigir HTTPS.

---

## 2. Pré-Processamento de Imagem Client-Side

### Análise

O pré-processamento é fundamental para aumentar a taxa de acerto do OCR. Para CMC-7, as operações típicas são: conversão para escala de cinza, binarização (threshold adaptativo ou Otsu), detecção e recorte da linha CMC-7, deskew (correção de inclinação) e normalização de tamanho.

**Canvas API Nativa:**

- Zero bundle overhead.
- Suporta: conversão para cinza (via `getImageData` + manipulação de pixels), redimensionamento, recorte.
- **Não suporta nativamente:** threshold adaptativo, transformações morfológicas (erosão, dilatação), detecção de bordas (Canny), Hough Transform para linhas. Para binarização básica, é necessário implementar manualmente via `getImageData` — factível mas trabalhoso.

**OpenCV.js (WASM):**

- Port oficial do OpenCV para WebAssembly, mantido pela comunidade OpenCV.
- Licença: **Apache 2.0** ✅
- Suporta virtualmente toda a API C++ do OpenCV: `threshold`, `GaussianBlur`, `Canny`, `HoughLines`, `warpAffine` (deskew), operações morfológicas, `findContours`.
- **Tamanho do bundle:** O build completo (`opencv.js`) tem **~8–9 MB** (WASM + glue JS). Build só com `core` + `imgproc`: **~3–4 MB** com build customizada.
- **Performance:** Desktop moderno — operações de threshold/blur/contornos em imagens 640×480: < 50ms. Mobile mid-range (Android) — 80–200ms por operação complexa. Aceitável para processamento a ~3–5 fps de análise.
- **Carregamento inicial:** Parse + compilação JIT do WASM: 500ms–2s na primeira carga. Após cache do browser, esse custo desaparece.

**Alternativas mais leves:**

- **`jimp`** (puro JS): Suporta threshold global, redimensionamento, recorte. Bundle ~400KB. Mais lento que WASM, mas sem overhead de inicialização.
- **`@techstark/opencv-js`**: Build customizada do OpenCV.js, mais fácil de integrar via npm com tree-shaking.
- **`sharp`**: Apenas Node.js — não aplicável ao browser.

### Riscos

- **[RISCO]** O bundle de 8–9 MB do OpenCV.js completo é pesado para uma biblioteca de terceiros. Mitigação: build customizada ou carregamento lazy somente quando necessário.
- **[VERIFICAR]** O suporte a WASM com threads (`SharedArrayBuffer`) requer headers HTTP específicos (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`). A build single-thread do OpenCV.js existe e evita esse requisito.
- Carregamento lazy do WASM (só quando o usuário inicia a captura) é a estratégia correta para não impactar o bundle inicial da aplicação consumidora.

### Veredicto: ✅ VIÁVEL COM RESSALVAS

Canvas API nativa para operações básicas; OpenCV.js via carregamento lazy e build customizada para operações avançadas. Tamanho do bundle é o principal risco a gerenciar.

---

## 3. OCR da Linha CMC-7

### Análise

Esta é a peça central da biblioteca. CMC-7 é uma fonte **tipográfica padronizada** criada pela Bull (1957), usada em cheques brasileiros (padrão FEBRABAN), franceses e de outros países que adotaram o padrão ISO 1004. Ao contrário de texto manuscrito, os caracteres são **fixos e previsíveis**.

A linha CMC-7 em cheques brasileiros contém:

- `⑆` `⑇` `⑈` `⑉` `⑊` — 5 símbolos especiais de delimitação
- Os 10 dígitos numéricos (0–9)

**Total: 15 classes de caracteres — alfabeto extremamente reduzido.**

Estrutura típica da linha:

```
⑆ [banco][agência/conta][cheque] ⑆ [valor-codificado] ⑇ [N] ⑈ [banco] ⑉ [conta] ⑊
```

---

### Sub-análise 3A: Tesseract.js

- Licença **Apache 2.0** ✅
- Tesseract 4.x/5.x usa LSTM para reconhecimento de texto.
- **Suporte nativo a CMC-7:** ❌ Não existe `.traineddata` oficial para CMC-7 no repositório padrão. Existe traineddata para **MICR E-13B** (padrão americano), mas E-13B e CMC-7 são **fontes distintas** com morfologia de caracteres diferente.
- **[VERIFICAR]** Existem projetos comunitários com `.traineddata` para CMC-7 em GitHub, mas qualidade e licença precisam ser auditadas antes de uso.
- **Treinamento customizado:** Possível via toolchain `tesstrain`. Processo: (1) gerar imagens sintéticas com fonte TTF CMC-7; (2) preparar ground truth; (3) fine-tuning LSTM; (4) exportar `.traineddata` (~1–5 MB). Esforço: alto (1–2 semanas), mas é one-time effort.
- **Performance em browser:** Worker-based, não bloqueia UI. Linha de texto simples: 500ms–2s. Aceitável para uso não-contínuo.

---

### Sub-análise 3B: Template Matching (sem ML)

Esta abordagem é **altamente viável** para CMC-7, pelas seguintes razões:

1. A fonte é padronizada — formas geométricas fixas e previsíveis.
2. Alfabeto pequeno — apenas 15 classes.
3. Os caracteres CMC-7 têm espaçamento definido pelo padrão.
4. Sem variabilidade de "caligrafia".

**Pipeline:**

1. **Binarização:** Otsu threshold ou threshold adaptativo local.
2. **Detecção da faixa CMC-7:** Análise de projeção horizontal na região inferior do cheque (maior densidade de pixels escuros).
3. **Deskew:** Correção de inclinação via `HoughLines` ou bounding boxes dos componentes conectados.
4. **Segmentação de caracteres:** Componentes conectados (`findContours`) ou projeção vertical (colunas vazias = separadores).
5. **Normalização:** Redimensionar cada caractere para tamanho padrão (ex: 32×64 px).
6. **Matching:** Correlação cruzada normalizada (`matchTemplate`) contra os 15 templates. Maior correlação = caractere reconhecido.

**Acurácia esperada:** 95%+ em imagens de boa qualidade. Degrada com: baixo contraste, cheques amassados, iluminação desuniforme.

---

### Sub-análise 3C: Modelo CNN via ONNX Runtime Web

- CNN simples (LeNet ou MobileNetV1 adaptado) com 15 classes pode alcançar >99% de acurácia em CMC-7 pós-segmentação.
- Tamanho do modelo: **~500KB–2MB** em formato ONNX quantizado.
- **onnxruntime-web:** Licença **MIT** ✅. Executa modelos ONNX no browser via WASM ou WebGL.
- Inferência de um classificador 32×64 → 15 classes: < 10ms por caractere.
- Dataset sintético de treinamento: gerado facilmente com scripts Python usando a fonte CMC-7 TTF + augmentation (ruído, rotação leve, variação de contraste).
- **[VERIFICAR]** Uma abordagem end-to-end (CRNN) que aceita a linha inteira eliminaria o passo de segmentação, mas o modelo seria maior (~5–20MB).

---

### Riscos

- **[RISCO]** A **segmentação correta** dos caracteres CMC-7 em imagens de câmera (não scanner) é o maior desafio técnico. Câmeras introduzem: distorção de perspectiva, reflexo, granulação, variação de iluminação. A robustez do pré-processamento é crítica.
- Tesseract.js sem treinamento específico para CMC-7 é inútil para este caso. Usar E-13B traineddata seria um erro.
- **[VERIFICAR]** A existência de projetos open-source maduros de segmentação de CMC-7 em imagens de câmera (vs. scanner) é incerta — pode ser necessário desenvolvimento original.

### Veredicto: ✅ VIÁVEL COM RESSALVAS

**Abordagem recomendada:** Template matching ou classificador CNN pequeno (~1MB ONNX) via onnxruntime-web, com pipeline robusto de pré-processamento. Tesseract.js com traineddata customizado é alternativa viável mas com maior custo de setup. O esforço de desenvolvimento da segmentação é o risco principal.

---

## 4. OCR de Texto Manuscrito (Valor e Data)

### Análise

HTR (Handwritten Text Recognition) é substancialmente mais difícil que OCR de fontes impressas.

**Estado da arte (2025–2026):**

- Modelos como **TrOCR** (Microsoft), **PaddleOCR** (Baidu) e **Donut** (Naver) têm alta acurácia para HTR.
- Tamanhos típicos: **300MB–1.5GB** para modelos completos. Não viáveis para browser.

**Opções client-side:**

- **Modelos destilados/quantizados:** Versões comprimidas podem chegar a ~50–100MB em ONNX. Tecnicamente executáveis via onnxruntime-web com WebGL, mas grandes para uma biblioteca.
- **Tesseract.js modo handwriting:** Performance muito baixa para cursivo. Taxa de erro >40% sem fine-tuning massivo. Inaceitável para produção.
- **Modelos de dígitos numéricos (MNIST-like):** Um modelo de classificação de dígitos isolados pode ser ~1–2MB, mas reconhecimento de **sequências** (ex: `1.250,00`) exige CRNN/LSTM, que é maior e menos preciso para manuscrito.
- **Contexto de cheques:** O campo de valor numérico (sequência de dígitos + vírgula) é mais factível que o valor por extenso. A data em formato DD/MM/AAAA em letra de forma é mais factível que cursivo.

**[RISCO] Avaliação realista:**

- Dígitos manuscritos em letra de forma: modelo leve (~5–10MB) via onnxruntime-web com acurácia ~80–90% em condições ideais.
- Cursivo ou texto por extenso manuscrito: **não existe solução client-side viável** com acurácia aceitável em dispositivos consumer.

**Abordagem recomendada:**

1. **Client-side (best-effort):** Modelo leve para o campo numérico do valor + UI de confirmação obrigatória.
2. **Backend próprio (fallback):** Endpoint self-hosted com TrOCR ou similar servido via FastAPI. Mantém o requisito de "zero tráfego para terceiros".

### Riscos

- **[RISCO]** Não existe biblioteca client-side com licença aberta que forneça HTR de qualidade aceitável para português brasileiro em browser mobile no estado atual da arte.
- **[RISCO]** Mesmo com backend próprio, envio de imagem com dados financeiros exige TLS, autenticação e política de retenção de logs clara.

### Veredicto: ⚠️ INVIÁVEL CLIENT-SIDE (como feature principal)

Recomendação: (1) best-effort client-side para campo numérico com UI de confirmação; (2) backend fallback self-hosted para HTR de qualidade; (3) essa feature deve ser opcional e documentada como "experimental" na versão 1.x.

---

## 5. Validação dos Dados CMC-7

### Análise

A linha CMC-7 em cheques brasileiros segue especificação da FEBRABAN. Cada campo tem seu próprio dígito verificador.

**Estrutura geral da linha CMC-7 brasileira:**

```
⑆ [banco 3d][agência 4d][conta 7d][cheque 6d][DV] ⑆ [valor 10d][DV] ⑇ [N] ⑈ [banco 10d][DV] ⑉ [conta 10d][DV] ⑊
```

_(Estrutura simplificada; varia por banco)_

**Algoritmos de validação:**

- **Módulo 10:** Mais comum nos campos CMC-7. Pesos alternados 2 e 1 da direita para a esquerda; soma dos dígitos dos produtos; DV = `(10 - (soma % 10)) % 10`.
- **Módulo 11:** Usado em alguns campos de conta bancária. Pesos 2–7 (ou 2–9) da direita para a esquerda; DV = `11 - (soma % 11)` (com regras para restos 0 e 1).

**Campos validáveis automaticamente:**

- ✅ Código do banco — verificar contra lista COMPE pública (~200 bancos)
- ✅ Dígitos verificadores dos campos com algoritmo conhecido
- ✅ Contagem e posicionamento dos 5 símbolos especiais
- ✅ Comprimento total da linha dentro do padrão esperado
- ⚠️ Número de cheque — algoritmo de DV depende do banco
- ❌ Valor inscrito na linha vs. valor escrito no cheque — requer HTR

**[VERIFICAR]** A especificação exata dos pesos e campos **varia por banco**. O padrão FEBRABAN define a estrutura geral, mas cada banco tem autonomia na formatação do campo agência/conta. Mapeamento por código de banco é necessário para validação completa.

### Riscos

- **[RISCO]** Especificação completa por banco não está em uma única fonte pública acessível. Curatorial manual necessário para cada banco suportado.
- **[VERIFICAR]** O Manual de Normas Técnicas do SBC (Sistema de Compensação Bancária) da FEBRABAN é a referência principal. Algumas partes são públicas, outras requerem associação.

### Veredicto: ✅ VIÁVEL

Validação 100% client-side, determinística, sem dependências externas. O esforço está na curatorial dos algoritmos por banco, não na implementação técnica.

---

## 6. Compatibilidade de Licenças

### Análise

| Dependência                        | Licença    | Uso proposto            | Compatível MIT? |
| ---------------------------------- | ---------- | ----------------------- | --------------- |
| Tesseract.js                       | Apache 2.0 | OCR engine              | ✅ Sim          |
| OpenCV.js / `@techstark/opencv-js` | Apache 2.0 | Pré-processamento       | ✅ Sim          |
| onnxruntime-web                    | MIT        | Inferência de modelos   | ✅ Sim          |
| TensorFlow.js                      | Apache 2.0 | Inferência alternativa  | ✅ Sim          |
| `jimp`                             | MIT        | Processamento básico JS | ✅ Sim          |
| Canvas API (browser nativo)        | N/A        | Captura e manipulação   | ✅ Sem licença  |
| MediaDevices API (browser nativo)  | N/A        | Captura de câmera       | ✅ Sem licença  |

**Riscos de copyleft:**

- Nenhuma das dependências principais usa GPL, LGPL ou AGPL.
- **[VERIFICAR]** Modelos pré-treinados (`.traineddata` do Tesseract, modelos ONNX de terceiros) podem ter licenças **independentes** da engine que os executa. Qualquer modelo de terceiros deve ter licença auditada antes de redistribuição.
- O Tesseract engine C++ e os dados padrão (`tessdata`) são Apache 2.0.

**Fontes CMC-7:**

- A fonte tipográfica CMC-7 (para geração de templates e dados de treinamento sintéticos) está disponível em vários repositórios públicos.
- **[VERIFICAR]** A licença específica de cada variante da fonte CMC-7 TTF disponível publicamente deve ser auditada antes de incluir os arquivos no bundle da biblioteca.

### Veredicto: ✅ VIÁVEL

O stack principal (Apache 2.0 + MIT) é integralmente compatível com distribuição como MIT. Os únicos pontos de atenção são modelos e fontes de terceiros, que precisam de auditoria individual.

---

## Auto-verificação

### Afirmações com alta confiança

- Estrutura da API `getUserMedia` e limitações de iOS/WKWebView
- Bundle size do OpenCV.js ~8–9 MB para build completa
- Ausência de `.traineddata` oficial CMC-7 no repositório padrão do Tesseract
- Viabilidade técnica de template matching para fontes tipográficas padronizadas
- Inviabilidade de HTR de qualidade para manuscrito cursivo no browser com tecnologia atual
- Licenças Apache 2.0 / MIT do núcleo das dependências avaliadas

### Itens a verificar antes do desenvolvimento

| Item                                                                    | Prioridade | Como verificar                               |
| ----------------------------------------------------------------------- | ---------- | -------------------------------------------- |
| Traineddata CMC-7 comunitário com licença auditada                      | Alta       | GitHub search + leitura de LICENSE dos repos |
| Requisito CORP/COOP headers para OpenCV.js com WASM threads             | Alta       | Testar build single-thread vs multi-thread   |
| Especificações FEBRABAN por banco (algoritmos de DV)                    | Alta       | Manual SBC + scraping do site FEBRABAN       |
| Performance onnxruntime-web em mobile mid-range para CNN ~1MB           | Média      | PoC com dispositivo físico                   |
| Licença da fonte CMC-7 TTF disponível publicamente                      | Alta       | Leitura dos cabeçalhos das fontes candidatas |
| Existência de PoC open-source de segmentação CMC-7 em imagens de câmera | Média      | GitHub search                                |

---

## Parecer Consolidado

### Projeto como um todo: **VIÁVEL COM ESCOPO AJUSTADO**

O projeto é técnica e legalmente viável para sua funcionalidade **core** — leitura e validação da linha CMC-7 impressa. Este componente pode operar **100% client-side**, sem tráfego de dados para terceiros, com licenças MIT/Apache 2.0 e performance aceitável em mobile.

### Arquitetura recomendada

```
┌─────────────────────────────────────────────────────────┐
│                  CORE (v1.0 — must-have)                │
│                                                         │
│  ✅ Captura câmera     → MediaDevices API               │
│  ✅ Pré-processamento  → Canvas API + OpenCV.js lazy    │
│  ✅ CMC-7 OCR          → Template matching OU CNN ONNX  │
│  ✅ Validação CMC-7    → Algoritmos determinísticos      │
│                                                         │
│  Dependências: onnxruntime-web (MIT) + opencvjs (Apache)│
│  Bundle estimado: ~2–5 MB (lazy-loaded)                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              OPCIONAL (v1.x — feature flag)             │
│                                                         │
│  ⚠️  HTR campo numérico do valor (best-effort)          │
│      → Modelo leve ONNX ~5MB para dígitos              │
│      → UI de confirmação obrigatória                    │
│      → Documentado como "experimental"                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              BACKEND FALLBACK (opcional)                │
│                                                         │
│  📡 Endpoint próprio para HTR de qualidade              │
│      → Self-hosted (ex: FastAPI + TrOCR)               │
│      → Sem tráfego para servidores terceiros            │
│      → Apenas para clientes que precisam de HTR         │
└─────────────────────────────────────────────────────────┘
```

### Próximos passos recomendados

1. **PoC de segmentação CMC-7:** Implementar pipeline de segmentação + template matching com 20–30 imagens de cheques reais (câmera, não scanner). Validar acurácia antes de comprometer a arquitetura.
2. **Audit de traineddata CMC-7:** Verificar GitHub para `.traineddata` com licença Apache/MIT.
3. **Build customizada do OpenCV.js:** Avaliar `@techstark/opencv-js` com build mínima (`core` + `imgproc` apenas).
4. **Mapa de bancos:** Levantar especificações FEBRABAN/SBC para os 20 maiores bancos brasileiros (por volume de cheques).
5. **Decisão template matching vs. CNN:** Benchmark com câmera real em condições variadas de iluminação. CNN oferece maior robustez a variações, mas exige esforço de treinamento.

---

_Documento gerado como análise técnica de viabilidade. Os itens marcados com `[VERIFICAR]` devem ser validados com pesquisa adicional ou protótipos antes de iniciar o desenvolvimento. Os itens marcados com `[RISCO]` devem ter planos de mitigação explícitos antes de iniciar cada componente._
