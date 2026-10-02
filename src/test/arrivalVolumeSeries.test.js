import { describe, it, expect } from 'vitest';
import {
  CLASSIFICATION_BAR_COLORS,
  NO_QUARTILE_BAR_COLOR,
  arrivalBoundaryRows,
  arrivalSeriesTotals,
  availableArrivalYears,
  bucketArrivals,
  classifyArrival,
  classificationColor,
  monthlyAxisForYear
} from '../app/admin/components/analytics/arrivalVolumeSeries';

// The series helpers are pure, so the trend bar model is testable without
// mounting the chart. recharts needs a measured container, which jsdom does
// not provide, so asserting on rendered bars here would be testing the mock.

const QUARTILES = { q1: 281.6, q2: 433.1, q3: 494.1 };

const record = (arrival_date, volume_kg, farm = 8, other = volume_kg - 8) => ({
  arrival_date,
  volume_kg,
  farm_source_volume_kg: farm,
  other_source_volume_kg: other,
  commodity_name: 'Ampalaya',
  variety: 'Galaxy',
  source: 'DFTC Arrival Volume'
});

describe('classifyArrival', () => {
  it('uses the card boundaries inclusively', () => {
    // Each boundary is inclusive at its lower edge, matching the card's table:
    // "≤ 281.6" is Low, "281.6 – 433.1" is Lower Middle, and so on.
    expect(classifyArrival(281.6, QUARTILES)).toBe('Low');
    expect(classifyArrival(281.7, QUARTILES)).toBe('Lower Middle');
    expect(classifyArrival(433.1, QUARTILES)).toBe('Lower Middle');
    expect(classifyArrival(433.2, QUARTILES)).toBe('Upper Middle');
    expect(classifyArrival(494.1, QUARTILES)).toBe('Upper Middle');
    expect(classifyArrival(494.2, QUARTILES)).toBe('High');
    expect(classifyArrival(9999, QUARTILES)).toBe('High');
  });

  it('returns null rather than guessing when the quartiles are withheld', () => {
    // The backend withholds quartiles below four records, so there is nothing to
    // compare against and a guess here would contradict the card.
    expect(classifyArrival(207, null)).toBeNull();
    expect(classifyArrival(207, undefined)).toBeNull();
  });
});

describe('classificationColor', () => {
  it('maps the four bands to the design palette', () => {
    expect(classificationColor('Low')).toBe(CLASSIFICATION_BAR_COLORS.Low);
    expect(classificationColor('Lower Middle')).toBe(CLASSIFICATION_BAR_COLORS['Lower Middle']);
    expect(classificationColor('Upper Middle')).toBe(CLASSIFICATION_BAR_COLORS['Upper Middle']);
    expect(classificationColor('High')).toBe(CLASSIFICATION_BAR_COLORS.High);
  });

  it('gives the four bands four distinct colours', () => {
    const used = Object.values(CLASSIFICATION_BAR_COLORS);
    expect(new Set(used).size).toBe(4);
  });

  it('falls back to a neutral when there is no classification', () => {
    expect(classificationColor(null)).toBe(NO_QUARTILE_BAR_COLOR);
    expect(classificationColor(undefined)).toBe(NO_QUARTILE_BAR_COLOR);
  });
});

describe('bucketArrivals', () => {
  it('groups by month in chronological order', () => {
    const series = bucketArrivals(
      [record('2025-03-31', 280), record('2025-05-31', 420), record('2025-04-30', 490)],
      { granularity: 'monthly', year: 2025 }
    );
    expect(series.map((b) => b.label)).toEqual(['Mar', 'Apr', 'May']);
    expect(series.map((b) => b.total_kg)).toEqual([280, 490, 420]);
  });

  it('sums the farm and other split into the bucket total', () => {
    const [bucket] = bucketArrivals([record('2025-03-31', 100, 30, 70)], {
      granularity: 'monthly',
      year: 2025
    });
    expect(bucket.farm_kg).toBe(30);
    expect(bucket.other_kg).toBe(70);
    expect(bucket.total_kg).toBe(100);
  });

  it('merges two records in the same month', () => {
    const series = bucketArrivals([record('2025-03-10', 100), record('2025-03-20', 50)], {
      granularity: 'monthly',
      year: 2025
    });
    expect(series).toHaveLength(1);
    expect(series[0].total_kg).toBe(150);
  });

  it('keeps separate buckets per day in daily mode', () => {
    const series = bucketArrivals([record('2025-03-10', 100), record('2025-03-20', 50)], {
      granularity: 'daily',
      year: 2025
    });
    expect(series.map((b) => b.label)).toEqual(['Mar 10', 'Mar 20']);
  });

  it('filters to the requested year and ignores others', () => {
    const series = bucketArrivals(
      [record('2024-11-30', 150), record('2025-03-31', 280)],
      { granularity: 'monthly', year: 2025 }
    );
    expect(series).toHaveLength(1);
    expect(series[0].year).toBe(2025);
  });

  it('skips malformed dates instead of producing a broken bucket', () => {
    const series = bucketArrivals([{ arrival_date: 'not-a-date', volume_kg: 5 }, record('2025-03-31', 280)], {
      granularity: 'monthly',
      year: 2025
    });
    expect(series).toHaveLength(1);
    expect(series[0].total_kg).toBe(280);
  });
});

describe('availableArrivalYears', () => {
  it('lists years newest first', () => {
    expect(
      availableArrivalYears([record('2024-11-30', 150), record('2025-03-31', 280), record('2025-07-31', 90)])
    ).toEqual([2025, 2024]);
  });

  it('returns an empty list when there is nothing to show', () => {
    expect(availableArrivalYears([])).toEqual([]);
  });
});

describe('monthlyAxisForYear', () => {
  it('returns a zero-filled Jan-Dec axis', () => {
    // The design shows every month labelled, with gaps where nothing recorded.
    const axis = monthlyAxisForYear(2025, bucketArrivals([record('2025-03-31', 280)], { granularity: 'monthly', year: 2025 }));
    expect(axis).toHaveLength(12);
    expect(axis[0].label).toBe('Jan');
    expect(axis[11].label).toBe('Dec');
    expect(axis[2].total_kg).toBe(280);
    expect(axis[0].total_kg).toBe(0);
    expect(axis[11].total_kg).toBe(0);
  });

  it('passes the series through when no year is selected', () => {
    const series = bucketArrivals([record('2025-03-31', 280)], { granularity: 'monthly' });
    expect(monthlyAxisForYear(null, series)).toBe(series);
  });
});

describe('arrivalSeriesTotals', () => {
  it('sums the total and counts distinct months', () => {
    const series = bucketArrivals(
      [record('2025-03-31', 100), record('2025-06-30', 200), record('2025-12-31', 207)],
      { granularity: 'monthly', year: 2025 }
    );
    expect(arrivalSeriesTotals(series)).toEqual({ total_kg: 507, months: 3 });
  });

  it('reports zero months for an empty series', () => {
    expect(arrivalSeriesTotals([])).toEqual({ total_kg: 0, months: 0 });
  });
});

describe('arrivalBoundaryRows', () => {
  it('renders the four rows the card shows', () => {
    const rows = arrivalBoundaryRows(QUARTILES);
    expect(rows.map((r) => r.classification)).toEqual([
      'Low',
      'Lower Middle',
      'Upper Middle',
      'High'
    ]);
    expect(rows[0]).toEqual({ classification: 'Low', boundary: '≤ 281.6 kg/mo', supply: 'Deficit / High Price' });
    expect(rows[3]).toEqual({ classification: 'High', boundary: '> 494.1 kg/mo', supply: 'Surplus / Low Price' });
  });

  it('is empty when the quartiles are withheld', () => {
    expect(arrivalBoundaryRows(null)).toEqual([]);
  });
});
