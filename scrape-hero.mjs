import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const SITE = 'https://studlyf.in/'
const OUT_DIR = path.resolve('public/scraped')
fs.mkdirSync(OUT_DIR, { recursive: true })

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(SITE, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
await page.waitForTimeout(1500)

// --- Capture the rotating hero tagline over time ---
// The hero shows "Learn" + a rotating word ("by doing", "by coding", ...).
// Poll the big hero text region and collect every distinct phrase we see.
const seen = new Set()
const order = []
const record = (s) => {
  const c = (s || '').replace(/\s+/g, ' ').trim()
  if (c && c.length < 60 && !seen.has(c.toLowerCase())) {
    seen.add(c.toLowerCase())
    order.push(c)
  }
}

// Read whichever element holds the largest text in the hero (top of page).
async function readHero() {
  return page.evaluate(() => {
    const clean = (s) => (s || '').replace(/\s+/g, ' ').trim()
    // Grab candidate big headings near the top of the document.
    const cands = [...document.querySelectorAll('h1,h2,h3,span,div')]
      .filter((el) => {
        const r = el.getBoundingClientRect()
        const size = parseFloat(getComputedStyle(el).fontSize) || 0
        return r.top < 700 && r.top > -200 && size >= 40 && clean(el.innerText).length > 0 && clean(el.innerText).length < 60
      })
      .map((el) => ({ t: clean(el.innerText), size: parseFloat(getComputedStyle(el).fontSize) || 0 }))
      .sort((a, b) => b.size - a.size)
    return cands.slice(0, 4).map((c) => c.t)
  })
}

// Poll for ~18s to catch all rotations. Tolerate transient navigations.
for (let i = 0; i < 90; i++) {
  try {
    const texts = await readHero()
    texts.forEach(record)
  } catch {
    await page.waitForTimeout(400) // context torn down; let it settle
  }
  await page.waitForTimeout(200)
}

// --- Capture the logo ---
const logo = await page.evaluate(() => {
  const clean = (u) => (u ? new URL(u, location.href).href : null)
  // Prefer an <img> inside the header/nav whose src/alt mentions studlyf/logo.
  const imgs = [...document.querySelectorAll('header img, nav img, a[href="/"] img, img')]
  const scored = imgs
    .map((i) => {
      const src = i.currentSrc || i.src || ''
      const alt = (i.getAttribute('alt') || '').toLowerCase()
      const r = i.getBoundingClientRect()
      let score = 0
      if (/logo|studlyf/i.test(src)) score += 5
      if (/logo|studlyf/.test(alt)) score += 3
      if (r.top < 200) score += 2 // near the top = header
      return { src: clean(src), alt, top: r.top, w: r.width, h: r.height, score }
    })
    .filter((x) => x.src && !x.src.startsWith('data:'))
    .sort((a, b) => b.score - a.score)
  return { best: scored[0] || null, all: scored.slice(0, 8) }
})

await browser.close()

// Download the logo if found.
function download(url, dest) {
  return new Promise((resolve) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return download(new URL(res.headers.location, url).href, dest).then(resolve)
        }
        if (res.statusCode !== 200) {
          res.resume()
          return resolve(null)
        }
        const file = fs.createWriteStream(dest)
        res.pipe(file)
        file.on('finish', () => file.close(() => resolve(dest)))
      })
      .on('error', () => resolve(null))
  })
}

let savedLogo = null
if (logo.best?.src) {
  const ext = (logo.best.src.split('?')[0].match(/\.(png|jpe?g|webp|svg)$/i) || [, 'png'])[1].toLowerCase()
  const dest = path.join(OUT_DIR, `logo.${ext}`)
  const ok = await download(logo.best.src, dest)
  if (ok) savedLogo = { file: `logo.${ext}`, ...logo.best }
}

fs.writeFileSync(
  'hero-report.json',
  JSON.stringify({ rotatingTaglines: order, logo: savedLogo, logoCandidates: logo.all }, null, 2)
)

console.log('ROTATING TAGLINES (' + order.length + '):')
order.forEach((t) => console.log('  •', t))
console.log('\nLOGO:', JSON.stringify(savedLogo))
console.log('\nLOGO CANDIDATES:')
logo.all.forEach((c) => console.log('  -', c.score, c.src))
