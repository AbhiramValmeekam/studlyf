import { chromium } from 'playwright-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const failed = []
page.on('response', (r) => {
  if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`)
})
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(2500)
// scroll through to trigger lazy images
await page.evaluate(async () => {
  await new Promise((res) => {
    let y = 0
    const t = setInterval(() => {
      window.scrollBy(0, 500); y += 500
      if (y >= document.body.scrollHeight + 1500) { clearInterval(t); res() }
    }, 80)
  })
})
await page.waitForTimeout(2000)

const imgStats = await page.evaluate(() =>
  [...document.querySelectorAll('img')].map((i) => ({
    src: i.getAttribute('src'),
    ok: i.complete && i.naturalWidth > 0,
  }))
)
const broken = imgStats.filter((i) => !i.ok)

await page.screenshot({ path: 'verify-full.png', fullPage: true })
await browser.close()

console.log('PAGE ERRORS:', errors.length)
errors.forEach((e) => console.log('  !', e))
console.log('FAILED REQUESTS:', failed.length)
failed.forEach((f) => console.log('  x', f))
console.log('IMAGES:', imgStats.length, ' BROKEN:', broken.length)
broken.forEach((b) => console.log('  broken:', b.src))
