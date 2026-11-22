/**
 * Bold, simple SVG/HTML visuals for presentation mode (dark background).
 * Self-contained so they don't depend on the story act components.
 */
import * as d3 from 'd3'
import { motion as m } from 'framer-motion'
import type { SiteData } from '../lib/data'
import { usdBn } from '../lib/format'
import { LENDERS, lenderColorOnDark, type Lender } from '../lib/tokens'

const INK = '#E9E4DA'
const MUTED = '#A9B0C0'
const COPPER = '#E08A55'
const RULE = '#2A3754'

/* ---------------------------------------------------- 153 dots, 12 lit */
export function GapGrid({ data, reveal }: { data: SiteData; reveal: boolean }) {
  const h1 = data.results.computed.h1
  const cols = 17
  const units: { lender: Lender; named: boolean }[] = []
  for (const l of LENDERS) {
    for (let i = 0; i < h1[l].deals; i++) units.push({ lender: l, named: i < h1[l].deals_named })
  }
  const s = 34
  const rows = Math.ceil(units.length / cols)
  return (
    <svg viewBox={`0 0 ${cols * s} ${rows * s}`} style={{ width: '100%', maxHeight: '58vh' }} role="img" aria-label="153 Tier 1 deals; 12 carry the name of a listed global UPF company">
      {units.map((u, i) => (
        <m.circle
          key={i}
          cx={(i % cols) * s + s / 2}
          cy={Math.floor(i / cols) * s + s / 2}
          r={s * 0.36}
          initial={false}
          animate={{ fill: u.named ? '#F3EEE4' : reveal ? lenderColorOnDark[u.lender] : '#1A2643', opacity: u.named || reveal ? 1 : 0.9 }}
          transition={{ duration: 0.6, delay: reveal && !u.named ? (i % 40) * 0.012 : 0 }}
          stroke={u.named ? '#fff' : 'none'}
          strokeWidth={2}
        />
      ))}
    </svg>
  )
}

/* ------------------------------------------------------- NOVA strip */
export function NovaStrip() {
  const groups = [
    { n: 1, t: 'Unprocessed or minimally processed', e: 'fruit, milk, eggs, rice' },
    { n: 2, t: 'Processed culinary ingredients', e: 'oil, butter, sugar, salt' },
    { n: 3, t: 'Processed foods', e: 'cheese, canned fish, fresh bread' },
    { n: 4, t: 'Ultra-processed', e: 'soft drinks, biscuits, instant noodles, packaged snacks' },
  ]
  return (
    <div className="xp-nova">
      {groups.map((g) => (
        <div key={g.n} className={`xp-nova-cell ${g.n === 4 ? 'on' : ''}`}>
          <div className="xp-nova-n">NOVA {g.n}</div>
          <div className="xp-nova-t">{g.t}</div>
          <div className="xp-nova-e">{g.e}</div>
        </div>
      ))}
    </div>
  )
}

/* ---------------------------------------------- exclusion mini-matrix */
export function MatrixMini({ data }: { data: SiteData }) {
  const lenders = data.exclusion.filter((e) => e.kind === 'lender')
  const cols: { k: keyof (typeof lenders)[number]; label: string }[] = [
    { k: 'excludes_tobacco', label: 'Tobacco' },
    { k: 'excludes_alcohol', label: 'Alcohol' },
    { k: 'excludes_weapons', label: 'Weapons' },
    { k: 'excludes_UPF_or_unhealthy_food', label: 'UPF / unhealthy' },
    { k: 'excludes_sugary_drinks', label: 'Sugary drinks' },
  ]
  const cw = 150
  const rh = 34
  const lw = 230
  return (
    <svg viewBox={`0 0 ${lw + cols.length * cw} ${60 + lenders.length * rh}`} style={{ width: '100%', maxHeight: '60vh' }} role="img" aria-label="10 of 10 lender exclusion lists name tobacco; 0 of 10 name UPF or unhealthy food">
      {cols.map((c, j) => (
        <text key={String(c.k)} x={lw + j * cw + cw / 2} y={38} textAnchor="middle" fontSize={15} fontWeight={700} fill={c.k === 'excludes_UPF_or_unhealthy_food' ? COPPER : INK}>
          {c.label}
        </text>
      ))}
      {lenders.map((e, i) => (
        <g key={e.institution} transform={`translate(0,${60 + i * rh})`}>
          <text x={lw - 14} y={rh / 2} dy="0.32em" textAnchor="end" fontSize={14} fill={MUTED}>
            {e.institution.replace(/\s*\(.*\)/, '').replace('EDFI members', 'EDFI')}
          </text>
          {cols.map((c, j) => {
            const v = e[c.k] as number | null
            const upf = c.k === 'excludes_UPF_or_unhealthy_food'
            return (
              <m.circle
                key={String(c.k)}
                cx={lw + j * cw + cw / 2}
                cy={rh / 2}
                r={11}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: j * 0.18 + i * 0.02, duration: 0.3 }}
                fill={v === 1 ? INK : 'none'}
                stroke={upf ? COPPER : '#4A5878'}
                strokeWidth={upf ? 2 : 1.5}
                strokeDasharray={upf ? '3 3' : undefined}
              />
            )
          })}
        </g>
      ))}
    </svg>
  )
}

/* ----------------------------------------------------------- CI plot */
export function CiPlot({ b, lo, hi }: { b: number; lo: number; hi: number }) {
  const W = 900
  const H = 260
  const x = d3.scaleLinear().domain([-2, 4]).range([60, W - 40])
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxHeight: '48vh' }} role="img" aria-label={`Difference-in-differences estimate +${b} log points, 95% CI ${lo} to ${hi}, crossing zero`}>
      <rect x={x(-2)} y={40} width={x(0) - x(-2)} height={140} fill="#0F6E6E" opacity={0.22} />
      <text x={x(-1)} y={64} textAnchor="middle" fontSize={16} fill="#7ED3CB" fontWeight={650}>
        a reduction would sit here
      </text>
      {d3.range(-2, 5).map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={40} y2={180} stroke={RULE} />
          <text x={x(t)} y={206} textAnchor="middle" fontSize={16} fill={MUTED}>
            {t > 0 ? `+${t}` : t < 0 ? `−${-t}` : '0'}
          </text>
        </g>
      ))}
      <line x1={x(0)} x2={x(0)} y1={30} y2={190} stroke={INK} strokeWidth={2} />
      <m.line x1={x(lo)} x2={x(hi)} y1={120} y2={120} stroke={COPPER} strokeWidth={6} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: [0.22, 0.61, 0.36, 1] }} />
      <m.circle cx={x(b)} cy={120} r={13} fill={COPPER} stroke="#0B1426" strokeWidth={3} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.9 }} />
      <text x={x(b)} y={100} textAnchor="middle" fontSize={20} fontWeight={700} fill={INK}>
        +{b.toFixed(2)}
      </text>
      <text x={x(lo)} y={150} textAnchor="middle" fontSize={15} fill={MUTED}>
        −{Math.abs(lo).toFixed(2)}
      </text>
      <text x={x(hi)} y={150} textAnchor="middle" fontSize={15} fill={MUTED}>
        +{hi.toFixed(2)}
      </text>
      <text x={W / 2} y={240} textAnchor="middle" fontSize={15} fill={MUTED}>
        Difference-in-differences, log points: ln(1 + Tier 1 US$ per 1,000 people)
      </text>
    </svg>
  )
}

/* --------------------------------------------------- COI share bar */
export function CoiBar({ share, noY }: { share: number; noY: number }) {
  return (
    <div className="xp-coi">
      <div className="xp-coi-track">
        <m.div className="xp-coi-a" style={{ background: '#C0574A' }} initial={{ width: 0 }} animate={{ width: `${noY * 100}%` }} transition={{ duration: 0.9 }} />
        <m.div className="xp-coi-b" style={{ background: 'repeating-linear-gradient(45deg, #E9A274 0 6px, #C9844F 6px 12px)' }} initial={{ width: 0 }} animate={{ width: `${(share - noY) * 100}%` }} transition={{ duration: 0.9, delay: 0.5 }} />
      </div>
      <div className="xp-coi-legend">
        <span>
          <i style={{ background: '#C0574A' }} /> Groups graded 2–3, excluding Yıldız: {(noY * 100).toFixed(1)}%
        </span>
        <span>
          <i style={{ background: '#E9A274' }} /> Yıldız (grade rests on UK arm pladis): +{((share - noY) * 100).toFixed(1)} pts
        </span>
        <span>
          <i style={{ background: '#1A2643', border: `1px solid ${RULE}` }} /> No evidence found or grade 1
        </span>
      </div>
    </div>
  )
}

/* ------------------------------------------------- intermediated fog */
export function FogBars({ data }: { data: SiteData }) {
  return (
    <div className="xp-fog">
      {data.results.computed.intermediated.map((i) => (
        <div key={i.lender} className="xp-fog-row">
          <div className="xp-fog-l" style={{ color: lenderColorOnDark[i.lender] }}>
            {i.lender}
          </div>
          <div className="xp-fog-track">
            <div className="xp-fog-solid" style={{ width: `${(1 - i.share) * 100}%`, background: lenderColorOnDark[i.lender] }} />
            <div className="xp-fog-fade" style={{ width: `${i.share * 100}%`, background: `linear-gradient(90deg, ${lenderColorOnDark[i.lender]}88, transparent)` }} />
          </div>
          <div className="xp-fog-v">{Math.round(i.share * 100)}% intermediated</div>
        </div>
      ))}
    </div>
  )
}

export const bn = usdBn
