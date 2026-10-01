import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5173/?preview=legacy');
  await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.legacy-preview-label')?.textContent.includes('Saved on this browser'));
  await page.evaluate(async () => {
    const { journeyRepository } = await import('/src/game/legacy/journeyRepository.ts');
    const { adoptRescue } = await import('/src/game/legacy/journey.ts');
    const record = await journeyRepository.load();
    const j = adoptRescue({ ...record.journey, readLedger: true, prepared: true, kennelName: 'Test Kennel' }, 'fern', 'Fern', ['quiet'], 'exit-test', '2026-09-30T12:00:00Z');
    await journeyRepository.save({ ...j, settled: true, firstRecall: true, routine: { ...j.routine, fed: true, watered: true } }, record.revision);
  });
  await page.reload();
  await page.getByRole('button', { name: 'Walk there', exact: false }).click();
  await page.waitForFunction(() => document.querySelector('.legacy-preview')?.getAttribute('data-nearest') === 'field', null, { timeout: 35000 });
  await page.locator('.legacy-interaction button').click();
  await page.getByRole('button', { name: 'Enter the training meadow', exact: true }).click();
  assert.equal(await page.getByRole('dialog').evaluate(d => d.open && d.matches(':modal')), true);
  await page.screenshot({ path: '.browser.local/focus-intro-phone.png' });
  await page.getByRole('button', { name: 'Start our walk', exact: true }).click();
  await page.keyboard.down('KeyW'); await page.waitForTimeout(400); await page.keyboard.up('KeyW');
  await page.keyboard.press('Escape');
  await page.getByRole('heading', { name: 'Take a breath.', exact: true }).waitFor();
  const before = await page.locator('.focus-game').getAttribute('data-keeper-z');
  await page.keyboard.down('KeyW'); await page.waitForTimeout(300); await page.keyboard.up('KeyW');
  assert.equal(await page.locator('.focus-game').getAttribute('data-keeper-z'), before);
  await page.getByRole('button', { name: 'Back to the kennel · leave this lesson', exact: true }).click();
  await page.getByRole('heading', { name: 'Stay with me.', exact: true }).waitFor();
  const j = await page.evaluate(async () => (await (await import('/src/game/legacy/journeyRepository.ts')).journeyRepository.load()).journey);
  assert.equal(j.routine.sessions, 0); assert.equal(j.routine.energy, 75); assert.equal(j.routine.focus, 0);
  console.log('Training: native modal, keyboard pause, explicit return and no cancelled-lesson rewards/costs passed');
  await context.close();
} finally { await browser.close(); }
