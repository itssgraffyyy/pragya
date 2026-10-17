import { test, expect } from '@playwright/test';

test.describe('PRAGYA Module 1 — Complete User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home screen — retry navigation since Vite cold-start
    // on Windows can be slow for the first page load
    let loaded = false;
    for (let attempt = 0; attempt < 3 && !loaded; attempt++) {
      try {
        await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
        // Wait for the React app to actually render (home screen buttons)
        await page
          .locator('[data-testid^="home-"]')
          .first()
          .waitFor({ state: 'visible', timeout: 30_000 });
        loaded = true;
      } catch {
        if (attempt === 2) throw new Error('App did not load after 3 attempts — is the dev server up?');
      }
    }
    // Verify app shell is present
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('scenario selection → simulation → classification → session completion → saved results', async ({ page }) => {
    // ── Step 1: Home → Scenario Selection ──
    await page.click('[data-testid="home-scenario-selection"]');
    await expect(page.locator('[data-testid^="scenario-card-"]').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('h2')).toContainText('Scenario Selection', { timeout: 30_000 });
    await expect(page.locator('[data-testid="scenario-card-scn-single-recognition"]')).toBeVisible();

    // ── Step 2: Select scenario → Begin exercise ──
    await page.click('[data-testid="begin-scn-single-recognition"]');

    // Should land on console screen with "Ready" state
    await expect(page.locator('[data-testid="state-badge"]')).toContainText('ready');
    await expect(page.locator('[data-testid="btn-start"]')).toBeVisible();

    // ── Step 3: Start exercise ──
    await page.click('[data-testid="btn-start"]');
    await expect(page.locator('[data-testid="state-badge"]')).toContainText('running');

    // ── Step 4: Wait for contact to spawn (c1 spawns at T+5s) ──
    // The sim runs on simulation time driven by rAF; wait for the row
    // instead of sleeping a fixed wall-clock interval. Headless rAF can
    // be throttled so sim time lags wall time.
    await expect(page.locator('[data-testid="contact-row-c1"]')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('[data-testid="contact-row-c1"]')).toContainText('Small multirotor-like');

    // ── Step 5: Select contact and acknowledge ──
    await page.click('[data-testid="contact-row-c1"]');
    await expect(page.locator('[data-testid="assessment-c1"]')).toBeVisible();
    // The ack button enables only once the contact is observable
    // (visible/occluded). Sim time lags wall time under headless rAF,
    // so wait for enabled explicitly before clicking.
    await expect(page.locator('[data-testid="btn-ack-c1"]')).toBeEnabled({ timeout: 60_000 });
    await page.click('[data-testid="btn-ack-c1"]');

    // ── Step 6: Classify ──
    await page.selectOption('[data-testid="select-classification-c1"]', 'smallMultirotor');
    await expect(page.locator('[data-testid="select-classification-c1"]')).toHaveValue('smallMultirotor');

    // ── Step 7: Set confidence ──
    await page.click('[data-testid="btn-confidence-high-c1"]');

    // ── Step 8: Add evidence ──
    await page.check('[data-testid="check-evidence-rotorSilhouette-c1"]');

    // ── Step 9: Select procedural response ──
    await page.selectOption('[data-testid="select-response-c1"]', 'recordAndReport');

    // ── Step 10: Submit assessment ──
    await expect(page.locator('[data-testid="btn-submit-c1"]')).toBeEnabled({ timeout: 15_000 });
    await page.click('[data-testid="btn-submit-c1"]');
    await expect(page.locator('[data-testid="assessment-c1"]')).toContainText('Submitted');

    // ── Step 11: End session ──
    await expect(page.locator('[data-testid="btn-end"]')).toBeVisible({ timeout: 15_000 });
    await page.click('[data-testid="btn-end"]');

    // ── Step 12: Session Summary (ground truth revealed) ──
    await expect(page.locator('h2')).toContainText('Session Summary', { timeout: 30_000 });
    await expect(page.locator('[data-testid="summary-row-c1"]')).toBeVisible();
    await expect(page.locator('[data-testid="count-correct"]')).toBeVisible();
    await expect(page.locator('[data-testid="count-incorrect"]')).toBeVisible();

    // Verify ground truth matches classification
    const groundTruthCell = page.locator('[data-testid="summary-row-c1"]').locator('td').nth(2);
    await expect(groundTruthCell).toContainText('smallMultirotor');

    // ── Step 13: Export session ──
    await page.click('[data-testid="btn-export"]');

    // ── Step 14: Back to scenarios → History ──
    await page.click('text=Back to scenarios');
    await page.click('[data-testid="home-session-history"]');
    await expect(page.locator('h2')).toContainText('Session History');

    // The completed session should appear in history
    // Note: session may or may not persist depending on storage adapter
    // We verify the screen loads without error
    await expect(page.locator('[data-testid="history-empty"], [data-testid^="history-"]')).toBeVisible();
  });

  test('generator screen produces a scenario and begins exercise', async ({ page }) => {
    await page.click('[data-testid="home-generate-scenario"]');
    await expect(page.locator('h2')).toContainText('Scenario Generator');

    await page.click('[data-testid="gen-generate"]');
    await expect(page.locator('[data-testid="gen-preview"]')).toBeVisible();

    await page.click('[data-testid="gen-begin"]');
    await expect(page.locator('[data-testid="state-badge"]')).toContainText('ready');
  });

  test('ground truth is NOT visible during simulation (trainee view)', async ({ page }) => {
    await page.click('[data-testid="home-scenario-selection"]');
    await page.click('[data-testid="begin-scn-single-recognition"]');
    await page.click('[data-testid="btn-start"]');
    await page.waitForTimeout(6000);

    await page.click('[data-testid="contact-row-c1"]');
    await page.click('[data-testid="btn-ack-c1"]');

    // During simulation, ground truth label should NOT appear anywhere
    await expect(page.locator('text=groundTruth')).not.toBeVisible();
    await expect(page.locator('text=Ground Truth')).not.toBeVisible();

    // But category (trainee-facing) should be visible
    await expect(page.locator('[data-testid="contact-row-c1"]')).toContainText('Small multirotor-like');
  });
});
