# Visual Regression Testing

This directory contains visual regression tests that use Playwright's screenshot comparison feature to detect unintended UI changes.

## How Visual Testing Works

Visual tests capture screenshots of the application in various states and compare them against baseline images. When the UI changes, tests will fail if the screenshots don't match, helping catch:

- Unintended layout shifts
- CSS regressions
- Responsive design issues
- Theme/styling problems
- Accessibility visual issues

## Running Visual Tests

### First-Time Setup (Generate Baselines)

When running visual tests for the first time, you need to generate baseline screenshots:

```bash
# Generate baseline screenshots for all browsers
npx playwright test visual-regression.spec.ts --update-snapshots

# Generate for specific browser only
npx playwright test visual-regression.spec.ts --project=chromium --update-snapshots
```

This creates baseline images in `tests/e2e/visual-regression.spec.ts-snapshots/` directory.

### Running Visual Tests

```bash
# Run all visual regression tests
npx playwright test visual-regression.spec.ts

# Run on specific browser
npx playwright test visual-regression.spec.ts --project=chromium

# Run in UI mode to see visual diffs
npx playwright test visual-regression.spec.ts --ui
```

## Handling Test Failures

When a visual test fails, Playwright generates three images:

1. **baseline** - The original expected image
2. **actual** - The current screenshot
3. **diff** - Visual diff highlighting differences

### View Diffs in HTML Report

```bash
npx playwright show-report
```

The HTML report shows side-by-side comparisons and highlights differences.

### Updating Baselines

If the UI change is intentional:

```bash
# Update all baselines
npx playwright test visual-regression.spec.ts --update-snapshots

# Update specific test
npx playwright test visual-regression.spec.ts -g "should match initial app layout" --update-snapshots
```

## Best Practices

### 1. Disable Animations

Always disable animations for consistent screenshots:

```typescript
await expect(page).toHaveScreenshot('my-screenshot.png', {
  animations: 'disabled',
})
```

### 2. Wait for Stability

Ensure content is fully loaded before capturing:

```typescript
await page.waitForLoadState('networkidle')
await page.waitForTimeout(500) // Extra time for animations
```

### 3. Use Specific Selectors

Capture specific components instead of full page when possible:

```typescript
await expect(page.locator('[data-testid="settings-panel"]')).toHaveScreenshot('settings.png')
```

### 4. Test Multiple Viewports

Test responsive layouts at different sizes:

```typescript
await page.setViewportSize({ width: 375, height: 667 }) // Mobile
await page.setViewportSize({ width: 768, height: 1024 }) // Tablet
await page.setViewportSize({ width: 1920, height: 1080 }) // Desktop
```

### 5. Mask Dynamic Content

Mask timestamps, random IDs, or dynamic content:

```typescript
await expect(page).toHaveScreenshot('screenshot.png', {
  mask: [page.locator('[data-testid="timestamp"]')],
})
```

## Configuration Options

Common `toHaveScreenshot()` options:

```typescript
{
  // Maximum pixel difference threshold (0-1)
  maxDiffPixels: 100,

  // Maximum percentage difference (0-1)
  maxDiffPixelRatio: 0.05,

  // Disable animations
  animations: 'disabled',

  // Capture full page
  fullPage: true,

  // Mask dynamic areas
  mask: [selector1, selector2],

  // Custom screenshot path
  name: 'custom-name.png',

  // Clip to specific area
  clip: { x: 0, y: 0, width: 100, height: 100 }
}
```

## CI/CD Integration

Visual tests run automatically in CI. On failure:

1. Diff images are uploaded as artifacts
2. View artifacts in GitHub Actions run
3. Download and review diffs locally
4. Update baselines if change is intentional

### Updating Baselines in CI

To update baselines from CI results:

1. Download `playwright-results` artifact from failed run
2. Extract to local `test-results/` directory
3. Review diffs
4. Run update command if changes are valid
5. Commit updated baseline images

## Directory Structure

```
tests/e2e/
├── visual-regression.spec.ts           # Visual test suite
├── VISUAL_TESTING.md                   # This file
└── visual-regression.spec.ts-snapshots/
    ├── chromium/
    │   ├── app-initial-state.png
    │   ├── settings-panel.png
    │   └── ...
    ├── firefox/
    └── webkit/
```

## Troubleshooting

### Tests Fail on Different OS

Rendering can differ between operating systems. Solutions:

1. **Generate baselines in CI** - Use the same environment
2. **Use Docker** - Consistent rendering environment
3. **Increase threshold** - Allow small pixel differences

```typescript
await expect(page).toHaveScreenshot('screenshot.png', {
  maxDiffPixelRatio: 0.05, // Allow 5% difference
})
```

### Flaky Visual Tests

If tests fail intermittently:

1. Increase wait times for stability
2. Disable animations and transitions
3. Mock time-dependent content
4. Use `waitForLoadState('networkidle')`

### Font Rendering Differences

Fonts may render differently across platforms:

1. Use web fonts (not system fonts)
2. Ensure fonts are loaded before screenshots
3. Increase pixel difference threshold

```typescript
// Wait for fonts to load
await page.waitForLoadState('networkidle')
await page.evaluate(() => document.fonts.ready)
```

## Adding New Visual Tests

1. Create test in `visual-regression.spec.ts`
2. Generate baseline: `npx playwright test --update-snapshots -g "test name"`
3. Review generated screenshot
4. Commit baseline image with code
5. CI will validate on future runs

## Related Documentation

- [Playwright Screenshots Guide](https://playwright.dev/docs/screenshots)
- [Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [E2E Testing Guide](/docs/testing-guide.md)
