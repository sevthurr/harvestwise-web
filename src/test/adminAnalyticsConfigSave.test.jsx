/**
 * Analytics config modals must not claim a save that failed.
 *
 * `EditPriceOutlookModal` and `EditWeightModal` both called `onSave(...)`
 * without awaiting it and then set "Saved!" immediately, so a request rejected
 * by the API looked exactly like a successful write: the modal showed success,
 * closed after 600ms, and no audit row was produced. The page-level error only
 * appeared afterwards, behind the modal. That is why a failed threshold change
 * was indistinguishable from a saved one.
 *
 * Both handlers now resolve to `null` on success or the failure message, and
 * both modals refuse to report success when they get one.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import {
  EditPriceOutlookModal,
  EditWeightModal,
} from '../app/admin/pages/AdminAnalytics';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('EditPriceOutlookModal', () => {
  function renderModal(onSave) {
    return render(
      <EditPriceOutlookModal
        currentRules={{ favMin: 5, unfavMax: -5 }}
        onClose={() => {}}
        onSave={onSave}
      />
    );
  }

  it('reports success only after the write resolves', async () => {
    let resolveSave;
    const onSave = vi.fn(
      () => new Promise((resolve) => { resolveSave = resolve; })
    );
    renderModal(onSave);

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    // Still in flight: must not claim success yet.
    expect(onSave).toHaveBeenCalledWith({ favMin: 5, unfavMax: -5 });
    expect(screen.queryByText('Saved!')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();

    resolveSave(null);
    await screen.findByText('Saved!');
  });

  it('does not claim success when the write is rejected', async () => {
    const onSave = vi.fn(async () => 'Could not update threshold rule due to a data conflict.');
    renderModal(onSave);

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await screen.findByText(/data conflict/i);
    expect(screen.getByText(/nothing was changed/i)).toBeInTheDocument();
    expect(screen.queryByText('Saved!')).not.toBeInTheDocument();
  });

  it('treats a rejected promise as a failure rather than a success', async () => {
    const onSave = vi.fn(async () => {
      throw new Error('Network request failed');
    });
    renderModal(onSave);

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await screen.findByText(/network request failed/i);
    expect(screen.queryByText('Saved!')).not.toBeInTheDocument();
  });
});

describe('EditWeightModal', () => {
  function renderModal(onSave) {
    return render(
      <EditWeightModal
        phase="Planning"
        currentWeights={{
          'Price Outlook': 20,
          'Arrival Pressure': 20,
          'Historical Seasonal Production Level': 20,
          'Weather Risk': 20,
          Profitability: 20,
        }}
        onClose={() => {}}
        onSave={onSave}
      />
    );
  }

  it('does not claim success when the write is rejected', async () => {
    const onSave = vi.fn(async () => 'Failed to save weights.');
    renderModal(onSave);

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await screen.findByText(/nothing was changed/i);
    expect(screen.queryByText('Saved!')).not.toBeInTheDocument();
  });

  it('reports success once the write resolves', async () => {
    const onSave = vi.fn(async () => null);
    renderModal(onSave);

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toBe('Planning');
    await screen.findByText('Saved!');
  });
});