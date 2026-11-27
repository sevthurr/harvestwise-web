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

  it('correctly attributes personnel: reviewer viewing another personnel draft displays original encoder', () => {
    const staffList = [
      { id: '1', user_id: 'USR-0012', name: 'REIZEN CRAEZUA', role: 'Agri Service and Related Worker' },
      { id: '2', user_id: 'USR-0019', name: 'RECHELLE ANN HIZO', role: 'Acting Section Head' },
      { id: '3', user_id: 'USR-0002', name: 'MARIA S. SANTOS', role: 'Agri Service and Related Worker' },
    ];
    const reviewerUser = { id: 'USR-0019', first_name: 'Rechelle Ann', last_name: 'Hizo', position: 'Acting Section Head' };
    const draftEncoder = { userId: 'USR-0002', name: 'MARIA S. SANTOS' };

    const isCurrentUserReviewer = isPrivilegedDftcPosition(reviewerUser);
    expect(isCurrentUserReviewer).toBe(true);

    const currentStaff = staffList.find((s) => s.user_id === reviewerUser.id);
    const detectedDraftEncoder = staffList.find((s) => s.user_id === draftEncoder.userId);

    // Default encoder for reviewer MUST be the draft encoder (Maria S. Santos), never the reviewer or random staff
    const defaultEncoder = detectedDraftEncoder || currentStaff;
    const defaultReviewer = currentStaff;

    expect(defaultEncoder.name).toBe('MARIA S. SANTOS');
    expect(defaultEncoder.role).toBe('Agri Service and Related Worker');
    expect(defaultReviewer.name).toBe('RECHELLE ANN HIZO');
    expect(defaultReviewer.role).toBe('Acting Section Head');
  });

  it('correctly attributes personnel: encoder creating draft displays self as encoder', () => {
    const staffList = [
      { id: '1', user_id: 'USR-0012', name: 'REIZEN CRAEZUA', role: 'Agri Service and Related Worker' },
      { id: '2', user_id: 'USR-0019', name: 'RECHELLE ANN HIZO', role: 'Acting Section Head' },
      { id: '3', user_id: 'USR-0002', name: 'MARIA S. SANTOS', role: 'Agri Service and Related Worker' },
    ];
    const encoderUser = { id: 'USR-0002', first_name: 'Maria', last_name: 'Santos', position: 'Agri Service and Related Worker' };
    const reviewerStaffList = staffList.filter(isReviewerStaff);

    const isCurrentUserReviewer = isPrivilegedDftcPosition(encoderUser);
    expect(isCurrentUserReviewer).toBe(false);

    const currentStaff = staffList.find((s) => s.user_id === encoderUser.id);
    const defaultEncoder = currentStaff;
    const defaultReviewer = reviewerStaffList[0];

    expect(defaultEncoder.name).toBe('MARIA S. SANTOS');
    expect(defaultReviewer.name).toBe('RECHELLE ANN HIZO');
  });

  it('correctly attributes personnel: special case where reviewer self-encodes new record from scratch', () => {
    const staffList = [
      { id: '1', user_id: 'USR-0012', name: 'REIZEN CRAEZUA', role: 'Agri Service and Related Worker' },
      { id: '2', user_id: 'USR-0019', name: 'RECHELLE ANN HIZO', role: 'Acting Section Head' },
      { id: '3', user_id: 'USR-0002', name: 'MARIA S. SANTOS', role: 'Agri Service and Related Worker' },
    ];
    const reviewerUser = { id: 'USR-0019', first_name: 'Rechelle Ann', last_name: 'Hizo', position: 'Acting Section Head' };
    const isCurrentUserReviewer = isPrivilegedDftcPosition(reviewerUser);
    expect(isCurrentUserReviewer).toBe(true);

    const currentStaff = staffList.find((s) => s.user_id === reviewerUser.id);
    const serverDraftEncoder = null; // No previous draft exists
    const detectedDraftEncoder = null;

    const defaultReviewer = currentStaff;
    const defaultEncoder = detectedDraftEncoder || currentStaff;

    expect(defaultEncoder.name).toBe('RECHELLE ANN HIZO');
    expect(defaultReviewer.name).toBe('RECHELLE ANN HIZO');
  });
});
