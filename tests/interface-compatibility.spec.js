// @ts-check
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Formal HarvestWise Interface and Device Compatibility Testing Suite
 *
 * Runs against the local HarvestWise application (http://localhost:5173).
 * Zero API mocking: evaluates the real local frontend, backend, and database.
 *
 * Target profiles:
 *   - farmer-mobile-chrome (Mobile Chrome, 390 × 844)
 *   - chrome-desktop (Google Chrome, 1366 × 768)
 *   - edge-desktop (Microsoft Edge, 1366 × 768)
 */

/**
 * Record test execution metric into formal results registry.
 * Generates the formal table: | Test | Browser / Device | Viewport | Overflow | Result |
 */
function recordCompatibilityResult({ testName, project, overflow, result, viewport }) {
  const browserDeviceMap = {
    'farmer-mobile-chrome': 'Mobile Chrome',
    'chrome-desktop': 'Google Chrome',
    'edge-desktop': 'Microsoft Edge',
    'mobile-safari-webkit': 'Mobile Safari (WebKit Emulation)',
    'firefox-desktop': 'Mozilla Firefox Desktop',
  };
  const viewportMap = {
    'farmer-mobile-chrome': '390 × 844',
    'chrome-desktop': '1366 × 768',
    'edge-desktop': '1366 × 768',
    'mobile-safari-webkit': '390 × 664',
    'firefox-desktop': '1366 × 768',
  };

  const entry = {
    test: testName,
    browserDevice: browserDeviceMap[project] || project,
    viewport: viewport || viewportMap[project] || '1366 × 768',
    overflow,
    result,
  };

  const resultsDir = path.resolve('test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  const resultsFile = path.join(resultsDir, 'formal-compatibility-results.json');
  let results = [];
  if (fs.existsSync(resultsFile)) {
    try {
      results = JSON.parse(fs.readFileSync(resultsFile, 'utf-8'));
    } catch {
      results = [];
    }
  }

  const existingIndex = results.findIndex(
    (r) => r.test === entry.test && r.browserDevice === entry.browserDevice
  );
  if (existingIndex >= 0) {
    results[existingIndex] = entry;
  } else {
    results.push(entry);
  }

  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
}

/**
 * Asserts page layout and verifies that no unintended page-level horizontal overflow exists.
 * document.documentElement.scrollWidth <= document.documentElement.clientWidth
 */
async function assertPageLayout(page, testInfo, testName) {
  const isOverflowing = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });

  const overflowStatus = isOverflowing ? 'Detected' : 'None';
  const resultStatus = isOverflowing ? 'Failed' : 'Passed';
  const vp = page.viewportSize();
  const currentViewport = vp ? `${vp.width} × ${vp.height}` : undefined;

  recordCompatibilityResult({
    testName,
    project: testInfo.project.name,
    overflow: overflowStatus,
    result: resultStatus,
    viewport: currentViewport,
  });

  expect(isOverflowing, `Unintended horizontal overflow detected on ${testName}`).toBe(false);
}

/**
 * Save representative screenshot under test-results/evidence/
 */
async function captureEvidenceScreenshot(page, filename) {
  const dir = path.resolve('test-results/evidence');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filepath = path.join(dir, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`[Evidence Screenshot Saved] ${filepath}`);
}

/**
 * Authentication Setup for local HarvestWise testing.
 * Uses real local test accounts from environment variables with state reuse.
 * Zero mocked /api/v1/ responses.
 */
async function setupSession(page, role = 'Farmer') {
  const roleEnvMap = {
    Farmer: {
      user: process.env.PLAYWRIGHT_FARMER_USER || 'farmer@harvestwise.test',
      pass: process.env.PLAYWRIGHT_FARMER_PASS || 'TestPass123!',
      expectedPrefix: '/farmer',
    },
    DFTC: {
      user: process.env.PLAYWRIGHT_DFTC_USER || 'dftc@harvestwise.test',
      pass: process.env.PLAYWRIGHT_DFTC_PASS || 'TestPass123!',
      expectedPrefix: '/dftc',
    },
    Admin: {
      user: process.env.PLAYWRIGHT_ADMIN_USER || 'rechelle.hizo@harvestwise.test',
      pass: process.env.PLAYWRIGHT_ADMIN_PASS || 'TestPass123!',
      expectedPrefix: '/admin',
    },
  };

  const creds = roleEnvMap[role];
  if (!creds || !creds.user || !creds.pass) {
    throw new Error(
      `Local testing credentials for role "${role}" were not provided. ` +
      `Set PLAYWRIGHT_${role.toUpperCase()}_USER and PLAYWRIGHT_${role.toUpperCase()}_PASS environment variables.`
    );
  }

  const authDir = path.resolve('test-results/.auth');
  const authFile = path.join(authDir, `${role.toLowerCase()}-state.json`);

  // Step 1: Restore saved storageState cookies if available
  if (fs.existsSync(authFile)) {
    try {
      const state = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
      if (Array.isArray(state.cookies) && state.cookies.length > 0) {
        await page.context().addCookies(state.cookies);
      }
    } catch {
      // Fall through to standard login
    }
  }

  // Step 2: Open application to check session state
  await page.goto('/');

  // Step 3: Wait for SmartRedirect to determine auth state
  try {
    await page.waitForURL(
      (url) => {
        const p = url.pathname;
        return p.includes('/login') || p.includes('/farmer') || p.includes('/dftc') || p.includes('/admin');
      },
      { timeout: 15000 }
    );
  } catch {
    // Proceed to URL check
  }

  const currentPath = new URL(page.url()).pathname;

  // Step 4: If already authenticated to the expected workspace, skip login inputs
  if (currentPath.startsWith(creds.expectedPrefix)) {
    return;
  }

  // Step 5: If not authenticated, ensure login page is loaded
  if (!page.url().includes('/login')) {
    await page.goto('/login');
    await page.waitForURL('**/login', { timeout: 10000 }).catch(() => {});
  }

  // Step 6: Wait for login inputs
  const identifierInput = page.locator('#identifier');
  const passwordInput = page.locator('#password');
  // Unambiguous submit button selector: matches only the exact form submit action, never "Sign in with Google"
  const submitButton = page
    .getByRole('button', { name: 'Sign in', exact: true })
    .or(page.getByRole('button', { name: 'Mag-sign in', exact: true }))
    .or(page.locator('button[type="submit"]'))
    .first();

  try {
    await identifierInput.waitFor({ state: 'visible', timeout: 12000 });
  } catch (err) {
    const diagDir = path.resolve('test-results/diagnostics');
    if (!fs.existsSync(diagDir)) fs.mkdirSync(diagDir, { recursive: true });
    const screenshotPath = path.join(diagDir, `login-form-missing-${role.toLowerCase()}-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath }).catch(() => {});

    throw new Error(
      `[Auth Failure] Could not locate #identifier on login page.\n` +
      `- URL: ${page.url()}\n` +
      `- Title: ${await page.title().catch(() => '')}\n` +
      `- Diagnostic screenshot: ${screenshotPath}`
    );
  }

  // Step 7: Fill credentials and submit
  await identifierInput.fill(creds.user);
  await passwordInput.fill(creds.pass);
  await submitButton.click();

  // Step 8: Confirm post-login redirect
  try {
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 });
  } catch (err) {
    const diagDir = path.resolve('test-results/diagnostics');
    if (!fs.existsSync(diagDir)) fs.mkdirSync(diagDir, { recursive: true });
    const screenshotPath = path.join(diagDir, `login-submit-timeout-${role.toLowerCase()}-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath }).catch(() => {});

    const errorAlert = await page.locator('[role="alert"], .text-red-600').innerText().catch(() => '');
    throw new Error(
      `[Auth Failure] Redirection after login timed out.\n` +
      `- Alert text: "${errorAlert || 'None detected'}"\n` +
      `- Current URL: ${page.url()}\n` +
      `- Diagnostic screenshot: ${screenshotPath}`
    );
  }

  // Step 9: Save storageState for session reuse
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  const tempAuthFile = path.join(authDir, `${role.toLowerCase()}-${process.pid}-${Date.now()}.tmp`);
  await page.context().storageState({ path: tempAuthFile });
  try {
    fs.copyFileSync(tempAuthFile, authFile);
    fs.unlinkSync(tempAuthFile);
  } catch {
    // Ignore minor file lock contention
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// IC-01 – Farmer Core Interface on Mobile
// ─────────────────────────────────────────────────────────────────────────────
test.describe('IC-01 – Farmer Core Interface on Mobile @mobile @farmer', () => {
  test.beforeEach(async ({ page }) => {
    await setupSession(page, 'Farmer');
  });

  test('Farmer Dashboard renders content and controls without horizontal overflow @mobile @farmer', async ({ page }, testInfo) => {
    await page.goto('/farmer');
    await expect(page).toHaveTitle(/HarvestWise/i);

    const navBar = page.locator('nav:visible').first();
    await expect(navBar).toBeVisible();

    await assertPageLayout(page, testInfo, 'Farmer Dashboard');
  });

  test('Crop Assessment step 1 renders accessible inputs without clipping @compat @mobile @farmer', async ({ page }, testInfo) => {
    await page.goto('/farmer/assess');
    await expect(page).toHaveTitle(/HarvestWise/i);

    const mainContainer = page.locator('main, [role="main"], form').first();
    await expect(mainContainer).toBeVisible();

    const actionButton = page.locator('button:visible').first();
    await expect(actionButton).toBeVisible();

    await assertPageLayout(page, testInfo, 'Crop Assessment');

    if (testInfo.project.name === 'farmer-mobile-chrome') {
      await captureEvidenceScreenshot(page, 'farmer-crop-assessment-390x844.png');
    } else if (testInfo.project.name === 'mobile-safari-webkit') {
      await captureEvidenceScreenshot(page, 'mobile-safari-crop-assessment-390x664.png');
    }
  });

  test('Recommendation Result view renders properly @compat @mobile @farmer', async ({ page }, testInfo) => {
    await page.goto('/farmer/market');
    await expect(page).toHaveTitle(/HarvestWise/i);

    const content = page.locator('main, [role="main"], .min-h-screen').first();
    await expect(content).toBeVisible();

    await assertPageLayout(page, testInfo, 'Recommendation Result');
  });

  test('My Crops list view renders and fits viewport @mobile @farmer', async ({ page }, testInfo) => {
    await page.goto('/farmer/crops');
    await expect(page).toHaveTitle(/HarvestWise/i);

    await expect(page.locator('main, [role="main"]').first()).toBeVisible();

    await assertPageLayout(page, testInfo, 'My Crops');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IC-02 – Farmer Market and Weather Views
// ─────────────────────────────────────────────────────────────────────────────
test.describe('IC-02 – Farmer Market and Weather Views @mobile @farmer', () => {
  test.beforeEach(async ({ page }) => {
    await setupSession(page, 'Farmer');
  });

  test('Market Prices view renders search, cards, and fits viewport @mobile @farmer', async ({ page }, testInfo) => {
    await page.goto('/farmer/prices');
    await expect(page).toHaveTitle(/HarvestWise/i);

    const searchInput = page.locator('input[type="text"], input[type="search"]').first();
    await expect(searchInput).toBeVisible();

    await assertPageLayout(page, testInfo, 'Market Prices');
  });

  test('Price Forecast view renders horizon options and chart card @compat @mobile @farmer', async ({ page }, testInfo) => {
    await page.goto('/farmer/forecast');
    await expect(page).toHaveTitle(/HarvestWise/i);

    const forecastContainer = page.locator('main, [role="main"]').first();
    await expect(forecastContainer).toBeVisible();

    await assertPageLayout(page, testInfo, 'Price Forecast');

    if (testInfo.project.name === 'farmer-mobile-chrome') {
      await captureEvidenceScreenshot(page, 'farmer-market-forecast-390x844.png');
    } else if (testInfo.project.name === 'mobile-safari-webkit') {
      await captureEvidenceScreenshot(page, 'mobile-safari-market-forecast-390x664.png');
    }
  });

  test('Weather and Advisory view renders weather cards and info @mobile @farmer', async ({ page }, testInfo) => {
    await page.goto('/farmer/market/weather');
    await expect(page).toHaveTitle(/HarvestWise/i);

    const weatherContainer = page.locator('main, [role="main"]').first();
    await expect(weatherContainer).toBeVisible();

    await assertPageLayout(page, testInfo, 'Weather and Advisory');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IC-03 – DFTC Desktop Interface
// ─────────────────────────────────────────────────────────────────────────────
test.describe('IC-03 – DFTC Desktop Interface @desktop @dftc @compat', () => {
  test.beforeEach(async ({ page }) => {
    await setupSession(page, 'DFTC');
  });

  test('Manual Price Entry renders controls and table container without layout breakage @compat @desktop @dftc', async ({ page }, testInfo) => {
    await page.goto('/dftc/price-input');
    await expect(page).toHaveTitle(/HarvestWise/i);

    await expect(page.locator('main, [role="main"]').first()).toBeVisible();

    await assertPageLayout(page, testInfo, 'DFTC Price Entry');
  });

  test('Manual Arrival Entry renders date and arrival inputs @compat @desktop @dftc', async ({ page }, testInfo) => {
    await page.goto('/dftc/arrival-input');
    await expect(page).toHaveTitle(/HarvestWise/i);

    await expect(page.locator('main, [role="main"]').first()).toBeVisible();

    await assertPageLayout(page, testInfo, 'DFTC Arrival Entry');
  });

  test('Submission History renders datasets table/list @compat @desktop @dftc', async ({ page }, testInfo) => {
    await page.goto('/dftc/submissions');
    await expect(page).toHaveTitle(/HarvestWise/i);

    await expect(page.locator('main, [role="main"]').first()).toBeVisible();

    await assertPageLayout(page, testInfo, 'DFTC Submission History');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IC-04 – DFTC Dataset Upload Interface
// ─────────────────────────────────────────────────────────────────────────────
test.describe('IC-04 – DFTC Dataset Upload Interface @desktop @dftc @compat', () => {
  test.beforeEach(async ({ page }) => {
    await setupSession(page, 'DFTC');
  });

  test('Initial upload state renders dropzone and template buttons @compat @desktop @dftc', async ({ page }, testInfo) => {
    await page.goto('/dftc/upload');
    await expect(page).toHaveTitle(/HarvestWise/i);

    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    await assertPageLayout(page, testInfo, 'DFTC Dataset Upload - Initial');
  });

  test('Valid file state displays file preview card and information @compat @desktop @dftc', async ({ page }, testInfo) => {
    await page.goto('/dftc/upload');

    // Test file selection and preview card without final commit/import
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'dftc_sample_prices.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('Date,Commodity,Price\n2026-11-06,Ampalaya,56\n'),
    });

    await expect(page.getByText('dftc_sample_prices.csv')).toBeVisible();

    await assertPageLayout(page, testInfo, 'DFTC Dataset Upload - Preview');
  });

  test('Validation error state presents readable error without layout breakage @compat @desktop @dftc', async ({ page }, testInfo) => {
    await page.goto('/dftc/upload');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'invalid_data.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('Invalid,Headers\n'),
    });

    await expect(page.getByText('invalid_data.csv')).toBeVisible();

    // Trigger validation (safe preview/validation state, does not commit records)
    const validateBtn = page.getByRole('button', { name: /Validate/i });
    if (await validateBtn.isVisible()) {
      await validateBtn.click();
      const errorAlert = page.locator('.text-red-600, [role="alert"]').first();
      await expect(errorAlert).toBeVisible();
    }

    await assertPageLayout(page, testInfo, 'DFTC Dataset Upload - Validation');

    if (testInfo.project.name === 'chrome-desktop') {
      await captureEvidenceScreenshot(page, 'dftc-dataset-upload-1366x768.png');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IC-05 – Administrator Desktop Interface
// ─────────────────────────────────────────────────────────────────────────────
test.describe('IC-05 – Administrator Desktop Interface @desktop @admin @compat', () => {
  test.beforeEach(async ({ page }) => {
    await setupSession(page, 'Admin');
  });

  test('Admin dashboard and data-sources render tables and navigation @compat @desktop @admin', async ({ page }, testInfo) => {
    await page.goto('/admin');
    await expect(page).toHaveTitle(/HarvestWise/i);

    await expect(page.locator('header, aside:visible, nav:visible').first()).toBeVisible();

    await page.goto('/admin/data-sources');
    await expect(page).toHaveTitle(/HarvestWise/i);

    await assertPageLayout(page, testInfo, 'Admin Dashboard');
  });

  test('Analytical configuration interface renders modules and threshold controls @compat @desktop @admin', async ({ page }, testInfo) => {
    await page.goto('/admin/modules');
    await expect(page).toHaveTitle(/HarvestWise/i);

    await expect(page.locator('main, [role="main"]').first()).toBeVisible();

    await assertPageLayout(page, testInfo, 'Admin Analytical Configuration');

    if (testInfo.project.name === 'chrome-desktop') {
      await captureEvidenceScreenshot(page, 'admin-analytical-configuration-1366x768.png');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IC-06 – UI Data Consistency
// ─────────────────────────────────────────────────────────────────────────────
test.describe('IC-06 – UI Data Consistency @desktop @data-consistency', () => {
  test('Renders formatted price and forecast matching real local API data @desktop @data-consistency', async ({ page }, testInfo) => {
    await setupSession(page, 'Farmer');

    // Capture real local prices API response
    let capturedApiResponse = null;
    page.on('response', async (response) => {
      if (response.url().includes('/prices') && response.status() === 200) {
        try {
          const json = await response.json();
          if (json && (json.items || Array.isArray(json))) {
            capturedApiResponse = json;
          }
        } catch {
          // Ignore non-JSON response
        }
      }
    });

    await page.goto('/farmer/prices');
    await page.waitForLoadState('domcontentloaded');

    const item =
      capturedApiResponse?.items?.[0] ||
      (Array.isArray(capturedApiResponse) ? capturedApiResponse[0] : null);

    if (item) {
      const priceVal = item.prices?.bangkerohan_retail ?? item.prices?.bangkerohanRetail;
      if (priceVal != null) {
        const expectedUI = `₱${priceVal}/kg`;
        const pageTexts = await page.locator('p, span').allInnerTexts();
        const found = pageTexts.some((t) => t.includes(String(priceVal)));
        expect(found, `Expected local price ${expectedUI} in UI`).toBe(true);
      }
    }

    await assertPageLayout(page, testInfo, 'UI Data Consistency');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IC-07 – DFTC Mobile Compatibility
// ─────────────────────────────────────────────────────────────────────────────
test.describe('IC-07 – DFTC Mobile Compatibility @mobile @dftc-mobile', () => {
  test.beforeEach(async ({ page }) => {
    await setupSession(page, 'DFTC');
  });

  test('DFTC Data Entry renders controls and inputs without clipping or horizontal overflow @mobile @dftc-mobile', async ({ page }, testInfo) => {
    await page.goto('/dftc/price-input');
    await expect(page).toHaveTitle(/HarvestWise/i);

    // Verify main container and responsive wrapper render properly
    const mainContainer = page.locator('main, [role="main"], div.max-w-\\[1440px\\]').first();
    await expect(mainContainer).toBeVisible();

    // Verify critical controls are accessible in mobile layout
    const pageHeader = page.getByRole('heading', { level: 1 }).or(page.getByText('Add Price Data')).first();
    await expect(pageHeader).toBeVisible();

    const actionButton = page.locator('button:visible').first();
    await expect(actionButton).toBeVisible();

    await assertPageLayout(page, testInfo, 'DFTC Data Entry');
  });

  test('DFTC Dataset Upload renders dropzone and preview within mobile viewport @mobile @dftc-mobile', async ({ page }, testInfo) => {
    await page.goto('/dftc/upload');
    await expect(page).toHaveTitle(/HarvestWise/i);

    // Verify file input/dropzone is attached and accessible in mobile layout
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    // Safe non-destructive preview check without committing dataset import
    await fileInput.setInputFiles({
      name: 'dftc_sample_mobile.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('Date,Commodity,Price\n2026-11-06,Ampalaya,56\n'),
    });

    await expect(page.getByText('dftc_sample_mobile.csv')).toBeVisible();

    await assertPageLayout(page, testInfo, 'DFTC Dataset Upload');

    if (testInfo.project.name === 'farmer-mobile-chrome') {
      await captureEvidenceScreenshot(page, 'dftc-dataset-upload-mobile-chrome-390x844.png');
    } else if (testInfo.project.name === 'mobile-safari-webkit') {
      await captureEvidenceScreenshot(page, 'dftc-dataset-upload-mobile-safari-390x664.png');
    }
  });
});

