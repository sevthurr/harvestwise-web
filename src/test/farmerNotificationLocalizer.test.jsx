import { describe, it, expect } from 'vitest';

import { localizeFarmerNotification } from '../app/farmer/utils/farmerNotificationLocalizer';
import { t } from '../app/global/i18n/index';

describe('Farmer Notification Dynamic Localization & Fallback', () => {
  const priceItem = {
    id: 'FNT-01',
    category: 'price_change',
    title: 'Kamatis price rose',
    body: 'The latest market price for Kamatis is 55.00 PHP/kg, up from 50.00 PHP/kg.',
    metadata: {
      commodity_name: 'Kamatis',
      direction: 'rose',
      latest: 55,
      prev: 50,
    },
  };

  it('localizes into English (en)', () => {
    const tEn = (key, params, fallback) => t(key, params, 'en') || fallback;
    const { title, body } = localizeFarmerNotification(priceItem, tEn, 'en');
    expect(title).toBe('Kamatis price rose');
    expect(body).toBe('The latest market price for Kamatis is 55.00 PHP/kg, up from 50.00 PHP/kg.');
  });

  it('localizes into Davao Bisaya (ceb)', () => {
    const tCeb = (key, params, fallback) => t(key, params, 'ceb') || fallback;
    const { title, body } = localizeFarmerNotification(priceItem, tCeb, 'ceb');
    expect(title).toBe('Misaka ang presyo sa Kamatis');
    expect(body).toBe('Ang pinakaulahing presyo sa merkado alang sa Kamatis kay 55.00 PHP/kg, mas taas gikan sa 50.00 PHP/kg.');
  });

  it('localizes into Filipino (tl)', () => {
    const tTl = (key, params, fallback) => t(key, params, 'tl') || fallback;
    const { title, body } = localizeFarmerNotification(priceItem, tTl, 'tl');
    expect(title).toBe('Tumaas ang presyo ng Kamatis');
    expect(body).toBe('Ang pinakahuling presyo sa merkado para sa Kamatis ay 55.00 PHP/kg, tumaas mula 50.00 PHP/kg.');
  });

  it('runtime language switch re-renders existing notification without database change', () => {
    const tEn = (key, params, fallback) => t(key, params, 'en') || fallback;
    const tCeb = (key, params, fallback) => t(key, params, 'ceb') || fallback;

    const resEn = localizeFarmerNotification(priceItem, tEn, 'en');
    const resCeb = localizeFarmerNotification(priceItem, tCeb, 'ceb');

    expect(resEn.title).toBe('Kamatis price rose');
    expect(resCeb.title).toBe('Misaka ang presyo sa Kamatis');
  });

  it('localizes Atsal (Sultan) price_update with date into EN, CEB, and TL', () => {
    const atsalUpdate = {
      id: 'FNT-0001',
      category: 'price_update',
      title: 'New prices available for Atsal (Sultan)',
      body: 'Updated market prices for Atsal (Sultan) are now available as of 2026-09-19.',
      route: '/farmer/prices',
      metadata: { commodity_id: 'COM-0037' },
    };

    const tEn = (key, params, fallback) => t(key, params, 'en') || fallback;
    const tCeb = (key, params, fallback) => t(key, params, 'ceb') || fallback;
    const tTl = (key, params, fallback) => t(key, params, 'tl') || fallback;

    // EN: Title and Body must be English
    const en = localizeFarmerNotification(atsalUpdate, tEn, 'en');
    expect(en.title).toBe('New prices available for Atsal (Sultan)');
    expect(en.body).toBe('Updated market prices for Atsal (Sultan) are now available as of 2026-09-19.');

    // CEB: Title and Body must be Davao Bisaya
    const ceb = localizeFarmerNotification(atsalUpdate, tCeb, 'ceb');
    expect(ceb.title).toBe('Bag-ong presyo alang sa Atsal (Sultan)');
    expect(ceb.body).toBe('Ang gi-update nga presyo sa merkado alang sa Atsal (Sultan) anaa na karon sugod 2026-09-19.');

    // TL: Title and Body must be Filipino
    const tl = localizeFarmerNotification(atsalUpdate, tTl, 'tl');
    expect(tl.title).toBe('Bagong presyo para sa Atsal (Sultan)');
    expect(tl.body).toBe('Ang na-update na presyo sa merkado para sa Atsal (Sultan) ay available na simula 2026-09-19.');
  });

  it('localizes weather_alert, harvest_reminder, and planting_advisory in EN, CEB, and TL', () => {
    const tEn = (key, params, fallback) => t(key, params, 'en') || fallback;
    const tCeb = (key, params, fallback) => t(key, params, 'ceb') || fallback;
    const tTl = (key, params, fallback) => t(key, params, 'tl') || fallback;

    // Weather alert
    const weatherItem = {
      category: 'weather_alert',
      metadata: { commodity_id: 'COM-0037', risk: 'caution' },
    };
    expect(localizeFarmerNotification(weatherItem, tEn, 'en').title).toBe('Weather Caution for Atsal (Sultan)');
    expect(localizeFarmerNotification(weatherItem, tCeb, 'ceb').title).toBe('Alerto sa panahon (Kinahanglan Bantayan) alang sa Atsal (Sultan)');
    expect(localizeFarmerNotification(weatherItem, tTl, 'tl').title).toBe('Alerto sa panahon (Kailangang Bantayan) para sa Atsal (Sultan)');

    // Harvest reminder
    const harvestItem = {
      category: 'harvest_reminder',
      metadata: { commodity_id: 'COM-0037', expected_harvest_date: '2026-10-15' },
    };
    expect(localizeFarmerNotification(harvestItem, tEn, 'en').title).toBe('Atsal (Sultan) ready for harvest');
    expect(localizeFarmerNotification(harvestItem, tCeb, 'ceb').title).toBe('Andam na alang sa pag-ani ang Atsal (Sultan)');
    expect(localizeFarmerNotification(harvestItem, tTl, 'tl').title).toBe('Handa na para sa pag-aani ang Atsal (Sultan)');

    // Planting advisory
    const plantingItem = {
      category: 'planting_advisory',
      metadata: { commodity_id: 'COM-0037', verdict: 'suitable' },
    };
    expect(localizeFarmerNotification(plantingItem, tEn, 'en').title).toBe('Planting window open for Atsal (Sultan)');
    expect(localizeFarmerNotification(plantingItem, tCeb, 'ceb').title).toBe('Abli na ang panahon sa pagtanom alang sa Atsal (Sultan)');
    expect(localizeFarmerNotification(plantingItem, tTl, 'tl').title).toBe('Bukas na ang panahon ng pagtatanim para sa Atsal (Sultan)');
  });

  it('safely falls back to stored title and body for legacy notifications without metadata', () => {
    const legacyItem = {
      id: 'FNT-LEGACY',
      category: 'custom_alert',
      title: 'Legacy system notification message',
      body: 'This is an older message that cannot be parsed.',
      metadata: {},
    };

    const tCeb = (key, params, fallback) => t(key, params, 'ceb') || fallback;
    const { title, body } = localizeFarmerNotification(legacyItem, tCeb, 'ceb');

    expect(title).toBe('Legacy system notification message');
    expect(body).toBe('This is an older message that cannot be parsed.');
    expect(title).not.toContain('farmer.notifications');
  });
});
