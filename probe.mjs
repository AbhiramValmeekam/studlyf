import { chromium } from 'playwright-core'
import fs from 'node:fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 3000 } })
const imgResponses = new Set()
page.on('response', (r) => {
  if ((r.headers()['content-type'] || '').startsWith('image/')) imgResponses.add(r.url())
})
await page.goto('https://studlyf.in/', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
await page.evaluate(async () => {
  await new Promise((res) => {
    let y = 0
    const t = setInterval(() => {
      window.scrollBy(0, 500); y += 500
      if (y >= document.body.scrollHeight + 2000) { clearInterval(t); res() }
    }, 100)
  })
})
await page.waitForTimeout(3000)
const data = await page.evaluate(() => {
  const bodyText = document.body.innerText
  const links = [...document.querySelectorAll('a[href]')].map(a => a.href)
  const imgs = [...document.querySelectorAll('img')].map(i => ({ src: i.currentSrc || i.src, srcset: i.srcset, alt: i.alt }))
  const svgText = [...document.querySelectorAll('svg text, svg tspan')].map(t => t.textContent)
  return { bodyText, links: [...new Set(links)], imgs, svgText, htmlLen: document.documentElement.outerHTML.length }
})
await page.screenshot({ path: 'probe.png', fullPage: true })
await browser.close()
fs.writeFileSync('probe.json', JSON.stringify({ ...data, imgResponses: [...imgResponses] }, null, 2))
console.log('=== BODY TEXT ===\n' + data.bodyText)
console.log('\n=== LINKS ===\n' + data.links.join('\n'))
console.log('\n=== SVG TEXT ===\n' + data.svgText.join(' | '))
console.log('\n=== IMG RESPONSES ===\n' + [...imgResponses].join('\n'))
console.log('\nHTML length:', data.htmlLen)
