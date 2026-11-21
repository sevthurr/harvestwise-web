import { act, renderHook, waitFor } from '@testing-library/react';
import { usePWAInstall } from '../app/global/hooks/usePWAInstall';

describe('usePWAInstall', () => {
  it('keeps an install event available when it fires before the hook mounts', async () => {
    const prompt = vi.fn();
    const installEvent = new Event('beforeinstallprompt');
    Object.defineProperty(installEvent, 'prompt', { value: prompt });
    Object.defineProperty(installEvent, 'userChoice', {
      value: Promise.resolve({ outcome: 'accepted' }),
    });

    window.dispatchEvent(installEvent);
    const { result } = renderHook(() => usePWAInstall());

    await waitFor(() => expect(result.current.isInstallable).toBe(true));

    await act(async () => {
      await result.current.promptInstall();
    });

    expect(prompt).toHaveBeenCalledOnce();
  });
});
