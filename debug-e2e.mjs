import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect console messages
  const logs = [];
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    logs.push(`[${type}] ${text}`);
  });

  // Collect errors
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  try {
    console.log('Navigating to http://localhost:5173/?test=true');
    await page.goto('http://localhost:5173/?test=true', {
      waitUntil: 'networkidle',
      timeout: 10000
    });

    console.log('\nWaiting 3 seconds for app to load...');
    await page.waitForTimeout(3000);

    // Check for the element
    const element = await page.$('[data-testid="sip-client"]');
    console.log('\nElement found:', !!element);

    // Get page content
    const html = await page.content();
    console.log('\nPage HTML length:', html.length);

    // Check body content
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('\nBody text (first 500 chars):\n', bodyText.substring(0, 500));

    // Check for app div
    const appDiv = await page.$('#app');
    const appHTML = appDiv ? await appDiv.innerHTML() : null;
    console.log('\n#app innerHTML length:', appHTML?.length || 0);
    if (appHTML) {
      console.log('#app innerHTML (first 500 chars):\n', appHTML.substring(0, 500));
    }

    // Console logs
    console.log('\n=== CONSOLE LOGS ===');
    logs.forEach(log => console.log(log));

    // Errors
    console.log('\n=== ERRORS ===');
    errors.forEach(err => console.log(err));

    // Take screenshot
    await page.screenshot({ path: '/tmp/e2e-debug.png', fullPage: true });
    console.log('\nScreenshot saved to /tmp/e2e-debug.png');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
