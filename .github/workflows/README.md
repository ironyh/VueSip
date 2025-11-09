# GitHub Actions Workflows

This directory contains the CI/CD workflows for VueSip.

## Workflows

### 🔄 `ci.yml` - Continuous Integration

**Runs on:** Every push and pull request to `main` and `develop` branches

**Jobs:**

1. **Tests** - Runs unit and integration tests on Node 18.x and 20.x
2. **Performance** - Runs performance tests with GC enabled (Node 20.x only)
3. **Build** - Builds the project and checks bundle sizes

**Purpose:** Ensures code quality and catches regressions before merge.

**Duration:** ~5-10 minutes

---

### 📊 `performance.yml` - Performance Tracking

**Runs on:**

- Nightly at 2 AM UTC (scheduled)
- Pushes to `main` branch (when src/ or performance tests change)
- Manual trigger via workflow dispatch

**Jobs:**

1. **Performance Benchmarks** - Runs Vitest benchmarks for core operations
2. **Load Tests** - Tests concurrent calls, memory leaks, rapid operations
3. **Performance Metrics** - Tracks latency, bundle size, etc.
4. **Regression Check** - Compares results with previous runs (main branch only)

**Purpose:** Track performance over time and detect regressions.

**Duration:** ~10-15 minutes

**Artifacts:** Results stored for 90 days for trend analysis

---

## When Each Workflow Runs

| Event              | CI Workflow   | Performance Workflow |
| ------------------ | ------------- | -------------------- |
| Pull Request       | ✅ Full suite | ❌ No                |
| Push to `main`     | ✅ Full suite | ✅ Full tracking     |
| Push to `develop`  | ✅ Full suite | ❌ No                |
| Nightly (2 AM UTC) | ❌ No         | ✅ Full tracking     |
| Manual Trigger     | ❌ No         | ✅ Configurable      |

## Performance Test Commands

The workflows use these npm scripts:

```bash
# All performance tests
pnpm test:performance

# Specific categories
pnpm test:performance:bench      # Benchmarks only
pnpm test:performance:load       # Load tests only
pnpm test:performance:metrics    # Metrics only

# With garbage collection (recommended)
NODE_OPTIONS="--expose-gc" pnpm test:performance
```

## Manual Workflow Triggers

### Run Performance Tests Manually

1. Go to: **Actions** → **Performance Tracking** → **Run workflow**
2. Select branch
3. Choose test type:
   - `all` - Run all performance tests
   - `benchmarks` - Run benchmarks only
   - `load` - Run load tests only
   - `metrics` - Run metrics tests only
4. Click **Run workflow**

## Viewing Results

### CI Workflow Results

- **Summary:** Check the PR comment with performance summary
- **Details:** Click workflow run → "Performance Tests" job
- **Artifacts:** Download from workflow run page

### Performance Tracking Results

- **Artifacts:** Stored for 90 days
- **Location:** Actions → Performance Tracking → Select run → Artifacts
- **Files:**
  - `benchmark-results-{sha}` - Benchmark timings
  - `load-test-results-{sha}` - Load test results and memory analysis
  - `metrics-results-{sha}` - Bundle sizes and latency metrics

## Performance Budgets

Tests validate against budgets defined in `src/utils/constants.ts`:

```typescript
PERFORMANCE: {
  TARGET_CALL_SETUP_TIME: 2000,        // 2 seconds
  MAX_STATE_UPDATE_LATENCY: 50,        // 50ms
  MAX_EVENT_PROPAGATION_TIME: 10,      // 10ms
  MAX_MEMORY_PER_CALL: 52428800,       // 50MB
  MAX_BUNDLE_SIZE: 153600,             // 150KB
  MAX_BUNDLE_SIZE_GZIPPED: 51200,      // 50KB
  DEFAULT_MAX_CONCURRENT_CALLS: 5,
}
```

## Troubleshooting

### Tests Failing in CI but Pass Locally

**Common causes:**

1. **Memory constraints** - CI has less memory
   - Solution: Tests already use `--max-old-space-size=4096`

2. **Timing issues** - CI is slower
   - Solution: Tests use `TIMEOUT_MULTIPLIER` based on `CI` env var

3. **GC not enabled**
   - Solution: Workflows use `NODE_OPTIONS="--expose-gc"`

### Performance Tests Taking Too Long

The full performance suite can take 10-15 minutes. This is normal because:

- Memory leak tests run 100+ iterations
- Load tests simulate multiple concurrent calls
- GC pauses add overhead

To speed up:

- Run specific categories (`bench`, `load`, or `metrics`)
- Reduce iteration counts in performance tests (not recommended for CI)

### Bundle Size Tests Failing

If bundle size tests fail:

1. Check the actual bundle sizes in the build job
2. Compare with `MAX_BUNDLE_SIZE` in constants.ts
3. Either optimize the bundle or update the budget (with justification)

## Adding New Performance Tests

When you add new performance tests:

1. Place them in the appropriate directory:
   - `tests/performance/benchmarks/` - Microbenchmarks
   - `tests/performance/load-tests/` - Stress/load tests
   - `tests/performance/metrics/` - Metrics tracking

2. Follow naming conventions:
   - Benchmarks: `*.bench.ts`
   - Load tests: `*.test.ts`
   - Metrics: `*.test.ts` or `*.metrics.ts`

3. Tests run automatically - no workflow changes needed!

4. Validate against PERFORMANCE constants:
   ```typescript
   import { PERFORMANCE } from '@/utils/constants'
   expect(duration).toBeLessThan(PERFORMANCE.TARGET_CALL_SETUP_TIME)
   ```

## Cost Optimization

**CI Workflow:**

- Runs on free GitHub Actions minutes
- ~5-10 minutes per run
- Estimated: 150-300 minutes/day (depending on activity)

**Performance Workflow:**

- Runs nightly + on main pushes
- ~10-15 minutes per run
- Estimated: 300-450 minutes/month

**Total monthly estimate:** ~5,000-6,000 minutes

- Well within GitHub's 2,000 free minutes for public repos
- For private repos, consider limiting nightly runs or using self-hosted runners

## Further Reading

- [Performance Test Documentation](../../tests/performance/README.md)
- [Performance Test Quick Start](../../tests/performance/QUICKSTART.md)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
