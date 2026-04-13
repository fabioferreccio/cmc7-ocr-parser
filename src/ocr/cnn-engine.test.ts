import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CNNEngine } from './cnn-engine';

// Mock onnxruntime-web
const mockRun = vi.fn();
const mockCreate = vi.fn().mockResolvedValue({
  run: mockRun,
});

vi.mock('onnxruntime-web', () => {
  return {
    InferenceSession: {
      create: (...args: any[]) => mockCreate(...args),
    },
    Tensor: class {
      type: string;
      data: Float32Array;
      dims: number[];
      constructor(type: string, data: Float32Array, dims: number[]) {
        this.type = type;
        this.data = data;
        this.dims = dims;
      }
    },
  };
});

describe('CNNEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar modelo ONNX lazily (não no import)', async () => {
    const engine = new CNNEngine();
    expect(mockCreate).not.toHaveBeenCalled();
    
    await engine.init('/models/cmc7-cnn.onnx');
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith('/models/cmc7-cnn.onnx', expect.any(Object));
  });

  it('deve não crashar se onnxruntime-web falhar ao carregar (retorna CMC7InitError)', async () => {
    const engine = new CNNEngine();
    mockCreate.mockRejectedValueOnce(new Error('Network error'));
    
    await expect(engine.init('/models/cmc7-cnn.onnx')).rejects.toMatchObject({
      type: 'INIT_ERROR',
      cause: 'model-load-failed'
    });
  });

  it('deve reusar sessão ONNX entre múltiplas inferências (não recria a cada call)', async () => {
    const engine = new CNNEngine();
    await engine.init('/models/cmc7-cnn.onnx');
    
    const dummyImage = new Uint8Array(32 * 64).fill(255);
    mockRun.mockResolvedValue({ output: { data: new Float32Array(15).fill(0.1) } });
    
    await engine.recognize(dummyImage);
    await engine.recognize(dummyImage);
    
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockRun).toHaveBeenCalledTimes(2);
  });

  it('deve processar tensor [1, 1, 64, 32] e retornar [1, 15] logits', async () => {
    const engine = new CNNEngine();
    await engine.init('/models/cmc7-cnn.onnx');
    
    const dummyImage = new Uint8Array(32 * 64).fill(255);
    const mockOutput = new Float32Array(15).fill(0.01);
    mockOutput[0] = 0.95; // Confiança alta no caractere 0 ('0')
    mockRun.mockResolvedValue({ output: { data: mockOutput } });
    
    const result = await engine.recognize(dummyImage);
    
    expect(mockRun).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({
        dims: [1, 1, 64, 32]
      })
    }));
    expect(result.char).toBe('0');
    expect(result.score).toBeGreaterThan(0.90);
  });

  it('deve reconhecer cada um dos 15 caracteres CMC-7 com confiança > 0.90', async () => {
    const engine = new CNNEngine();
    await engine.init('/models/cmc7-cnn.onnx');
    
    const chars = ['0','1','2','3','4','5','6','7','8','9','\u2446','\u2447','\u2448','\u2449','\u244A'];
    
    for (let i = 0; i < chars.length; i++) {
      const mockOutput = new Float32Array(15).fill(0.01);
      mockOutput[i] = 0.99;
      mockRun.mockResolvedValueOnce({ output: { data: mockOutput } });
      
      const res = await engine.recognize(new Uint8Array(32 * 64));
      expect(res.char).toBe(chars[i]);
      expect(res.score).toBeGreaterThan(0.90);
    }
  });

  it('deve completar inferência em < 200ms (mock de onnxruntime em Node)', async () => {
    const engine = new CNNEngine();
    await engine.init('/models/cmc7-cnn.onnx');
    
    const mockOutput = new Float32Array(15).fill(0.01);
    mockOutput[5] = 0.92;
    mockRun.mockResolvedValue({ output: { data: mockOutput } });
    
    const start = performance.now();
    await engine.recognize(new Uint8Array(32 * 64));
    const end = performance.now();
    
    expect(end - start).toBeLessThan(200);
  });
});
