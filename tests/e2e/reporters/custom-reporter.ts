/**
 * Custom Playwright Reporter
 *
 * Provides enhanced test reporting with:
 * - Flaky test detection
 * - Performance tracking
 * - Detailed failure analysis
 * - Slack/webhook notifications
 */

import {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter'
import * as fs from 'fs'
import * as path from 'path'

interface TestMetrics {
  name: string
  file: string
  duration: number
  status: string
  retries: number
  flaky: boolean
  error?: string
}

interface ReporterSummary {
  total: number
  passed: number
  failed: number
  skipped: number
  flaky: number
  duration: number
  slowTests: TestMetrics[]
  flakyTests: TestMetrics[]
  failedTests: TestMetrics[]
}

class CustomReporter implements Reporter {
  private testMetrics: TestMetrics[] = []
  private startTime: number = 0
  private config: FullConfig | undefined

  onBegin(config: FullConfig, suite: Suite) {
    this.config = config
    this.startTime = Date.now()
    console.log(`\n🚀 Starting E2E test run with ${suite.allTests().length} tests\n`)
  }

  onTestBegin(test: TestCase) {
    console.log(`\n▶️  Running: ${test.title}`)
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const isFlaky = result.retry > 0 && result.status === 'passed'

    const metrics: TestMetrics = {
      name: test.title,
      file: test.location.file,
      duration: result.duration,
      status: result.status,
      retries: result.retry,
      flaky: isFlaky,
      error: result.error?.message,
    }

    this.testMetrics.push(metrics)

    // Log result with emoji
    const statusEmoji = this.getStatusEmoji(result.status, isFlaky)
    const durationFormatted = (result.duration / 1000).toFixed(2)

    console.log(`${statusEmoji}  ${test.title} (${durationFormatted}s)`)

    if (isFlaky) {
      console.log(`   ⚠️  FLAKY: Passed after ${result.retry} retries`)
    }

    if (result.status === 'failed') {
      console.log(`   ❌ Error: ${result.error?.message?.substring(0, 100)}...`)
    }
  }

  async onEnd(result: FullResult) {
    const duration = Date.now() - this.startTime
    const summary = this.generateSummary(duration)

    console.log('\n' + '='.repeat(80))
    console.log('📊 TEST RUN SUMMARY')
    console.log('='.repeat(80))

    console.log(`\nTotal Tests:    ${summary.total}`)
    console.log(`✅ Passed:       ${summary.passed}`)
    console.log(`❌ Failed:       ${summary.failed}`)
    console.log(`⏭️  Skipped:      ${summary.skipped}`)
    console.log(`⚠️  Flaky:        ${summary.flaky}`)
    console.log(`⏱️  Duration:     ${(duration / 1000).toFixed(2)}s`)

    if (summary.flakyTests.length > 0) {
      console.log('\n' + '-'.repeat(80))
      console.log('⚠️  FLAKY TESTS DETECTED')
      console.log('-'.repeat(80))

      summary.flakyTests.forEach((test) => {
        console.log(`\n📝 ${test.name}`)
        console.log(`   File: ${path.relative(process.cwd(), test.file)}`)
        console.log(`   Retries: ${test.retries}`)
        console.log(`   Duration: ${(test.duration / 1000).toFixed(2)}s`)
      })

      console.log('\n💡 Tip: Flaky tests indicate timing issues or race conditions.')
      console.log('   Consider adding explicit waits or improving test stability.\n')
    }

    if (summary.slowTests.length > 0) {
      console.log('\n' + '-'.repeat(80))
      console.log('🐌 SLOW TESTS (>5s)')
      console.log('-'.repeat(80))

      summary.slowTests.forEach((test) => {
        console.log(`\n📝 ${test.name}`)
        console.log(`   File: ${path.relative(process.cwd(), test.file)}`)
        console.log(`   Duration: ${(test.duration / 1000).toFixed(2)}s`)
      })

      console.log('\n💡 Tip: Consider optimizing slow tests or splitting them.\n')
    }

    if (summary.failedTests.length > 0) {
      console.log('\n' + '-'.repeat(80))
      console.log('❌ FAILED TESTS')
      console.log('-'.repeat(80))

      summary.failedTests.forEach((test) => {
        console.log(`\n📝 ${test.name}`)
        console.log(`   File: ${path.relative(process.cwd(), test.file)}`)
        console.log(`   Error: ${test.error || 'Unknown error'}`)
      })
    }

    // Save metrics to file
    await this.saveMetrics(summary)

    // Send notification if configured
    await this.sendNotification(summary, result.status)

    console.log('\n' + '='.repeat(80) + '\n')
  }

  private generateSummary(duration: number): ReporterSummary {
    const summary: ReporterSummary = {
      total: this.testMetrics.length,
      passed: 0,
      failed: 0,
      skipped: 0,
      flaky: 0,
      duration,
      slowTests: [],
      flakyTests: [],
      failedTests: [],
    }

    this.testMetrics.forEach((metrics) => {
      if (metrics.status === 'passed') summary.passed++
      if (metrics.status === 'failed') summary.failed++
      if (metrics.status === 'skipped') summary.skipped++
      if (metrics.flaky) summary.flaky++

      if (metrics.flaky) {
        summary.flakyTests.push(metrics)
      }

      if (metrics.duration > 5000) {
        summary.slowTests.push(metrics)
      }

      if (metrics.status === 'failed') {
        summary.failedTests.push(metrics)
      }
    })

    // Sort slow tests by duration
    summary.slowTests.sort((a, b) => b.duration - a.duration)

    return summary
  }

  private getStatusEmoji(status: string, isFlaky: boolean): string {
    if (isFlaky) return '⚠️ '
    switch (status) {
      case 'passed':
        return '✅'
      case 'failed':
        return '❌'
      case 'skipped':
        return '⏭️ '
      case 'timedOut':
        return '⏱️ '
      default:
        return '❓'
    }
  }

  private async saveMetrics(summary: ReporterSummary) {
    const metricsDir = path.join(process.cwd(), 'test-results', 'metrics')

    try {
      // Create metrics directory
      if (!fs.existsSync(metricsDir)) {
        fs.mkdirSync(metricsDir, { recursive: true })
      }

      // Save summary
      const summaryPath = path.join(metricsDir, 'summary.json')
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2))

      // Save full metrics
      const metricsPath = path.join(metricsDir, 'test-metrics.json')
      fs.writeFileSync(metricsPath, JSON.stringify(this.testMetrics, null, 2))

      // Save flaky tests history
      if (summary.flakyTests.length > 0) {
        const flakyPath = path.join(metricsDir, 'flaky-tests.json')
        let flakyHistory: any = { tests: [] }

        if (fs.existsSync(flakyPath)) {
          const existingData = fs.readFileSync(flakyPath, 'utf-8')
          flakyHistory = JSON.parse(existingData)
        }

        flakyHistory.tests.push({
          timestamp: new Date().toISOString(),
          count: summary.flakyTests.length,
          tests: summary.flakyTests,
        })

        fs.writeFileSync(flakyPath, JSON.stringify(flakyHistory, null, 2))
      }

      console.log(`\n📁 Metrics saved to: ${metricsDir}`)
    } catch (error) {
      console.error(`\n⚠️  Failed to save metrics: ${error}`)
    }
  }

  private async sendNotification(summary: ReporterSummary, status: string) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL

    if (!webhookUrl) {
      return // No webhook configured
    }

    const statusEmoji = status === 'passed' ? '✅' : '❌'
    const message = this.formatWebhookMessage(summary, statusEmoji)

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      })

      if (response.ok) {
        console.log('\n✉️  Notification sent successfully')
      }
    } catch (error) {
      console.error(`\n⚠️  Failed to send notification: ${error}`)
    }
  }

  private formatWebhookMessage(summary: ReporterSummary, emoji: string) {
    // Slack format (also compatible with Discord)
    return {
      text: `${emoji} E2E Test Run Complete`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${emoji} E2E Test Run Complete*`,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Total:*\n${summary.total}` },
            { type: 'mrkdwn', text: `*Passed:*\n${summary.passed}` },
            { type: 'mrkdwn', text: `*Failed:*\n${summary.failed}` },
            { type: 'mrkdwn', text: `*Flaky:*\n${summary.flaky}` },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Duration:* ${(summary.duration / 1000).toFixed(2)}s`,
          },
        },
      ],
    }
  }
}

export default CustomReporter
