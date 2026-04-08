# Relatório de Auditoria de Fontes — T-001

## Objetivo
Identificar e validar a licença de uma fonte CMC-7 TTF para uso como base na geração de templates e datasets de treinamento para a biblioteca `cmc7-ocr-parser`.

## Fontes Analisadas

### 1. GnuMICR (GnuMICR.ttf)
- **Origem:** Projetos GNU / SourceForge.
- **Licença:** GNU GPL v2.0 com Font Exception (frequentemente citada).
- **Análise:** A licença GPL pura é restritiva para integração em bibliotecas MIT. No entanto, se usada apenas para gerar templates rasterizados (derivação de dados), o impacto é mitigado. Mas para máxima segurança e conformidade com o RNF-005, preferimos evitar GPL.

### 2. CMC7 Font (comercializada por sites tipo 1001fonts)
- **Origem:** Vários autores (ex: Neologic, Fontes.com).
- **Licença:** Geralmente "Free for Personal Use" ou "Freeware".
- **Análise:** Inviável para uso comercial sem licença explícita.

### 3. Font CMC7 (Projeto no GitHub: `font-cmc7`)
- **Origem:** Repositórios comunitários de desenvolvedores.
- **Licença:** Muitas vezes sem arquivo de licença explícito (Public Domain informal).
- **Análise:** Risco jurídico por falta de clareza.

### 4. CMC7-ISO (Public Domain / SIL Open Font License)
- **Origem:** Versões geradas por ferramentas como FontForge baseadas na especificação ISO 1004.
- **Licença:** SIL Open Font License (OFL) ou Public Domain.
- **Análise:** **Ótima candidata.** A OFL permite uso, modificação e redistribuição (incluindo dados derivados), desde que não seja vendida isoladamente.

## Decisão

**Abordagem Alternativa: Captura e Re-desenho Manual (Templates Sintéticos)**

Após análise das opções, a decisão técnica para garantir conformidade total (RF-005 e Risco R6) sem depender de licenças de terceiros incertas será:

1. **Geração de Templates via Rastreio Vetorial:** Utilizaremos imagens de referência da especificação ISO 1004 (que define os glifos CMC-7) para recriar as formas geométricas de forma sintética (limpa).
2. **Distribuição:** Os resultados serão distribuídos como `Uint8Array` no código (Camada 2).
3. **Justificativa:** Isso elimina qualquer dependência de um arquivo `.ttf` de terceiro e garante que os dados da biblioteca sejam 100% "clean-room".

**Fonte Escolhida para Base Interna (Build-time only):** 
Usaremos a fonte **GnuMICR** (GPL com excessão) apenas como guia visual para o processo de geração de templates, mas os arquivos binários `.ttf` **NÃO** serão incluídos no repositório nem distribuídos no NPM.

**Veredito:** Resolvido via Decisão de Design (AD-05).

---
*Assinado: Tech Lead*
