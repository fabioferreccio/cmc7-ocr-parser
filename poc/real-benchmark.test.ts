/**
 * Benchmark de Segmentação Realista (T-002)
 * Usando a imagem real fornecida pelo usuário.
 */

import { describe, it, expect } from 'vitest';
import Jimp from 'jimp';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// --- Algoritmos (Mesma lógica, agora processando JIMP) ---

function processRealImage(image: any) {
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    
    // 1. Grayscale + Threshold (Simplificado para o PoC)
    // No cheque do BB, o fundo é claro e o texto é escuro.
    const projection = new Int32Array(height).fill(0);
    
    image.scan(0, 0, width, height, function(this: any, x: number, y: number, idx: number) {
        const r = this.bitmap.data[idx]!;
        const g = this.bitmap.data[idx+1]!;
        const b = this.bitmap.data[idx+2]!;
        const gray = (r + g + b) / 3;
        
        // Se for escuro (threshold)
        if (gray < 120) {
            projection[y]++;
            // Marcar pixel interno para visualização de debug (opcional)
        }
    });

    // 2. Detectar Faixa CMC-7 via Projeção Horizontal
    // Heurística Refinada: Ignorar os últimos 5% da imagem (evitar bordas/sombras de outros cheques)
    let bestY = -1;
    let bestH = 0;
    let maxScore = 0;

    const minHeight = Math.floor(height * 0.025); // ~15-20px em HD
    const maxHeight = Math.floor(height * 0.08);  // ~50-60px em HD

    // Procurar entre 50% e 95% da altura da imagem
    for (let y = Math.floor(height * 0.5); y < Math.floor(height * 0.92); y++) {
        let currentH = 0;
        let cumulativeDensity = 0;
        
        while (y + currentH < height && projection[y + currentH]! > width * 0.08) {
            cumulativeDensity += projection[y + currentH]!;
            currentH++;
        }
        
        if (currentH >= minHeight && currentH <= maxHeight) {
            // Pontuação baseada na densidade total e na "centralidade" da altura
            // Isso ajuda a ignorar linhas muito finas (sombras)
            const score = cumulativeDensity * (1.0 - Math.abs(currentH - (minHeight + maxHeight) / 2) / maxHeight);
            
            if (score > maxScore) {
                maxScore = score;
                bestY = y;
                bestH = currentH;
            }
        }
        
        if (currentH > 0) y += currentH;
    }

    return { y: bestY, h: bestH };
}

describe('T-002 — Benchmark Realista com Jimp', () => {
    const outputDir = join(process.cwd(), 'poc', 'results');
    
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

    it('deve localizar a linha CMC-7 no cheque real do Banco do Brasil', async () => {
        // Imagem fornecida pelo usuário na pasta poc/images
        const imagePath = join(process.cwd(), 'poc', 'images', 'input_file_0.png'); 
        
        if (!existsSync(imagePath)) {
            console.warn('⚠ Imagem input_file_0.png não encontrada. Pulando teste realista.');
            return;
        }

        const image = await Jimp.read(imagePath);
        const { y, h } = processRealImage(image);

        expect(y).toBeGreaterThan(0);
        console.log(`[T-002] Linha CMC-7 detectada em y=${y}, altura=${h}`);

        // Desenhar um retângulo vermelho onde a linha foi detectada para validação visual
        // JIMP não tem drawRect nativo simples, mas podemos pintar os pixels
        const border = 2;
        for (let ix = 0; ix < image.bitmap.width; ix++) {
            for (let iy = y; iy < y + h; iy++) {
                if (ix < border || ix > image.bitmap.width - border || iy < y + border || iy > y + h - border) {
                    image.setPixelColor(Jimp.rgbaToInt(255, 0, 0, 255), ix, iy);
                }
            }
        }

        await image.writeAsync(join(outputDir, 'real_check_detection.png'));
    });
});
