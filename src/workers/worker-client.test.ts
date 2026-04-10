import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkerClient } from './worker-client.js';
import { mockImageBitmap } from '../test-helpers/mocks.js';

describe('WorkerClient', () => {
  let client: WorkerClient;

  beforeEach(() => {
    // global.Worker is already mocked in setup.ts
    client = new WorkerClient();
  });

  it('deve inicializar o worker e enviar mensagem de init', () => {
    vi.spyOn(globalThis, 'Worker');
    client.init({ assetsBaseUrl: '/assets' });
    
    expect(globalThis.Worker).toHaveBeenCalled();
  });

  it('deve enviar ImageBitmap usando Transferable Objects', async () => {
    client.init();
    const bitmap = mockImageBitmap(100, 100);
    const postMessageSpy = vi.spyOn(client['worker']!, 'postMessage');

    client.process(bitmap);

    // O segundo argumento de postMessage deve conter o bitmap para transferência
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'process' }),
      expect.arrayContaining([bitmap])
    );
  });

  it('deve encerrar o worker corretamente ao chamar terminate()', () => {
    client.init();
    const terminateSpy = vi.spyOn(client['worker']!, 'terminate');
    
    client.terminate();
    expect(terminateSpy).toHaveBeenCalled();
    expect(client['worker']).toBeNull();
  });

  it('deve emitir eventos de resposta do worker', async () => {
    client.init();
    const resultSpy = vi.fn();
    client.on('result', resultSpy);

    // Simula mensagem vinda do worker
    const mockEvent = new MessageEvent('message', {
      data: { type: 'result', payload: { raw: '123' } }
    });
    
    client['worker']!.onmessage!(mockEvent);
    
    expect(resultSpy).toHaveBeenCalledWith(expect.objectContaining({ raw: '123' }));
  });
});
