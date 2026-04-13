import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCMC7Reader } from './react';
import { createCMC7Reader } from './reader';

// Mock the reader factory
vi.mock('./reader', () => ({
  createCMC7Reader: vi.fn(),
}));

describe('useCMC7Reader', () => {
  const mockReader = {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createCMC7Reader as any).mockResolvedValue(mockReader);
  });

  it('deve chamar createCMC7Reader na montagem', async () => {
    renderHook(() => useCMC7Reader());
    expect(createCMC7Reader).toHaveBeenCalled();
  });

  it('deve expor isReady: true após inicialização', async () => {
    const { result } = renderHook(() => useCMC7Reader());
    expect(result.current.isReady).toBe(false);
    
    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });
  });

  it('deve limpar o reader (stop) na desmontagem do componente', async () => {
    const { unmount } = renderHook(() => useCMC7Reader());
    await waitFor(() => expect(createCMC7Reader).toHaveBeenCalled());
    
    unmount();
    expect(mockReader.stop).toHaveBeenCalled();
  });

  it('deve funcionar corretamente com React.StrictMode (double-mount)', async () => {
    // Double-mount simulation: render, unmount, render
    const { unmount } = renderHook(() => useCMC7Reader());
    unmount();
    renderHook(() => useCMC7Reader());
    
    // Should have created 2 readers but cleaned up the first one
    expect(createCMC7Reader).toHaveBeenCalledTimes(2);
    
    // Wait for the asynchronous stop() call inside .then()
    await waitFor(() => {
      expect(mockReader.stop).toHaveBeenCalledTimes(1);
    });
  });

  it('deve resetar result quando stop() é chamado manualmente', async () => {
    const { result } = renderHook(() => useCMC7Reader());
    
    await waitFor(() => expect(result.current.isReady).toBe(true));
    
    // Simulate a result event
    act(() => {
      const handler = mockReader.on.mock.calls.find(call => call[0] === 'result')[1];
      handler({ raw: '123' });
    });
    
    expect(result.current.result).toEqual({ raw: '123' });
    
    await act(async () => {
      await result.current.stop();
    });
    
    expect(result.current.result).toBeNull();
    expect(mockReader.stop).toHaveBeenCalled();
  });
});
