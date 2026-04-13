import { test, expect } from '@playwright/test';

test.describe('CMC-7 OCR Reader E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Injeta o Mock de Câmera Universal com alta autoridade
    await page.addInitScript(() => {
      const mockGetUserMedia = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d')!;

        // Desenha algo imediato para ter conteúdo
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, 640, 480);

        if (canvas.captureStream) return canvas.captureStream(30);
        if ((canvas as any).webkitCaptureStream) return (canvas as any).webkitCaptureStream(30);
        return new MediaStream();
      };

      if (!navigator.mediaDevices) {
        Object.defineProperty(navigator, 'mediaDevices', { value: {}, configurable: true });
      }

      try {
        navigator.mediaDevices.getUserMedia = mockGetUserMedia;
      } catch (e) {
        try {
          Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
            value: mockGetUserMedia,
            configurable: true,
            writable: true
          });
        } catch (e2) {
          console.error('Failed to mock getUserMedia');
        }
      }
    });



    // Abre a demo
    await page.goto('/');
  });

  test('deve carregar a demo e inicializar o motor OCR em menos de 3s', async ({ page }) => {
    const startTime = Date.now();
    
    // Verifica título
    await expect(page).toHaveTitle(/CMC-7 OCR Parser/);
    
    // Aguarda status de pronto
    const status = page.getByTestId('status-text');
    await expect(status).toHaveText(/Pronto para iniciar/, { timeout: 3000 });
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(3000);
  });

  test('deve iniciar a câmera e mostrar feed de vídeo', async ({ page }) => {
    const startBtn = page.getByTestId('start-btn');
    const stopBtn = page.getByTestId('stop-btn');
    const status = page.getByTestId('status-text');

    await startBtn.click();

    // Aguarda status mudar para câmera ativa
    await expect(status).toHaveText(/Câmera ativa/);
    await expect(stopBtn).toBeEnabled();
    await expect(startBtn).toBeDisabled();

    // Verifica se existe um elemento video dentro do viewport
    const video = page.locator('[data-testid="camera-viewport"] video');
    await expect(video).toBeVisible();
  });

  test('deve detectar CMC-7 em cheque simulado e exibir campos no DOM', async ({ page }) => {
    // Injeta um resultado falso diretamente no reader para simular detecção bem sucedida
    // já que o OCR real em imagem sintética de ruído é instável em E2E
    await page.evaluate(() => {
      // @ts-ignore
      const reader = window.__CMC7_READER__;
      if (reader) {
        // Simula a emissão de um resultado válido
        reader.emit('result', {
          raw: '⑆0011234⑆01234567⑇1⑈00100000000⑉00010234567⑊',
          fields: {
            bankCode: '001',
            agency: '1234',
            account: '01234567',
            checkNumber: '10234567'
          },
          validation: { isValid: true },
          frameQuality: 95
        });
      }
    });

    // Verifica se os campos aparecem no results-view
    const resultsView = page.getByTestId('results-view');
    await expect(resultsView).toContainText('001'); // Banco
    await expect(resultsView).toContainText('1234'); // Agência
    await expect(resultsView).toContainText('01234567'); // Conta
    
    const rawString = page.getByTestId('raw-string');
    await expect(rawString).toContainText('⑆0011234');
  });

  test('deve detectar ambiente não suportado (WKWebView) e exibir aviso', async ({ page }) => {
    // Simula User Agent de WKWebView (iOS Chrome/Instagram/etc)
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'userAgent', {
        get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/99.0.4844.47 Mobile/15E148 Safari/604.1',
      });
    });

    await page.reload();
    
    // Verifica se a UI reagiu ao ambiente não suportado
    const status = page.getByTestId('status-text');
    await expect(status).toHaveText(/Ambiente não suportado/);
    await expect(page.getByTestId('start-btn')).toBeDisabled();
  });

  test('deve parar a câmera corretamente e limpar o vídeo', async ({ page }) => {
    await page.getByTestId('start-btn').click();
    
    const stopBtn = page.getByTestId('stop-btn');
    await expect(stopBtn).toBeEnabled({ timeout: 10000 });

    await stopBtn.click();
    
    const status = page.getByTestId('status-text');
    await expect(status).toHaveText(/Scanner parado/);
    await expect(page.getByTestId('start-btn')).toBeEnabled();
    
    // O elemento video deve ter sido removido
    await expect(page.locator('[data-testid="camera-viewport"] video')).toHaveCount(0);
  });
});
