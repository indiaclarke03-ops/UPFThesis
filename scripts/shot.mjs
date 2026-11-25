// Screenshot helper for development: node scripts/shot.mjs <hashPath> <out.png> [width] [scrollToSelector] [scrollExtraPx] [fullPage]
// e.g. node scripts/shot.mjs "/" /tmp/hero.png 1440 "#act-2-scale" 1600
import { chromium } from '@playwright/test'
const [, , path = '/', out = 'shot.png', w = '1440', sel = '', extra = '0', full = ''] = process.argv
const base = process.env.BASE ?? 'http://localhost:5173/'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(w) < 700 ? 812 : 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
const url = path.startsWith('?') ? base + path : base + '#' + path
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
if (sel) {
  // acts mount lazily: scroll down until the target exists
  for (let i = 0; i < 80 && !(await page.$(sel)); i++) {
    await page.mouse.wheel(0, 900)
    await page.waitForTimeout(150)
  }
  await page.evaluate(([s, x]) => {
    const el = document.querySelector(s)
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + Number(x))
  }, [sel, extra])
  await page.waitForTimeout(1600)
}
await page.screenshot({ path: out, fullPage: full === 'full' })
if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'))
await browser.close()
console.log('saved', out)
