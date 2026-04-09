# OpenCV.js - Assets e Referência (T-003)

Este diretório contém a documentação sobre a build do OpenCV.js utilizada no projeto.

## Estratégia de Build: Referência Homologada

Para garantir o cumprimento dos requisitos arquiteturais (**RNF-003: Tamanho <= 4MB** e **RP-02: Single-thread**), o projeto utiliza uma build pré-compilada homologada e integrada via um wrapper ESM.

### Asset homologado
- **Build:** TechStark OpenCV-JS v4.9.0-release.2
- **Tamanho total (JS+WASM):** **~3.45 MB** (JS: 266KB, WASM: 3.18MB)
- **Local de runtime:** `dist/wasm/opencv.js` e `dist/wasm/opencv_js.wasm`
- **Fonte canônica no repositório:** `tools/opencv/assets/`
- **Interface:** `src/wasm/opencv-loader.ts`

## Repor assets em `dist/wasm`

Se você apagar `dist/wasm`, rode:

```bash
npm run opencv:prepare
```

Esse comando copia os binários de `tools/opencv/assets` para `dist/wasm`.
Como fallback, ele tenta obter de `node_modules/@techstark/opencv-js` se instalado.

---

## Integração e escalabilidade

Conforme decidido no plano estratégico de resolução da T-003:
- **Curto prazo:** uso deste asset via loader dinâmico.
- **Longo prazo:** a interface `OpenCVSubset` permite trocar OpenCV por um módulo WASM customizado sem alterar a lógica de consumo.

## Como reconstruir (referência)

Recomenda-se realizar builds customizadas apenas se houver necessidade de reduzir ainda mais o tamanho final.
1. Requisitos: Docker e WSL2/Linux.
2. Script de build: `platforms/js/build_js.py` com whitelist limitada.
