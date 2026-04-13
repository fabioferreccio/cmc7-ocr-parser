import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCMC7Reader } from './vue';
import { createCMC7Reader } from './reader';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';

// Mock the reader factory
vi.mock('./reader', () => ({
  createCMC7Reader: vi.fn(),
}));

describe('useCMC7Reader Vue', () => {
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

  const TestComponent = defineComponent({
    setup() {
      const api = useCMC7Reader();
      return { ...api };
    },
    template: '<div></div>',
  });

  it('deve chamar createCMC7Reader em setup', async () => {
    const wrapper = mount(TestComponent);
    const vm = wrapper.vm as any;
    
    expect(createCMC7Reader).toHaveBeenCalled();
    expect(vm.isReady).toBe(false);
    
    // Aguarda a promessa do createCMC7Reader
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(vm.isReady).toBe(true);
  });

  it('deve expor estado reativo', async () => {
    const wrapper = mount(TestComponent);
    const vm = wrapper.vm as any;
    
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(vm.isReady).toBe(true);
    
    // Simula evento de resultado
    const handler = mockReader.on.mock.calls.find(call => call[0] === 'result')[1];
    handler({ raw: '456' });
    
    expect(vm.result).toEqual({ raw: '456' });
  });

  it('deve limpar o reader na desmontagem', async () => {
    const wrapper = mount(TestComponent);
    await new Promise(resolve => setTimeout(resolve, 0));
    
    wrapper.unmount();
    expect(mockReader.stop).toHaveBeenCalled();
  });
});
