import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import http from 'node:http'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const SITE = 'https://studlyf.in/'
const OUT_DIR = path.resolve('public/scraped')
fs.mkdirSync(OUT_DIR, { recursive: true })

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const collectedImages = new Set()
page.on('response', (res) => {
  const ct = res.headers()['content-type'] || ''
  if (ct.startsWith('image/')) collectedImages.add(res.url())
})

await page.goto(SITE, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
// scroll through the whole page to trigger lazy content/images
await page.evaluate(async () => {
  await new Promise((resolve) => {
    let y = 0
    const t = setInterval(() => {
      window.scrollBy(0, 400)
      y += 400
      if (y >= document.body.scrollHeight + 1000) {
        clearInterval(t)
        resolve()
      }
    }, 120)
  })
})
await page.waitForTimeout(2500)

// --- Extract taglines / headings / large text ---
const content = await page.evaluate(() => {
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim()
  const seen = new Set()
  const push = (arr, s) => {
    const c = clean(s)
    if (c && c.length > 1 && c.length < 240 && !seen.has(c.toLowerCase())) {
      seen.add(c.toLowerCase())
      arr.push(c)
    }
  }

  const headings = []
  document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h) => push(headings, h.innerText))

  // big text = probable taglines
  const bigText = []
  document.querySelectorAll('p,span,div,a,li,button').forEach((el) => {
    const cs = getComputedStyle(el)
    const size = parseFloat(cs.fontSize) || 0
    // only leaf-ish nodes to avoid grabbing whole sections
    const hasElementChildren = [...el.children].some((c) => c.innerText && c.innerText.trim())
    if (size >= 22 && !hasElementChildren) push(bigText, el.innerText)
  })

  // background images
  const bgImages = []
  document.querySelectorAll('*').forEach((el) => {
    const bg = getComputedStyle(el).backgroundImage
    const m = bg && bg.match(/url\((['"]?)(.*?)\1\)/)
    if (m && m[2] && !m[2].startsWith('data:')) bgImages.push(new URL(m[2], location.href).href)
  })

  const imgTags = [...document.querySelectorAll('img')]
    .map((i) => i.currentSrc || i.src)
    .filter((s) => s && !s.startsWith('data:'))
    .map((s) => new URL(s, location.href).href)

  return {
    title: document.title,
    headings,
    bigText,
    imgTags: [...new Set(imgTags)],
    bgImages: [...new Set(bgImages)],
  }
})

await browser.close()

// merge all image urls
const allImgs = [...new Set([...content.imgTags, ...content.bgImages, ...collectedImages])].filter(
  (u) => /\.(png|jpe?g|webp|svg|gif|avif)(\?|$)/i.test(u) || u.includes('image'),
)

// --- Download images ---
function download(url, dest) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http
    const req = lib.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
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
    req.on('error', () => resolve(null))
    req.setTimeout(15000, () => {
      req.destroy()
      resolve(null)
    })
  })
}

const saved = []
let idx = 0
for (const url of allImgs) {
  idx++
  let ext = (url.split('?')[0].match(/\.(png|jpe?g|webp|svg|gif|avif)$/i) || [, 'img'])[1].toLowerCase()
  if (ext === 'jpeg') ext = 'jpg'
  const name = `img_${String(idx).padStart(2, '0')}.${ext}`
  const dest = path.join(OUT_DIR, name)
  const ok = await download(url, dest)
  if (ok) {
    const size = fs.statSync(dest).size
    if (size > 200) saved.push({ name, url, size })
    else fs.unlinkSync(dest)
  }
}

const report = { ...content, savedImages: saved }
fs.writeFileSync('scrape-report.json', JSON.stringify(report, null, 2))

console.log('TITLE:', content.title)
console.log('\nHEADINGS (' + content.headings.length + '):')
content.headings.forEach((h) => console.log('  •', h))
console.log('\nBIG TEXT / TAGLINES (' + content.bigText.length + '):')
content.bigText.forEach((h) => console.log('  •', h))
console.log('\nIMAGES FOUND:', allImgs.length, ' SAVED:', saved.length)
saved.forEach((s) => console.log('  -', s.name, Math.round(s.size / 1024) + 'kb', s.url.slice(0, 90)))
