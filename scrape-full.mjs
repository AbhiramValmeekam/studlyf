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

// Scroll the full page slowly (multiple passes) to trigger lazy content + scroll-reveal animations
for (let pass = 0; pass < 2; pass++) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let y = 0
      const t = setInterval(() => {
        window.scrollBy(0, 300)
        y += 300
        if (y >= document.body.scrollHeight + 1200) {
          clearInterval(t)
          resolve()
        }
      }, 90)
    })
  })
  await page.waitForTimeout(1500)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(800)
}

const content = await page.evaluate(() => {
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim()

  // --- Taglines: walk every element, keep leaf text blocks, dedupe ---
  const seen = new Set()
  const taglines = []
  const pushTag = (s, meta) => {
    const c = clean(s)
    if (!c || c.length < 2 || c.length > 300) return
    const key = c.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    taglines.push({ text: c, ...meta })
  }

  const headings = []
  document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h) => {
    const c = clean(h.innerText)
    if (c) {
      headings.push(c)
      pushTag(c, { tag: h.tagName.toLowerCase(), size: parseFloat(getComputedStyle(h).fontSize) || 0 })
    }
  })

  // Leaf-ish text nodes with meaningful font size
  document.querySelectorAll('p,span,div,a,li,button,h1,h2,h3,h4,h5,h6,strong,em,figcaption,blockquote').forEach((el) => {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') return
    const size = parseFloat(cs.fontSize) || 0
    const hasElementChildren = [...el.children].some((c) => c.innerText && c.innerText.trim())
    if (!hasElementChildren) {
      pushTag(el.innerText, { tag: el.tagName.toLowerCase(), size })
    }
  })

  // Images (img currentSrc/src + srcset candidates)
  const imgUrls = new Set()
  document.querySelectorAll('img').forEach((i) => {
    if (i.currentSrc && !i.currentSrc.startsWith('data:')) imgUrls.add(new URL(i.currentSrc, location.href).href)
    if (i.src && !i.src.startsWith('data:')) imgUrls.add(new URL(i.src, location.href).href)
    if (i.srcset) {
      i.srcset.split(',').forEach((part) => {
        const u = part.trim().split(/\s+/)[0]
        if (u && !u.startsWith('data:')) imgUrls.add(new URL(u, location.href).href)
      })
    }
  })
  document.querySelectorAll('source[srcset]').forEach((s) => {
    s.srcset.split(',').forEach((part) => {
      const u = part.trim().split(/\s+/)[0]
      if (u && !u.startsWith('data:')) imgUrls.add(new URL(u, location.href).href)
    })
  })

  // Background images
  const bgImages = new Set()
  document.querySelectorAll('*').forEach((el) => {
    const bg = getComputedStyle(el).backgroundImage
    const m = bg && bg.match(/url\((['"]?)(.*?)\1\)/)
    if (m && m[2] && !m[2].startsWith('data:')) bgImages.add(new URL(m[2], location.href).href)
  })

  return {
    title: document.title,
    metaDescription: document.querySelector('meta[name="description"]')?.content || '',
    headings,
    taglines,
    imgTags: [...imgUrls],
    bgImages: [...bgImages],
  }
})

await browser.close()

const allImgs = [...new Set([...content.imgTags, ...content.bgImages, ...collectedImages])].filter(
  (u) => /\.(png|jpe?g|webp|svg|gif|avif)(\?|$)/i.test(u) || u.includes('image'),
)

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
    req.setTimeout(20000, () => {
      req.destroy()
      resolve(null)
    })
  })
}

function baseName(url) {
  try {
    const p = new URL(url).pathname
    return path.basename(p).split('?')[0] || ''
  } catch {
    return ''
  }
}

const saved = []
let idx = 0
for (const url of allImgs) {
  idx++
  const orig = baseName(url)
  let ext = (url.split('?')[0].match(/\.(png|jpe?g|webp|svg|gif|avif)$/i) || [, 'img'])[1].toLowerCase()
  if (ext === 'jpeg') ext = 'jpg'
  const safe = orig.replace(/[^a-z0-9._-]/gi, '_') || `img_${idx}.${ext}`
  const name = `s${String(idx).padStart(2, '0')}_${safe}`
  const dest = path.join(OUT_DIR, name)
  const ok = await download(url, dest)
  if (ok) {
    const size = fs.statSync(dest).size
    if (size > 200) saved.push({ name, url, size })
    else fs.unlinkSync(dest)
  }
}

const report = { ...content, savedImages: saved }
fs.writeFileSync('scrape-report-full.json', JSON.stringify(report, null, 2))

console.log('TITLE:', content.title)
console.log('META:', content.metaDescription)
console.log('\nHEADINGS (' + content.headings.length + '):')
content.headings.forEach((h) => console.log('  •', h))
console.log('\nTAGLINES (' + content.taglines.length + '):')
content.taglines.forEach((t) => console.log(`  • [${t.size}px ${t.tag}] ${t.text}`))
console.log('\nIMAGES FOUND:', allImgs.length, ' SAVED:', saved.length)
saved.forEach((s) => console.log('  -', s.name, Math.round(s.size / 1024) + 'kb', s.url))
