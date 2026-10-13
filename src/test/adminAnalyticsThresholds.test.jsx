/**
 * Admin Rules & Thresholds config save wiring.
 *
 * Regression cover for a silent no-op save. The edit modal used to join each
 * form field to a threshold rule on `rule_key`, but the stored rows carry
 * descriptive keys (`favorable_min_change`, `unfavorable_max_change`) that
 * share no namespace with the form keys (`fav_min`, `unfav_max`). Every lookup
 * missed, every field was skipped, and the modal reported "Saved!" without
 * issuing a single request — so no config change was written and no
 * `config.*` audit row was ever produced.
 *
 * The join is now on `classification`, matching the `ensureRule` pattern in
 * AdminAnalytics.jsx.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';

import AdminAnalyticsThresholds from '../app/admin/pages/AdminAnalyticsThresholds';

// Rule keys as they actually exist in the database.
const MODULES = {
  items: [
    {
      id: 'TMD-0001',
      module_name: 'Price Outlook',
      source_label: 'Forecasting output (Bangkerohan Retail Prices)',
      updated_at: '2026-10-01T00:00:00',
      rules: [
        {
          id: 'TRL-0001',
          rule_key: 'favorable_min_change',
          classification: 'Favorable',
          operator: '>',
          threshold_value: 0.05,
          display_text: '> +5%',
        },
        {
          id: 'TRL-0002',
          rule_key: 'unfavorable_max_change',
          classification: 'Unfavorable',
          operator: '<',
          threshold_value: -0.05,
          display_text: '< -5%',
        },
      ],
    },
  ],
  total: 1,
};

function mockFetch(handlers) {
  return vi.fn(async (url, init = {}) => {
    const href = String(url);
    const method = (init.method || 'GET').toUpperCase();
    const handler = handlers.find((h) => h.method === method && h.match(href));
    if (!handler) {
      return {
        ok: false,
        status: 404,
        json: async () => ({ detail: `unmocked ${method} ${href}` }),
      };
    }
    return {
      ok: handler.ok ?? true,
      status: handler.status ?? 200,
      json: async () => handler.body ?? {},
    };
  });
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/modules/thresholds']}>
      <AdminAnalyticsThresholds />
    </MemoryRouter>
  );
}

function writeCalls(fetchFn) {
  return fetchFn.mock.calls.filter(([, init]) => (init?.method || 'GET') !== 'GET');
}

/**
 * The modal renders one number input per field, in RULE_EDIT_CONFIGS order.
 * For Price Outlook that is fav_min, neut_min, neut_max, unfav_max — the
 * labels are not wired to the inputs, so they are addressed by position.
 */
function favorableInput() {
  return screen.getAllByRole('spinbutton')[0];
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('Rules & Thresholds save wiring', () => {
  it('writes an audit-backed PUT for the rule whose classification matches the field', async () => {
    const fetchFn = mockFetch([
      { method: 'GET', match: (u) => u.includes('/admin/thresholds'), body: MODULES },
      {
        method: 'PUT',
        match: (u) => /\/admin\/thresholds\/rules\/TRL-\d+/.test(u),
        body: {},
      },
    ]);
    vi.stubGlobal('fetch', fetchFn);

    renderPage();

    // Price Outlook card renders from the stored module.
    await screen.findByText('Price Outlook');
    await userEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);

    // Change "Favorable minimum change (%)" from 5 to 8.
    const favorable = favorableInput();
    await userEvent.clear(favorable);
    await userEvent.type(favorable, '8');

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(writeCalls(fetchFn).length).toBeGreaterThan(0));

    const writes = writeCalls(fetchFn);
    // Both mapped fields are persisted: Favorable (edited) and Unfavorable
    // (left at its default). The neutral min/max fields have no stored rule
    // behind them, so they produce no request.
    expect(writes).toHaveLength(2);

    // Joined on classification -> Favorable's row (TRL-0001), not by rule_key.
    const favorableWrite = writes.find(([url]) =>
      String(url).includes('/admin/thresholds/rules/TRL-0001')
    );
    expect(favorableWrite).toBeDefined();
    expect(favorableWrite[1].method).toBe('PUT');
    const sent = JSON.parse(favorableWrite[1].body);
    expect(sent.threshold_value).toBe(8);
    expect(sent.display_text).toBe('8');

    // Unfavorable resolves to its own rule, not to Favorable's.
    const unfavorableWrite = writes.find(([url]) =>
      String(url).includes('/admin/thresholds/rules/TRL-0002')
    );
    expect(unfavorableWrite).toBeDefined();
    expect(JSON.parse(unfavorableWrite[1].body).threshold_value).toBe(-5);
  });

  it('does not claim success when a save is rejected', async () => {
    const fetchFn = mockFetch([
      { method: 'GET', match: (u) => u.includes('/admin/thresholds'), body: MODULES },
      {
        method: 'PUT',
        match: (u) => /\/admin\/thresholds\/rules\//.test(u),
        ok: false,
        status: 409,
        body: { detail: 'Could not update threshold rule due to a data conflict.' },
      },
    ]);
    vi.stubGlobal('fetch', fetchFn);

    renderPage();
    await screen.findByText('Price Outlook');
    await userEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);

    const favorable = favorableInput();
    await userEvent.clear(favorable);
    await userEvent.type(favorable, '8');

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    // The failure is surfaced rather than swallowed.
    await screen.findByText(/data conflict/i);
    expect(screen.queryByText('Saved!')).not.toBeInTheDocument();
  });

  it('reports that there is nothing to save instead of a false success', async () => {
    // "Final Advisory Cutoffs" is a hardcoded card with no stored module or
    // rules. Saving it must not report success.
    const fetchFn = mockFetch([
      { method: 'GET', match: (u) => u.includes('/admin/thresholds'), body: MODULES },
    ]);
    vi.stubGlobal('fetch', fetchFn);

    renderPage();
    await screen.findByText('Price Outlook');

    await userEvent.click(
      screen.getAllByRole('button', { name: /edit/i }).at(-1)
    );

    await userEvent.click(await screen.findByRole('button', { name: /save changes/i }));

    await screen.findByText(/nothing to save/i);
    expect(screen.queryByText('Saved!')).not.toBeInTheDocument();
    expect(writeCalls(fetchFn)).toHaveLength(0);
  });
});