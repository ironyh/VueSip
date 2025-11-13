import { chromium } from '@playwright/test'

async function debugApp() {
  console.log('🚀 Starting debug session...')

  // Launch browser with detailed logging
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-extensions',
      '--disable-web-security',
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream'
    ]
  })

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    permissions: ['microphone', 'camera']
  })

  const page = await context.newPage()

  // Collect all console messages
  const consoleMessages = []
  page.on('console', msg => {
    const type = msg.type()
    const text = msg.text()
    consoleMessages.push({ type, text })
    console.log(`[${type.toUpperCase()}] ${text}`)
  })

  // Collect all page errors
  const pageErrors = []
  page.on('pageerror', error => {
    pageErrors.push(error.message)
    console.error('❌ Page Error:', error.message)
    console.error('Stack:', error.stack)
  })

  // Track failed requests
  page.on('requestfailed', request => {
    console.error('❌ Request Failed:', request.url(), request.failure()?.errorText)
  })

  try {
    console.log('📍 Navigating to http://localhost:5173/?test=true')
    await page.goto('http://localhost:5173/?test=true', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    })

    console.log('✅ Page loaded')

    // Try to get HTML immediately
    console.log('🔍 Getting page content...')
    const html = await page.content()
    console.log('✅ Got page content')
    console.log('\n📄 Page HTML (first 2000 chars):', html.substring(0, 2000))

    // Wait a bit for any dynamic content
    console.log('⏳ Waiting for Vue app to mount...')
    await page.waitForTimeout(2000)
    console.log('✅ Wait complete')

    // Check if the HTML contains our test ID
    const hasAppRoot = html.includes('data-testid="sip-client"')
    console.log(`📊 App root in HTML: ${hasAppRoot ? 'YES' : 'NO'}`)

    // Check for initialization error in HTML
    const hasInitError = html.includes('data-testid="initialization-error"')
    if (hasInitError) {
      console.log('⚠️ Initialization error element found in HTML')
    }

    // Check body content
    const bodyText = await page.locator('body').textContent()
    console.log('\n📝 Body text content (first 500 chars):', bodyText?.substring(0, 500))

    console.log('\n📋 Summary:')
    console.log(`- Console messages: ${consoleMessages.length}`)
    console.log(`- Page errors: ${pageErrors.length}`)
    console.log(`- App root found: ${hasAppRoot ? 'YES' : 'NO'}`)

    if (pageErrors.length > 0) {
      console.log('\n❌ Errors found:')
      pageErrors.forEach(err => console.log(`  - ${err}`))
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  } finally {
    await browser.close()
    console.log('🏁 Debug session complete')
  }
}

debugApp()
