/**
 * "Who gets it" figure export for the written thesis: a clean, labelled
 * circle pack (white background, top groups named with US$m, source line),
 * built as a standalone SVG string. PNG is rendered client-side at 3×.
 */
import * as d3 from 'd3'
import type { Firm, SiteData } from '../lib/data'
import { parentName } from '../lib/data'

const W = 1600
const PACK = 1360
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif"

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const SHORT: Record<string, string[]> = {
  'Coca-Cola system': ['Coca-Cola', 'system'],
  'Yildiz Holding (Ulker/pladis)': ['Yıldız Holding', '(Ülker/pladis)'],
  'PRAN-RFL Group': ['PRAN-RFL', 'Group'],
  'CMI (Corporacion Multi Inversiones)': ['CMI'],
  'Atlantic Grupa': ['Atlantic', 'Grupa'],
  'Danube Foods': ['Danube', 'Foods'],
  FrieslandCampina: ['Friesland-', 'Campina'],
  'Muller Group': ['Müller', 'Group'],
  'Pandurata (Bauducco)': ['Pandurata', '(Bauducco)'],
  'Minsk Soft Drinks (MZBN)': ['Minsk Soft', 'Drinks'],
}

export function buildPackSvg(firms: Firm[], total: number, labelTop = 15): { svg: string; width: number; height: number } {
  const root = d3
    .hierarchy({ children: firms } as { children: Firm[] })
    .sum((d) => (d as unknown as Firm).t1 ?? 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
  d3.pack<{ children: Firm[] }>().size([PACK, PACK]).padding(4)(root)
  const leaves = root.leaves() as unknown as d3.HierarchyCircularNode<Firm>[]
  const vmax = leaves[0]?.data.t1 ?? 1
  const ramp = d3.scaleSequentialSqrt([0, vmax], d3.interpolateRgbBasis(['#F1DCC9', '#DB9563', '#B05A2B', '#6E2F12']))
  const ox = (W - PACK) / 2
  const oy = 190
  const fmt = d3.format(',.1f')

  const circles = leaves
    .map((n, i) => {
      const fill = ramp(n.data.t1)
      let label = ''
      if (i < labelTop) {
        const lines = SHORT[n.data.parent] ?? [parentName(n.data.parent)]
        const fs = Math.max(15, Math.min(34, n.r / 3.6))
        const dark = n.data.t1 > vmax * 0.12
        const col = dark ? '#FFFFFF' : '#3A1A0A'
        const startDy = -((lines.length - 1) * 1.1 + 1.15) / 2 + 0.35
        const tsp = lines
          .map((t, k) => `<tspan x="0" dy="${k === 0 ? `${startDy}em` : '1.1em'}">${esc(t)}</tspan>`)
          .join('')
        label = `<text text-anchor="middle" font-family="${FONT}" font-size="${fs.toFixed(1)}" font-weight="700" fill="${col}">${tsp}<tspan x="0" dy="1.2em" font-weight="400">US$${fmt(n.data.t1)}m</tspan></text>`
      }
      return `<g transform="translate(${(ox + n.x).toFixed(1)},${(oy + n.y).toFixed(1)})"><circle r="${n.r.toFixed(1)}" fill="${fill}" stroke="#FFFFFF" stroke-width="2"/>${label}</g>`
    })
    .join('\n')

  // size key: nested circles, placed below the pack (never overlapping it)
  const k = (leaves[0]?.r ?? 1) / Math.sqrt(vmax)
  const r = (v: number) => k * Math.sqrt(v)
  const packBottom = oy + Math.max(...leaves.map((n) => n.y + n.r))
  const keyVals = [250, 50]
  const keyTop = packBottom + 70
  const keyBase = keyTop + 2 * r(keyVals[0])
  const kcx = 120 + r(keyVals[0])
  const labelX = kcx + r(keyVals[0]) + 22
  const key = keyVals
    .map((v) => {
      const rr = r(v)
      const cy = keyBase - rr
      const ty = keyBase - 2 * rr
      return `<circle cx="${kcx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rr.toFixed(1)}" fill="none" stroke="#5E6472" stroke-width="1.5"/><line x1="${kcx.toFixed(1)}" y1="${ty.toFixed(1)}" x2="${(labelX - 6).toFixed(1)}" y2="${ty.toFixed(1)}" stroke="#9AA0A6" stroke-dasharray="4 4"/><text x="${labelX.toFixed(1)}" y="${(ty + 6).toFixed(1)}" font-family="${FONT}" font-size="20" fill="#5E6472">US$${d3.format(',')(v)}m</text>`
    })
    .join('')
  const noteX = labelX + 150
  const H = keyBase + 60

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="#FFFFFF"/>
<text x="120" y="88" font-family="${FONT}" font-size="40" font-weight="700" fill="#14213D">Who receives public development money for UPF manufacturing</text>
<text x="120" y="134" font-family="${FONT}" font-size="24" fill="#5E6472">${leaves.length} parent groups; circle area = core Tier 1 commitments, 2010–2025 (total US$${fmt(total)}m, 2024 prices)</text>
${circles}
<text x="120" y="${keyTop - 24}" font-family="${FONT}" font-size="20" font-weight="700" fill="#14213D">Circle area = money committed</text>
${key}
<text font-family="${FONT}" font-size="19" fill="#5E6472"><tspan x="${noteX}" y="${keyBase - 84}">Source: Clarke (2026), core Tier 1 commitments 2010–2025, US$m 2024 prices.</tspan><tspan x="${noteX}" dy="1.45em">Lenders: IFC, EBRD, EIB, IDB Invest. Commitments, not disbursements.</tspan><tspan x="${noteX}" dy="1.45em">Labelled: the ${labelTop} largest groups. A lower bound: excludes lending</tspan><tspan x="${noteX}" dy="1.45em">through financial intermediaries.</tspan></text>
</svg>`
  return { svg, width: W, height: H }
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function svgToPng({ svg, width, height }: { svg: string; width: number; height: number }, scale = 3): Promise<Blob> {
  const img = new Image()
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  await new Promise<void>((res, rej) => {
    img.onload = () => res()
    img.onerror = () => rej(new Error('SVG render failed'))
    img.src = url
  })
  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  URL.revokeObjectURL(url)
  return new Promise((res) => canvas.toBlob((b) => res(b!), 'image/png'))
}

export function PackDownload({ data }: { data: SiteData }) {
  const svg = () => buildPackSvg(data.firms, data.results.computed.t1_core_usd_m)
  return (
    <div className="a012-dl" role="group" aria-label="Download this figure">
      <span className="small muted">Download figure for print:</span>
      <button type="button" className="btn" onClick={() => download(new Blob([svg().svg], { type: 'image/svg+xml' }), 'who-gets-it-circle-pack.svg')}>
        SVG
      </button>
      <button
        type="button"
        className="btn"
        onClick={async () => download(await svgToPng(svg()), 'who-gets-it-circle-pack.png')}
      >
        PNG (high-res)
      </button>
    </div>
  )
}
