/**
 * ChangePasswordPrompt wiring test.
 *
 * Verifies the temporary-password prompt validates input, POSTs
 * /auth/change-password, and calls onChanged after a successful update.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChangePasswordPrompt } from '../app/global/components/settings/ChangePasswordPrompt';

function mockFetch({ ok = true, body = { message: 'Password updated successfully' } } = {}) {
  return vi.fn(async () => ({
    ok,
    status: ok ? 200 : 400,
    json: async () => (ok ? body : { detail: 'Current password is incorrect' }),
  }));
}

async function fillPasswords(user, current, next, confirm) {
  await user.type(screen.getByLabelText('Current password'), current);
  await user.type(screen.getByLabelText('New password'), next);
  await user.type(screen.getByLabelText('Confirm new password'), confirm);
}

describe('ChangePasswordPrompt', () => {
  beforeEach(() => {
    window.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a password form and submits on valid input', async () => {
    const fetchMock = mockFetch();
    window.fetch = fetchMock;
    const user = userEvent.setup();
    const onChanged = vi.fn();
    const onClose = vi.fn();

    render(<ChangePasswordPrompt onClose={onClose} onChanged={onChanged} />);
    expect(screen.getByText(/temporary password/i)).toBeInTheDocument();

    await fillPasswords(user, 'Temp!pass123', 'New!Pass123', 'New!Pass123');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(init.body);
    expect(payload.current_password).toBe('Temp!pass123');
    expect(payload.new_password).toBe('New!Pass123');
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('rejects mismatched passwords without calling the API', async () => {
    window.fetch = mockFetch();
    const user = userEvent.setup();
    const onChanged = vi.fn();

    render(<ChangePasswordPrompt onClose={vi.fn()} onChanged={onChanged} />);
    await fillPasswords(user, 'Temp!pass123', 'New!Pass123', 'Different!123');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(window.fetch).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('dismisses via the Later button', async () => {
    const onClose = vi.fn();
    render(<ChangePasswordPrompt onClose={onClose} onChanged={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});