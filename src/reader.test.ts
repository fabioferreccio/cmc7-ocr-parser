import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCMC7Reader } from './index.js';
import { CMC7Reader } from './types/index.js';

describe('CMC7Reader Shell & Event System', () => {
  it('createCMC7Reader() deve retornar instance de CMC7Reader', async () => {
    const reader = await createCMC7Reader();
    expect(reader).toBeDefined();
    expect(typeof reader.on).toBe('function');
    expect(typeof reader.start).toBe('function');
  });

  it('reader.on("result", handler) deve registrar handler e emitir quando acionado', async () => {
    const reader = await createCMC7Reader();
    const handler = vi.fn();
    
    reader.on('result', handler);
    
    // Simulating internal event emission (assuming we expose a way to trigger or just testing implementation)
    // For now, since it's a shell, we might need a way to mock the internal emission.
    // In a real shell, we'd trigger a private method.
    (reader as any).emit('result', { raw: '123' });
    
    expect(handler).toHaveBeenCalledWith({ raw: '123' });
  });

  it('reader.off("result", handler) deve remover handler', async () => {
    const reader = await createCMC7Reader();
    const handler = vi.fn();
    
    reader.on('result', handler);
    reader.off('result', handler);
    (reader as any).emit('result', { raw: '123' });
    
    expect(handler).not.toHaveBeenCalled();
  });

  it('deve suportar múltiplos handlers para o mesmo evento', async () => {
    const reader = await createCMC7Reader();
    const h1 = vi.fn();
    const h2 = vi.fn();
    
    reader.on('result', h1);
    reader.on('result', h2);
    (reader as any).emit('result', { raw: '123' });
    
    expect(h1).toHaveBeenCalled();
    expect(h2).toHaveBeenCalled();
  });

  it('reader.stop() deve resolver mesmo se start() nunca foi chamado', async () => {
    const reader = await createCMC7Reader();
    await expect(reader.stop()).resolves.toBeUndefined();
  });

  it('deve ser iterável com "for await...of"', async () => {
    const reader = await createCMC7Reader();
    expect(reader[Symbol.asyncIterator]).toBeDefined();
    
    // Testing async iterator is tricky in a shell, but we can verify it exists
    const iterator = reader[Symbol.asyncIterator]();
    expect(typeof iterator.next).toBe('function');
  });
});
