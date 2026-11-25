// Thesis figure: "Who gets the money" circle pack of the 82 parent groups,
// circle AREA proportional to core Tier 1 commitments (US$m, 2024 prices).
// Reads public/data/firms.json + results.json; writes exports/ (SVG, PNG 300 dpi, PDF).
// Usage: node scripts/export_pack_figure.mjs
import { chromium } from '@playwright/test'
import * as d3 from 'd3'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const firms = JSON.parse(readFileSync(resolve(ROOT, 'public/data/firms.json'), 'utf8'))
const results = JSON.parse(readFileSync(resolve(ROOT, 'public/data/results.json'), 'utf8'))
const C = results.computed
const OUT = resolve(ROOT, 'exports')
mkdirSync(OUT, { recursive: true })

const DISPLAY = {
  'Yildiz Holding (Ulker/pladis)': 'Yıldız Holding (Ülker/pladis)',
  Nestle: 'Nestlé',
  'Muller Group': 'Müller Group',
  Uludag: 'Uludağ',
  'CMI (Corporacion Multi Inversiones)': 'CMI (Corporación Multi Inversiones)',
  Dogus: 'Doğuş',
  Ozgorkey: 'Özgörkey',
  Ariztia: 'Ariztía',
  Lantmannen: 'Lantmännen',
}
const name = (p) => DISPLAY[p] ?? p
const fmt = d3.format(',.1f')
const total = C.t1_core_usd_m // canonical thesis total (6,432.6), not the sum of rounded group values

function build({ titled }) {
  const W = 1800 // px at 1x; exported PNG at 3x ≈ 5400 px (18 cm at 300 dpi)
  const top = titled ? 150 : 30
  const packSize = 1240
  const H = top + packSize + 95
  const ranked = [...firms].sort((a, b) => b.t1 - a.t1)
  const rank = new Map(ranked.map((f, i) => [f.parent, i]))

  const root = d3.hierarchy({ children: ranked }).sum((d) => d.t1 ?? 0).sort((a, b) => b.value - a.value)
  d3.pack().size([packSize, packSize]).padding(4)(root)
  const leaves = root.leaves()
  const ox = 40
  const oy = top

  const fill = (i) => (i < 5 ? '#8E4521' : i < 10 ? '#B05A2B' : i < 25 ? '#D98A55' : '#ECC7A8')
  const ink = '#14213D'

  const circles = leaves
    .map((l) => {
      const i = rank.get(l.data.parent)
      return `<circle cx="${(ox + l.x).toFixed(1)}" cy="${(oy + l.y).toFixed(1)}" r="${l.r.toFixed(1)}" fill="${fill(i)}" stroke="#ffffff" stroke-width="1.5"><title>${name(l.data.parent)}: US$${fmt(l.data.t1)}m</title></circle>`
    })
    .join('\n')

  // label circles large enough to hold text; others get a rank number if r >= 14
  const labels = leaves
    .map((l) => {
      const i = rank.get(l.data.parent)
      const cx = ox + l.x
      const cy = oy + l.y
      const nm = name(l.data.parent).replace(/ \(.*\)$/, '')
      const light = i < 10
      const col = light ? '#ffffff' : ink
      if (l.r >= 62) {
        const words0 = wrap(nm, Math.max(8, Math.floor((l.r * 1.7) / (Math.min(30, l.r / 4.2) * 0.56))))
        const longest = Math.max(...words0.map((w) => w.length))
        // shrink so the longest line fits inside the circle (approx. 0.58em per glyph)
        const fs = Math.max(13, Math.min(30, l.r / 4.2, (l.r * 1.7) / (longest * 0.6)))
        const words = words0
        const lines = words.map((w, k) => `<tspan x="${cx.toFixed(1)}" dy="${k === 0 ? 0 : fs * 1.1}">${esc(w)}</tspan>`).join('')
        const y0 = cy - ((words.length - 1) * fs * 1.1) / 2 - fs * 0.35
        return `<text x="${cx.toFixed(1)}" y="${y0.toFixed(1)}" text-anchor="middle" font-size="${fs.toFixed(1)}" font-weight="650" fill="${col}">${lines}</text>
<text x="${cx.toFixed(1)}" y="${(y0 + words.length * fs * 1.1 + fs * 0.15).toFixed(1)}" text-anchor="middle" font-size="${(fs * 0.82).toFixed(1)}" fill="${col}" opacity="0.92">US$${fmt(l.data.t1)}m</text>`
      }
      if (l.r >= 34) {
        const fs = Math.max(11, l.r / 3.6)
        return `<text x="${cx.toFixed(1)}" y="${(cy - 2).toFixed(1)}" text-anchor="middle" font-size="${fs.toFixed(1)}" font-weight="650" fill="${col}">${esc(shorten(nm, Math.floor((l.r * 1.9) / (fs * 0.56))))}</text>
<text x="${cx.toFixed(1)}" y="${(cy + fs).toFixed(1)}" text-anchor="middle" font-size="${(fs * 0.85).toFixed(1)}" fill="${col}" opacity="0.92">${fmt(l.data.t1)}</text>`
      }
      return ''
    })
    .join('\n')

  // ranked list on the right (top 15)
  const lx = ox + packSize + 50
  const ly = oy + 40
  const list = ranked
    .slice(0, 15)
    .map((f, i) => {
      const y = ly + i * 64
      const pct = ((f.t1 / total) * 100).toFixed(1)
      return `<g>
<circle cx="${lx + 12}" cy="${y - 7}" r="10" fill="${fill(i)}"/>
<text x="${lx + 32}" y="${y}" font-size="21" font-weight="650" fill="${ink}">${i + 1}. ${esc(name(f.parent))}</text>
<text x="${lx + 32}" y="${y + 26}" font-size="18" fill="#5E6472">US$${fmt(f.t1)}m · ${pct}% · ${f.n_t1} deal${f.n_t1 === 1 ? '' : 's'}</text>
</g>`
    })
    .join('\n')
  const keyY = ly + 15 * 64 + 10
  const key = [
    ['#8E4521', 'Top 5 groups', `${(C.top5_share * 100).toFixed(1)}% of the money`],
    ['#B05A2B', 'Ranks 6–10', `top 10 together: ${(C.top10_share * 100).toFixed(1)}%`],
    ['#D98A55', 'Ranks 11–25', ''],
    ['#ECC7A8', 'Ranks 26–82', ''],
  ]
    .map(([c, a, b], i) => `<rect x="${lx}" y="${keyY + i * 34}" width="22" height="22" rx="4" fill="${c}"/><text x="${lx + 34}" y="${keyY + i * 34 + 17}" font-size="18" fill="${ink}"><tspan font-weight="650">${a}</tspan>${b ? `<tspan fill="#5E6472">  ${b}</tspan>` : ''}</text>`)
    .join('\n')

  const title = titled
    ? `<text x="40" y="62" font-family="Fraunces, Georgia, serif" font-size="44" font-weight="650" fill="${ink}">Who gets the money: ${firms.length} parent groups</text>
<text x="40" y="106" font-size="22" fill="#5E6472">Core Tier 1 commitments to UPF manufacturers by IFC, EBRD, EIB and IDB Invest, 2010–2025. Circle area shows money (US$m, 2024 prices).</text>`
    : ''
  const foot = `<text x="40" y="${H - 62}" font-size="18" fill="#5E6472">Note: at least US$${fmt(total)}m in total across ${firms.length} parent groups. Circle area is proportional to core Tier 1 money; commitments, not disbursements.</text>
<text x="40" y="${H - 40}" font-size="18" fill="#5E6472">Source: Clarke (2026), thesis dataset (lender disclosures of IFC, EBRD, EIB and IDB Invest), frozen 18 Nov 2026; do-file §2c.</text>`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Inter, 'Helvetica Neue', Arial, sans-serif">
<rect width="${W}" height="${H}" fill="#ffffff"/>
${title}
${circles}
${labels}
${list}
${key}
${foot}
</svg>`
}

function wrap(s, max) {
  const out = []
  let cur = ''
  for (const w of s.split(' ')) {
    if ((cur + ' ' + w).trim().length > max && cur) {
      out.push(cur)
      cur = w
    } else cur = (cur + ' ' + w).trim()
  }
  if (cur) out.push(cur)
  return out.slice(0, 3)
}
const shorten = (s, n) => (s.length <= n ? s : s.slice(0, Math.max(3, n - 1)).trimEnd() + '…')
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

const browser = await chromium.launch()
for (const titled of [true, false]) {
  const svg = build({ titled })
  const base = resolve(OUT, `who-gets-the-money_circle-pack${titled ? '' : '_no-title'}`)
  writeFileSync(base + '.svg', svg)
  const [, w, h] = svg.match(/width="(\d+)" height="(\d+)"/)
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 3 })
  await page.setContent(`<html><head><style>body{margin:0}</style></head><body>${svg}</body></html>`)
  await page.screenshot({ path: base + '.png', clip: { x: 0, y: 0, width: +w, height: +h } })
  await page.pdf({ path: base + '.pdf', width: `${w}px`, height: `${h}px`, printBackground: true, pageRanges: '1' })
  await page.close()
  console.log('wrote', base + '.{svg,png,pdf}')
}
await browser.close()
