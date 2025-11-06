# VueSip Testing Guide

This document provides comprehensive guidance on testing the VueSip library.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Utilities](#test-utilities)
- [Coverage Reports](#coverage-reports)
- [Best Practices](#best-practices)

## Overview

VueSip uses a comprehensive testing strategy with three levels of tests:

1. **Unit Tests**: Test individual components and functions in isolation
2. **Integration Tests**: Test how multiple components work together
3. **E2E Tests**: Test complete user workflows in a browser environment

### Testing Stack

- **Test Framework**: [Vitest](https://vitest.dev/) - Fast, Vite-powered unit test framework
- **E2E Testing**: [Playwright](https://playwright.dev/) - Cross-browser end-to-end testing
- **Coverage**: Vitest with V8 coverage provider
- **Mocking**: Vitest's built-in mocking capabilities

## Test Structure

```
tests/
├── unit/                      # Unit tests
│   ├── core/                  # Core functionality tests
│   ├── composables/           # Vue composables tests
│   ├── stores/                # Pinia stores tests
│   ├── plugins/               # Plugin tests
│   ├── providers/             # Provider tests
│   └── utils/                 # Utility function tests
├── integration/               # Integration tests
│   └── sip-workflow.test.ts   # Complete SIP workflow tests
├── e2e/                       # End-to-end tests
│   └── basic-call-flow.spec.ts # User interaction tests
├── utils/                     # Test utilities
│   └── test-helpers.ts        # Shared test helpers
└── setup.ts                   # Global test setup
```

## Running Tests

### Unit and Integration Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run tests with coverage
pnpm coverage

# Run specific test file
pnpm test tests/unit/core/SipClient.test.ts

# Run tests matching a pattern
pnpm test --grep "SipClient"
```

### E2E Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run E2E tests in headed mode (see browser)
pnpm test:e2e --headed

# Run E2E tests in a specific browser
pnpm test:e2e --project=chromium
pnpm test:e2e --project=firefox
pnpm test:e2e --project=webkit

# Run E2E tests in debug mode
pnpm test:e2e --debug
```

## Writing Tests

### Unit Tests

Unit tests should test individual components in isolation. Here's a template:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MyComponent } from '../src/MyComponent'

describe('MyComponent', () => {
  let component: MyComponent

  beforeEach(() => {
    // Setup before each test
    component = new MyComponent()
  })

  afterEach(() => {
    // Cleanup after each test
    component.destroy()
  })

  describe('method name', () => {
    it('should do something', () => {
      const result = component.doSomething()
      expect(result).toBe(expectedValue)
    })

    it('should handle errors', () => {
      expect(() => component.doSomething()).toThrow('Error message')
    })
  })
})
```

### Testing SIP Components

When testing SIP components, use the provided test helpers:

```typescript
import { createMockSipConfig, createMockUA, simulateSipConnection } from '../utils/test-helpers'

describe('SIP Component', () => {
  it('should connect to SIP server', async () => {
    const config = createMockSipConfig()
    const mockUA = createMockUA()

    simulateSipConnection(mockUA)

    const client = new SipClient(config, eventBus)
    await client.start()

    expect(client.isConnected).toBe(true)
  })
})
```

### Testing Media Components

Use the media device mock helpers:

```typescript
import { setupMediaDevicesMock, createMockMediaStream } from '../utils/test-helpers'

describe('Media Component', () => {
  it('should acquire media', async () => {
    const { mockStream } = setupMediaDevicesMock()

    const mediaManager = new MediaManager(eventBus)
    const stream = await mediaManager.getUserMedia({ audio: true })

    expect(stream).toBeDefined()
  })
})
```

### Testing Plugins

Plugin tests should verify installation, configuration, and lifecycle:

```typescript
import { createMockPluginContext } from '../utils/test-helpers'

describe('MyPlugin', () => {
  it('should install correctly', async () => {
    const context = createMockPluginContext(eventBus)
    const plugin = new MyPlugin()

    await plugin.install(context, { enabled: true })

    expect(plugin).toBeDefined()
  })

  it('should handle events', async () => {
    const context = createMockPluginContext(eventBus)
    const plugin = new MyPlugin()

    await plugin.install(context)

    eventBus.emit('someEvent', { data: 'test' })

    // Verify plugin responded to event
    await wait(50)
    expect(/* ... */)
  })
})
```

### Integration Tests

Integration tests verify that multiple components work together:

```typescript
describe('SIP Workflow Integration', () => {
  it('should complete full call lifecycle', async () => {
    // Setup all components
    const sipClient = new SipClient(config, eventBus)
    const mediaManager = new MediaManager(eventBus)
    const callSession = new CallSession(mockSession, 'local', eventBus)

    // Perform workflow
    await sipClient.start()
    await sipClient.register()
    const stream = await mediaManager.getUserMedia({ audio: true })

    // Verify workflow completed successfully
    expect(sipClient.isConnected).toBe(true)
    expect(sipClient.isRegistered).toBe(true)
    expect(stream).toBeDefined()
  })
})
```

### E2E Tests

E2E tests verify complete user workflows:

```typescript
import { test, expect } from '@playwright/test'

test('should make a call', async ({ page }) => {
  await page.goto('/')

  // Enter phone number
  await page.fill('[data-testid="dialpad-input"]', 'sip:destination@example.com')

  // Click call button
  await page.click('[data-testid="call-button"]')

  // Verify call is in progress
  await expect(page.locator('[data-testid="active-call"]')).toBeVisible()
})
```

## Test Utilities

VueSip provides comprehensive test utilities in `tests/utils/test-helpers.ts`:

### Configuration Helpers

- `createMockSipConfig()` - Create a mock SIP configuration
- `createMockPluginContext()` - Create a mock plugin context

### Media Helpers

- `createMockMediaStream()` - Create a mock MediaStream
- `createMockRTCPeerConnection()` - Create a mock RTCPeerConnection
- `setupMediaDevicesMock()` - Setup navigator.mediaDevices mock

### SIP Helpers

- `createMockUA()` - Create a mock JsSIP User Agent
- `createMockRTCSession()` - Create a mock JsSIP RTC Session
- `simulateSipConnection()` - Simulate successful SIP connection
- `simulateSipRegistration()` - Simulate successful SIP registration
- `simulateSipConnectionFailure()` - Simulate connection failure
- `simulateIncomingCall()` - Simulate an incoming call
- `simulateCallProgress()` - Simulate call progress states

### Event Helpers

- `waitForEvent()` - Wait for an event to be emitted
- `assertEventEmitted()` - Assert that an event was emitted
- `createMockEvent()` - Create a mock event

### Other Helpers

- `wait()` - Wait for a specified time
- `spyOnConsole()` - Spy on console methods
- `setupIndexedDBMock()` - Setup IndexedDB mock

## Coverage Reports

### Running Coverage

```bash
# Generate coverage report
pnpm coverage
```

This will generate three types of reports:
- **Text**: Console output with coverage summary
- **HTML**: Interactive HTML report in `coverage/index.html`
- **JSON**: Machine-readable coverage data in `coverage/coverage-final.json`

### Coverage Thresholds

VueSip enforces minimum coverage thresholds:

- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

### Viewing Coverage

After running `pnpm coverage`, open the HTML report:

```bash
# On macOS
open coverage/index.html

# On Linux
xdg-open coverage/index.html

# On Windows
start coverage/index.html
```

## Best Practices

### 1. Test Organization

- Group related tests using `describe` blocks
- Use clear, descriptive test names
- Follow the Arrange-Act-Assert pattern
- Keep tests focused and isolated

### 2. Mocking

- Mock external dependencies (JsSIP, WebRTC, etc.)
- Use test helpers for consistent mocking
- Don't mock the code you're testing
- Reset mocks between tests

### 3. Async Testing

```typescript
// Good - properly handle async operations
it('should load data', async () => {
  const data = await loadData()
  expect(data).toBeDefined()
})

// Bad - doesn't wait for async operation
it('should load data', () => {
  loadData()
  expect(data).toBeDefined() // May fail
})
```

### 4. Error Testing

```typescript
// Test both success and failure cases
it('should handle success', async () => {
  const result = await operation()
  expect(result).toBeDefined()
})

it('should handle failure', async () => {
  await expect(operation()).rejects.toThrow('Error message')
})
```

### 5. Event Testing

```typescript
// Use event helpers for testing events
it('should emit event', async () => {
  const eventPromise = waitForEvent(eventBus, 'myEvent')

  component.doSomething()

  const eventData = await eventPromise
  expect(eventData).toEqual({ foo: 'bar' })
})
```

### 6. Cleanup

Always clean up resources in `afterEach`:

```typescript
afterEach(() => {
  component.destroy()
  eventBus.destroy()
  vi.clearAllMocks()
})
```

### 7. Test Data

Use factories and helpers for test data:

```typescript
// Good - use helper
const config = createMockSipConfig({ uri: 'wss://test.com' })

// Bad - duplicate data in every test
const config = {
  uri: 'wss://test.com',
  sipUri: 'sip:user@test.com',
  password: 'pass',
  // ... many more fields
}
```

### 8. Assertions

- Use specific assertions
- Test observable behavior, not implementation
- One logical assertion per test

```typescript
// Good
expect(result.status).toBe('success')
expect(result.data).toHaveLength(5)

// Less good - too generic
expect(result).toBeTruthy()
```

## Continuous Integration

Tests run automatically in CI on:
- Every push to main branch
- Every pull request
- Nightly builds

CI configuration can be found in `.github/workflows/test.yml`.

## Debugging Tests

### Vitest Debugging

```bash
# Run tests with inspector
pnpm test --inspect-brk

# Run specific test in watch mode
pnpm test --watch tests/unit/core/SipClient.test.ts
```

### Playwright Debugging

```bash
# Run with UI mode
pnpm test:e2e --ui

# Run with inspector
pnpm test:e2e --debug

# Generate trace
pnpm test:e2e --trace on
```

## Common Issues

### Issue: Tests timeout

**Solution**: Increase timeout or check for unresolved promises

```typescript
// Increase timeout for specific test
it('should complete', async () => {
  // test code
}, 10000) // 10 second timeout
```

### Issue: Flaky tests

**Solution**:
- Add proper waits for async operations
- Use `waitForEvent` instead of fixed timeouts
- Ensure proper cleanup between tests

### Issue: Mock not working

**Solution**:
- Clear mocks between tests: `vi.clearAllMocks()`
- Reset mock implementation: `mockFn.mockReset()`
- Check mock is properly imported

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Support

For testing-related questions or issues:
1. Check this documentation
2. Review existing tests for examples
3. Open an issue on GitHub
4. Ask in project discussions
