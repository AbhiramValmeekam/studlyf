import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5174/'
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 820 })
const errs = []
page.on('pageerror', (e) => errs.push(e.message))
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 })
await new Promise((r) => setTimeout(r, 4500)) // loader

// marquee movement
const x1 = await page.evaluate(() => {
  const t = document.querySelector('#top .inline-flex')
  return t ? getComputedStyle(t).transform : 'none'
})
await new Promise((r) => setTimeout(r, 1200))
const x2 = await page.evaluate(() => {
  const t = document.querySelector('#top .inline-flex')
  return t ? getComputedStyle(t).transform : 'none'
})

// nav link doubling: each charflip box height vs its text line
const nav = await page.evaluate(() => {
  const cf = [...document.querySelectorAll('.charflip')]
  return cf.slice(0, 4).map((el) => {
    const r = el.getBoundingClientRect()
    return { text: el.textContent.trim().slice(0, 10), h: Math.round(r.height) }
  })
})

// hero: are all 3 title lines within viewport (top not clipped under nav)?
const hero = await page.evaluate(() => {
  const lines = [...document.querySelectorAll('#top .hero-title .line-mask')]
  return lines.map((l) => {
    const r = l.getBoundingClientRect()
    return { top: Math.round(r.top), bottom: Math.round(r.bottom) }
  })
})

console.log('ERRORS:', errs.length ? errs : '(none)')
console.log('MARQUEE x1:', x1)
console.log('MARQUEE x2:', x2, '=> moving:', x1 !== x2)
console.log('NAV charflip boxes:', JSON.stringify(nav))
console.log('HERO title lines (top/bottom):', JSON.stringify(hero))
await page.screenshot({ path: 'diag.png' })
await browser.close()
