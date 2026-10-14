/**
 * Global PWA update prompt (client/src/app/global/components/shared/PwaUpdatePrompt.jsx).
 *
 * The service worker is registered with `registerType: 'prompt'`, so a deployed
 * build waits until something calls `applyUpdate()`. This prompt is the global
 * affordance that does so, for every workspace.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

const { subscribeUpdateAvailable, applyUpdate } = vi.hoisted(() => ({
  subscribeUpdateAvailable: vi.fn(),
  applyUpdate: vi.fn(),
}));

vi.mock('../app/global/lib/pwaUpdate', () => ({
  subscribeUpdateAvailable,
  applyUpdate,
}));

import { PwaUpdatePrompt } from '../app/global/components/shared/PwaUpdatePrompt';

describe('PwaUpdatePrompt', () => {
  let signal;

  beforeEach(() => {
    vi.clearAllMocks();
    subscribeUpdateAvailable.mockImplementation((listener) => {
      signal = listener;
      return vi.fn();
    });
  });

  it('renders nothing until an update is waiting', () => {
    render(<PwaUpdatePrompt />);
    expect(screen.queryByText('App update available')).toBeNull();
  });

  it('shows the prompt when a new build is waiting', () => {
    render(<PwaUpdatePrompt />);
    act(() => signal(true));

    expect(screen.getByText('App update available')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update now' })).toBeInTheDocument();
  });

  it('activates the waiting worker when Update now is clicked', () => {
    render(<PwaUpdatePrompt />);
    act(() => signal(true));

    fireEvent.click(screen.getByRole('button', { name: 'Update now' }));
    expect(applyUpdate).toHaveBeenCalledTimes(1);
  });

  it('hides again when the signal clears', () => {
    render(<PwaUpdatePrompt />);
    act(() => signal(true));
    act(() => signal(false));

    expect(screen.queryByText('App update available')).toBeNull();
  });

  it('unsubscribes on unmount', () => {
    const unsubscribe = vi.fn();
    subscribeUpdateAvailable.mockReturnValue(unsubscribe);

    const { unmount } = render(<PwaUpdatePrompt />);
    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
