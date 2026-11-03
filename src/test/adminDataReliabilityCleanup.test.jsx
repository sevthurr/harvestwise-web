import { describe, it, expect } from 'vitest';
import {
  buildReliabilitySummary,
  dimensionDetail,
  buildReliabilityExplanation,
  formatReliabilityDate,
  formatEmbeddedDates,
} from '../app/admin/utils/reliabilityExplanations';

describe('Admin Data Reliability Explanation & Summary Cleanups', () => {
  describe('Date and Period Formatting', () => {
    it('formats ISO dates into human-readable Month Day, Year without timezone drift', () => {
      expect(formatReliabilityDate('2026-10-28')).toBe('October 28, 2026');
      expect(formatReliabilityDate('2026-09-24')).toBe('September 24, 2026');
      expect(formatReliabilityDate('2026-10-31')).toBe('October 31, 2026');
    });

    it('formats Year-Month into Month Year', () => {
      expect(formatReliabilityDate('2026-10')).toBe('October 2026');
      expect(formatReliabilityDate('2025-12')).toBe('December 2025');
    });

    it('formats Year Quarter into Quarter Year', () => {
      expect(formatReliabilityDate('2026 Q3')).toBe('Q3 2026');
      expect(formatReliabilityDate('2026-Q2')).toBe('Q2 2026');
      expect(formatReliabilityDate('Q3 2026')).toBe('Q3 2026');
    });

    it('formats embedded dates in free-form strings', () => {
      expect(formatEmbeddedDates('Production data is 2 days overdue for expected release 2026 Q3.'))
        .toBe('Production data is 2 days overdue for expected release Q3 2026.');
      expect(formatEmbeddedDates('Grace deadline was 2026-10-31.'))
        .toBe('Grace deadline was October 31, 2026.');
    });
  });

  describe('Price Outlook', () => {
    it('describes 0–2 missed reporting days as within the 2-day allowance with full weight', () => {
      const summary0 = buildReliabilitySummary({
        resultId: 'price-outlook',
        level: 'High',
        evidence: {
          available: 14,
          required: 14,
          latest_date: '2026-10-21',
          missed_reporting_days: 0,
        },
      });
      expect(summary0).toContain('within the 2-day allowance');
      expect(summary0).toContain('the reliability factor is 1.00');
      expect(summary0).not.toContain('full module weight is applied');

      const summary2 = buildReliabilitySummary({
        resultId: 'price-outlook',
        level: 'High',
        evidence: {
          available: 14,
          required: 14,
          latest_date: '2026-10-19',
          missed_reporting_days: 2,
        },
      });
      expect(summary2).toContain('2 reporting days missed; within the 2-day allowance');
      expect(summary2).toContain('the reliability factor is 1.00');
      expect(summary2).not.toContain('full module weight is applied');
    });

    it('describes 3–4 missed reporting days as exceeding the allowance without contradictory full-weight claim', () => {
      const summary3 = buildReliabilitySummary({
        resultId: 'price-outlook',
        level: 'High',
        evidence: {
          available: 14,
          required: 14,
          latest_date: '2026-10-28',
          missed_reporting_days: 3,
        },
      });
      expect(summary3).toContain('exceeds the 2-day allowance; timeliness reduced to 0.75');
      expect(summary3).not.toContain('within the 2-day allowance');
      expect(summary3).not.toContain('full module weight is applied');
      expect(summary3).toContain('timeliness is reduced due to missed reporting days; overall reliability remains High');
    });

    it('consistently explains the applied reporting-day bracket without implying calendar days are the scoring input', () => {
      const detail3 = dimensionDetail('timeliness', 0.75, {
        latest_date: '2026-10-28',
        missed_reporting_days: 3,
        age_days: 5,
        timeliness_basis: 'missed_reporting_days',
      }, {}, 'price-outlook');
      expect(detail3).toContain('3 missed reporting days');
      expect(detail3).toContain('3–4 missed days bracket');
      expect(detail3).toContain('score 0.75');
      expect(detail3).not.toContain('5 days old');
    });

    it('uses "price observations were included in the reliability assessment" terminology for Validity', () => {
      const detail = dimensionDetail('validity', 1.0, {
        valid_records: 30,
        unit: 'price reporting days',
      }, {});
      expect(detail).toContain('30 usable price observations were included in the reliability assessment');
      expect(detail).not.toContain('verified for calculation');
      expect(detail).not.toContain('price reporting days');
    });
  });

  describe('Arrival Pressure', () => {
    it('does NOT claim computational minimums are met when only 1 month is available', () => {
      const summary1 = buildReliabilitySummary({
        resultId: 'arrival-pressure',
        level: 'Moderate',
        evidence: {
          available: 1,
          required: 12,
          min_required_months: 4,
          latest_arrival_month: '2026-10',
          elapsed_calendar_months: 0,
        },
      });
      expect(summary1).toContain('1 of 12 monthly arrival observations are available');
      expect(summary1).toContain('Coverage is below the computational minimum of 4 months');
      expect(summary1).not.toContain('satisfies computational minimums');
    });

    it('accurately states computational minimums are met when 4 or more months are available', () => {
      const summary4 = buildReliabilitySummary({
        resultId: 'arrival-pressure',
        level: 'Moderate',
        evidence: {
          available: 6,
          required: 12,
          min_required_months: 4,
          latest_arrival_month: '2026-10',
          elapsed_calendar_months: 1,
        },
      });
      expect(summary4).toContain('satisfies computational minimums');
    });

    it('uses "passed the implemented volume checks" for Arrival Validity', () => {
      const detail = dimensionDetail('validity', 1.0, {
        valid_records: 12,
        unit: 'monthly arrival observations',
      }, {}, 'arrival-pressure');
      expect(detail).toBe('12 monthly arrival observations passed the implemented volume checks (score 1.00).');
    });
  });

  describe('Historical Seasonal Production', () => {
    it('uses "42 usable quarters; historical target of 20 quarters met" wording', () => {
      const detail = dimensionDetail('availability', 1.0, {
        available: 42,
        required: 20,
        unit: 'quarters of production records',
      }, {});
      expect(detail).toContain('42 usable quarters; historical target of 20 quarters met');
      expect(detail).not.toContain('42 of 20 required distinct quarters (100%)');
    });

    it('accurately describes overdue quarter with formatted dates and reduced timeliness', () => {
      const summaryOverdue = buildReliabilitySummary({
        resultId: 'historical-production',
        level: 'High',
        evidence: {
          available: 42,
          required: 20,
          latest_period: '2026 Q2',
          earliest_missing_period: '2026 Q3',
          days_overdue: 2,
          grace_deadline: '2026-10-31',
        },
      });
      expect(summaryOverdue).toContain('Q3 2026 is 2 days overdue past the HarvestWise grace deadline of October 31, 2026');
      expect(summaryOverdue).toContain('timeliness is reduced; overall reliability remains High');
      expect(summaryOverdue).not.toContain('full module weight is applied');
    });

    it('uses "usable quarterly production observations were included in the reliability assessment" for Production Validity', () => {
      const detail = dimensionDetail('validity', 1.0, {
        usable_records: 42,
        unit: 'quarters of production records',
      }, {}, 'historical-production');
      expect(detail).toBe('42 usable quarterly production observations were included in the reliability assessment (score 1.00).');
    });
  });

  describe('Weather Risk', () => {
    it('uses natural "Only 5 of 14 forecast dates are available" wording without redundant "day(s)"', () => {
      const summary5 = buildReliabilitySummary({
        resultId: 'weather-risk',
        level: 'Low',
        evidence: {
          available: 5,
          required: 14,
          age_hours: 223.6,
        },
      });
      expect(summary5).toContain('Only 5 of 14 forecast dates are available in the 14-day window');
      expect(summary5).not.toContain('day(s)');
      expect(summary5).toContain('critically outdated (approx 9.3 days old)');
    });

    it('formats large elapsed hours as human-readable approximate days in timeliness detail', () => {
      const detail = dimensionDetail('timeliness', 0.05, {
        timeliness_basis: 'forecast_retrieval_age',
        age_hours: 223.6,
      }, {});
      expect(detail).toContain('approx 9.3 days old');
    });

    it('uses "observed forecast dates passed the required weather measurement checks" for Weather Validity', () => {
      const detail = dimensionDetail('validity', 1.0, {
        usable_records: 5,
        observed_forecast_dates: 5,
        unit: 'forecast dates',
      }, {}, 'weather-risk');
      expect(detail).toBe('5 observed forecast dates passed the required weather measurement checks (score 1.00).');
    });

    it('excludes validity from two-dimension explanation breakdown and preserves 5/14 availability with critical cap', () => {
      const exp = buildReliabilityExplanation({
        resultId: 'weather-risk',
        level: 'Low',
        factor: 0.20,
        dimensions: {
          availability: 0.36,
          timeliness: 0.05,
        },
        evidence: {
          available: 5,
          required: 14,
          usable_records: 5,
          observed_forecast_dates: 5,
          age_hours: 223.6,
        },
      });
      const availRow = exp.rows.find((r) => r.key === 'availability');
      const timeRow = exp.rows.find((r) => r.key === 'timeliness');
      const valRow = exp.rows.find((r) => r.key === 'validity');
      expect(availRow.score).toBe(0.36);
      expect(availRow.weight).toBe(0.5);
      expect(timeRow.score).toBe(0.05);
      expect(timeRow.weight).toBe(0.5);
      expect(valRow).toBeUndefined();
      expect(exp.calculation).toContain('0.50 × 0.36');
      expect(exp.calculation).toContain('0.50 × 0.05');
    });
  });
});
