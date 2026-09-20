import { chromium } from 'playwright-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:4174/', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(2000)
const cards = page.locator('#projects article')
const n = await cards.count()
console.log('cards:', n)
await cards.nth(2).scrollIntoViewIfNeeded().catch(() => {})
await page.waitForTimeout(800)
await cards.nth(2).screenshot({ path: 'card2.png' }).catch((e) => console.log('shot err', e.message))
await browser.close()
console.log('done')
