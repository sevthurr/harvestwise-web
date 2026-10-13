/**
 * PasswordChangeForm / ChangePasswordPanel wiring test.
 *
 * Verifies the shared form validates input, POSTs /auth/change-password, and
 * calls onSuccess after a successful update — plus the two properties that
 * make the forced temporary-password block safe:
 *
 *   1. No escape route. The panel renders no Cancel, no close and no "Later",
 *      so a caller on a temporary password cannot dismiss the requirement.
 *   2. The gate cannot outlive the rotation. change_password() revokes every
 *      session, so the follow-up /auth/me can fail; the block must still clear.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordChangeForm } from '../app/global/components/settings/PasswordChangeForm';
import { ChangePasswordPanel } from '../app/global/components/settings/ChangePasswordPanel';

// The default language context resolves to Cebuano, so without this the labels
// would not match the English strings these assertions use. Pinned to English
// deliberately — the fallbacks in the component are English, and a test that
// silently passes in a third language proves nothing about the copy.
vi.mock('../app/global/contexts/LanguageContext', async () => {
  const { t } = await import('../app/global/i18n');
  return {
    useLanguage: () => ({
      t: (key, params, fallback) => {
        const res = t(key, params, 'en');
        return res === key && fallback ? fallback : res;
      },
    }),
  };
});

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

describe('PasswordChangeForm', () => {
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
    const onSuccess = vi.fn();

    render(<PasswordChangeForm onSuccess={onSuccess} />);

    await fillPasswords(user, 'Temp!pass123', 'New!Pass123', 'New!Pass123');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(init.body);
    expect(payload.current_password).toBe('Temp!pass123');
    expect(payload.new_password).toBe('New!Pass123');
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('rejects mismatched passwords without calling the API', async () => {
    window.fetch = mockFetch();
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    render(<PasswordChangeForm onSuccess={onSuccess} />);
    await fillPasswords(user, 'Temp!pass123', 'New!Pass123', 'Different!123');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(window.fetch).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('rejects a password that misses the requirements', async () => {
    window.fetch = mockFetch();
    const user = userEvent.setup();

    render(<PasswordChangeForm onSuccess={vi.fn()} />);
    await fillPasswords(user, 'Temp!pass123', 'weak', 'weak');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    expect(
      await screen.findByText('Password does not meet all requirements.')
    ).toBeInTheDocument();
    expect(window.fetch).not.toHaveBeenCalled();
  });

  it('renders no Cancel button when onCancel is omitted', () => {
    render(<PasswordChangeForm onSuccess={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('resets the fields when onCancel is supplied', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<PasswordChangeForm onSuccess={vi.fn()} onCancel={onCancel} />);

    await fillPasswords(user, 'Temp!pass123', 'New!Pass123', 'New!Pass123');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Current password')).toHaveValue('');
    expect(screen.getByLabelText('New password')).toHaveValue('');
    expect(screen.getByLabelText('Confirm new password')).toHaveValue('');
  });

  it('surfaces the server error and does not call onSuccess', async () => {
    window.fetch = mockFetch({ ok: false });
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    render(<PasswordChangeForm onSuccess={onSuccess} />);
    await fillPasswords(user, 'Temp!pass123', 'New!Pass123', 'New!Pass123');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    expect(await screen.findByText('Current password is incorrect')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('hands the error to onError when the caller supplies one', async () => {
    window.fetch = mockFetch({ ok: false });
    const user = userEvent.setup();
    const onError = vi.fn();

    render(<PasswordChangeForm onSuccess={vi.fn()} onError={onError} />);
    await fillPasswords(user, 'Temp!pass123', 'New!Pass123', 'New!Pass123');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError.mock.calls[0][0].message).toBe('Current password is incorrect');
  });
});

describe('ChangePasswordPanel', () => {
  beforeEach(() => {
    window.fetch = mockFetch();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('offers no way to dismiss the temporary-password requirement', () => {
    render(<ChangePasswordPanel onRotated={vi.fn()} />);

    // Both the heading and the body mention it, so match the heading only.
    expect(
      screen.getByRole('heading', { name: /temporary password/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Later' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });

  /**
   * The lockout case. `change_password` deletes every session before it
   * returns, so the /auth/me that follows can come back 401 and null out the
   * user. If the gate were derived from the flag alone, this user would be
   * stuck on a panel they can no longer leave. The rotation did commit, so the
   * gate must clear regardless.
   */
  it('clears the gate even when the follow-up refresh fails', async () => {
    const onRotated = vi.fn(async () => {
      // Stand in for AuthContext.refreshUser: the session was just revoked.
      await Promise.reject(new Error('Session expired'));
    });
    const user = userEvent.setup();

    render(<ChangePasswordPanel onRotated={onRotated} />);
    await fillPasswords(user, 'Temp!pass123', 'New!Pass123', 'New!Pass123');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => expect(onRotated).toHaveBeenCalledTimes(1));
    // The panel is the caller's to unmount on success; it must not have
    // thrown, and the form must not still be showing a pending submit.
    expect(
      screen.queryByRole('button', { name: 'Updating...' })
    ).not.toBeInTheDocument();
  });

  it('clears the fields after a successful rotation', async () => {
    const user = userEvent.setup();
    render(<ChangePasswordPanel onRotated={vi.fn()} />);

    await fillPasswords(user, 'Temp!pass123', 'New!Pass123', 'New!Pass123');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() =>
      expect(screen.getByLabelText('Current password')).toHaveValue('')
    );
  });
});