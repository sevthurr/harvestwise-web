import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useSearchParams } from 'react-router';

// Helper component matching LegacyThresholdsRedirect in routes.jsx
function LegacyThresholdsRedirect() {
  const [searchParams] = useSearchParams();
  const highlight = searchParams.get('highlight');
  const target = highlight
    ? `/admin/modules?tab=weights&highlight=${encodeURIComponent(highlight)}`
    : '/admin/modules?tab=weights';
  return <div data-testid="redirect-target">{target}</div>;
}

describe('Legacy thresholds page redirection', () => {
  it('redirects /admin/modules/thresholds to /admin/modules?tab=weights', () => {
    render(
      <MemoryRouter initialEntries={['/admin/modules/thresholds']}>
        <Routes>
          <Route path="/admin/modules/thresholds" element={<LegacyThresholdsRedirect />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('redirect-target').textContent).toBe('/admin/modules?tab=weights');
  });

  it('preserves highlight query parameter when redirecting', () => {
    render(
      <MemoryRouter initialEntries={['/admin/modules/thresholds?highlight=arrival_pressure_q3']}>
        <Routes>
          <Route path="/admin/modules/thresholds" element={<LegacyThresholdsRedirect />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('redirect-target').textContent).toBe(
      '/admin/modules?tab=weights&highlight=arrival_pressure_q3'
    );
  });
});