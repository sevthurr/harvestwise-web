import { describe, it, expect } from 'vitest';
import { isPrivilegedDftcPosition, isReviewerStaff } from '../app/dftc/utils/positionAccess';

describe('DFTC Reviewer and Save Restrictions', () => {
  it('identifies Acting Section Head and Division Chief as privileged positions', () => {
    expect(isPrivilegedDftcPosition({ position: 'Acting Section Head' })).toBe(true);
    expect(isPrivilegedDftcPosition({ position: 'acting section head' })).toBe(true);
    expect(isPrivilegedDftcPosition({ position: 'Division Chief' })).toBe(true);
    expect(isPrivilegedDftcPosition({ position: 'division chief' })).toBe(true);
    expect(isPrivilegedDftcPosition({ staff_profile: { position_name: 'Acting Section Head' } })).toBe(true);
    expect(isPrivilegedDftcPosition({ staffProfile: { position_title: 'Division Chief' } })).toBe(true);
  });

  it('rejects regular staff positions from reviewing and saving manual data', () => {
    expect(isPrivilegedDftcPosition({ position: 'Agri Service and Related Worker' })).toBe(false);
    expect(isPrivilegedDftcPosition({ position: 'Agricultural Technologist' })).toBe(false);
    expect(isPrivilegedDftcPosition({ position: 'DFTC Staff' })).toBe(false);
    expect(isPrivilegedDftcPosition(null)).toBe(false);
    expect(isPrivilegedDftcPosition({})).toBe(false);
  });

  it('filters staff list so only Acting Section Head and Division Chief are reviewer options', () => {
    const staffList = [
      { id: '1', name: 'REIZEN CRAEZUA', role: 'Agri Service and Related Worker' },
      { id: '2', name: 'RECHELLE ANN HIZO', role: 'Acting Section Head' },
      { id: '3', name: 'MARIA S. SANTOS', role: 'Agri Service and Related Worker' },
      { id: '4', name: 'JUAN DELA CRUZ', role: 'Division Chief' },
    ];

    const reviewerOptions = staffList.filter(isReviewerStaff);
    expect(reviewerOptions.map((s) => s.name)).toEqual(['RECHELLE ANN HIZO', 'JUAN DELA CRUZ']);
    expect(reviewerOptions.every((s) => isReviewerStaff(s))).toBe(true);
    expect(reviewerOptions.some((s) => s.name === 'REIZEN CRAEZUA')).toBe(false);
    expect(reviewerOptions.some((s) => s.name === 'MARIA S. SANTOS')).toBe(false);
  });
});
