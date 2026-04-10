import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FrameSampler } from './frame-sampler.js';
import { mockVideoElement, mockImageBitmap } from '../test-helpers/mocks.js';

describe('FrameSampler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockImageBitmap()));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('deve extrair frames a cada frameIntervalMs (padrão 300ms)', async () => {
    const video = mockVideoElement();
    const sampler = new FrameSampler(video, { frameIntervalMs: 300 });
    const frameSpy = vi.fn();
    sampler.on('frame', frameSpy);

    sampler.start();
    
    await vi.advanceTimersByTimeAsync(300);
    expect(frameSpy).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(300);
    expect(frameSpy).toHaveBeenCalledTimes(2);
  });

  it('deve criar ImageBitmap transferível a partir do videoElement', async () => {
    const video = mockVideoElement();
    const sampler = new FrameSampler(video);
    const frameSpy = vi.fn();
    sampler.on('frame', frameSpy);

    sampler.start();
    await vi.advanceTimersByTimeAsync(300);

    expect(globalThis.createImageBitmap).toHaveBeenCalledWith(video);
    expect(frameSpy).toHaveBeenCalledWith(expect.any(Object)); // ImageBitmap
  });

  it('deve parar de emitir frames após stop() ser chamado', async () => {
    const video = mockVideoElement();
    const sampler = new FrameSampler(video);
    const frameSpy = vi.fn();
    sampler.on('frame', frameSpy);

    sampler.start();
    await vi.advanceTimersByTimeAsync(300);
    sampler.stop();
    await vi.advanceTimersByTimeAsync(300);

    expect(frameSpy).toHaveBeenCalledTimes(1);
  });

  it('deve não emitir frames se videoElement não tiver dimensões (altura = 0)', async () => {
    const video = mockVideoElement(0, 0);
    const sampler = new FrameSampler(video);
    const frameSpy = vi.fn();
    sampler.on('frame', frameSpy);

    sampler.start();
    await vi.advanceTimersByTimeAsync(300);

    expect(frameSpy).not.toHaveBeenCalled();
  });

  it('deve respeitar frameIntervalMs customizado via options', async () => {
    const video = mockVideoElement();
    const sampler = new FrameSampler(video, { frameIntervalMs: 100 });
    const frameSpy = vi.fn();
    sampler.on('frame', frameSpy);

    sampler.start();
    await vi.advanceTimersByTimeAsync(100);
    expect(frameSpy).toHaveBeenCalledTimes(1);
  });
});
