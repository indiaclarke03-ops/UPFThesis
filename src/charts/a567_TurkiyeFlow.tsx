/**
 * Act 6 · Türkiye. Three readable views of the same 20 Tier 1 deals:
 *  - 'lenders': lender bars on the left, ranked firms on the right, joined by
 *               thin flows coloured by lender (hover/focus isolates a path);
 *  - 'firms':   ranked horizontal bars per parent group, split by lender, with
 *               US$m and share labels (optional "also sells abroad" notes);
 *  - 'time':    cumulative Tier 1 money as a rising step line, each deal a dot,
 *               over Türkiye's regulation timeline, with the 2018 call-out.
 */
import * as d3 from 'd3'
import { motion as m } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Tooltip, useTooltip } from '../components/ui'
import { parentName, type Deal, type RegEvent } from '../lib/data'
import { pct, usdM } from '../lib/format'
import { useReducedMotion, useSize } from '../lib/hooks'
import { lenderColor, lenderText, motion, type Lender } from '../lib/tokens'

export type TurView = 'lenders' | 'firms' | 'time'

const YILDIZ = 'Yildiz Holding (Ulker/pladis)'
const TR_NAME: Record<string, string> = { Dogus: 'Doğuş', Ozgorkey: 'Özgörkey', Uludag: 'Uludağ', [YILDIZ]: 'Yıldız/Ülker' }
export const trName = (p: string | null | undefined) => (p && TR_NAME[p]) || parentName(p)

/** Where the largest groups also sell. Company-reported context, not thesis data. */
const ABROAD: Record<string, string> = {
  [YILDIZ]: 'also sells abroad: pladis (UK: McVitie’s, Godiva); exports to Middle East, Central Asia',
  'Coca-Cola system': 'also sells abroad: Coca-Cola İçecek bottles for Central Asia, Pakistan, Middle East',
}

const INK = '#14213D'
const MUTED = '#5E6472'
const RULE = '#E7E1D6'
const COPPER = '#B05A2B'
const COPPER_TEXT = '#9A4A1F'

interface FirmRow {
  key: string
  usd: number
  n: number
  byLender: { l: Lender; usd: number; n: number }[]
}

export function TurkiyeFlow({
  deals,
  regulation,
  view,
  highlight,
  showAbroad,
  regionalCci,
}: {
  deals: Deal[] // Tier 1 deals in TUR
  regulation: RegEvent[] // TUR events
  view: TurView
  highlight?: string | null
  showAbroad?: boolean
  regionalCci?: Deal | null
}) {
  const [ref, { width }] = useSize<HTMLDivElement>()
  const reduce = useReducedMotion()
  const { tip, show, move, hide } = useTooltip()
  const [focus, setFocus] = useState<string | null>(null) // lender or firm key
  const phone = width < 560
  const dur = reduce ? 0 : motion.slow / 1000

  const total = d3.sum(deals, (d) => d.t1 ?? 0)
  const firms: FirmRow[] = useMemo(
    () =>
      d3
        .rollups(deals, (v) => v, (d) => d.parent ?? d.company ?? '—')
        .map(([key, v]) => ({
          key,
          usd: d3.sum(v, (d) => d.t1 ?? 0),
          n: v.length,
          byLender: d3
            .rollups(v, (w) => ({ usd: d3.sum(w, (d) => d.t1 ?? 0), n: w.length }), (d) => d.lender)
            .map(([l, x]) => ({ l: l as Lender, ...x }))
            .sort((a, b) => b.usd - a.usd),
        }))
        .sort((a, b) => b.usd - a.usd),
    [deals],
  )
  const lenders = useMemo(
    () =>
      d3
        .rollups(deals, (v) => ({ usd: d3.sum(v, (d) => d.t1 ?? 0), n: v.length }), (d) => d.lender)
        .map(([l, x]) => ({ l: l as Lender, ...x }))
        .sort((a, b) => b.usd - a.usd),
    [deals],
  )
  const timeLayout = useMemo(() => {
    const sorted = [...deals].filter((d) => d.year).sort((a, b) => a.year! - b.year! || (b.t1 ?? 0) - (a.t1 ?? 0))
    const cum: { year: number; v: number }[] = []
    let run = 0
    for (let y = 2010; y <= 2025; y++) {
      run += d3.sum(sorted.filter((d) => d.year === y), (d) => d.t1 ?? 0)
      cum.push({ year: y, v: run })
    }
    return { sorted, cum }
  }, [deals])

  const sentence = (l: Lender, f: FirmRow) => {
    const e = f.byLender.find((b) => b.l === l)
    return e
      ? `${l} lent ${usdM(e.usd)} to ${trName(f.key)} across ${e.n} deal${e.n === 1 ? '' : 's'}: ${pct(e.usd / total, 0)} of Türkiye’s Tier 1 money.`
      : ''
  }

  let body: React.ReactNode = null
  let height = 420

  /* ================================================================ FIRMS */
  if (view === 'firms') {
    const labelW = phone ? 96 : 150
    const valW = phone ? 92 : 150
    const rowGap = showAbroad && !phone ? 42 : phone ? 30 : 36
    const top = 26
    height = top + firms.length * rowGap + (regionalCci && showAbroad ? 30 : 8)
    const x = d3.scaleLinear().domain([0, firms[0]?.usd ?? 1]).range([0, Math.max(10, width - labelW - valW - 8)])
    body = (
      <m.g key="firms" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: dur / 2 }}>
        <text x={0} y={12} fontSize={10.5} fontWeight={700} letterSpacing="0.08em" fill={MUTED}>
          PARENT GROUP
        </text>
        <text x={labelW} y={12} fontSize={10.5} fontWeight={700} letterSpacing="0.08em" fill={MUTED}>
          CORE TIER 1 MONEY, BY LENDER
        </text>
        {firms.map((f, i) => {
          const y = top + i * rowGap
          const dim = highlight ? f.key !== highlight : false
          const hot = highlight === f.key
          let acc = 0
          return (
            <g key={f.key} opacity={dim ? 0.35 : 1} style={{ transition: 'opacity 500ms' }}>
              <text x={0} y={y + 11} fontSize={phone ? 11.5 : 13} fontWeight={hot || i === 0 ? 700 : 550} fill={INK}>
                {trName(f.key)}
              </text>
              <text x={0} y={y + 25} fontSize={10.5} fill={MUTED}>
                {f.n} deal{f.n === 1 ? '' : 's'}
              </text>
              {f.byLender.map((b) => {
                const x0 = labelW + x(acc)
                acc += b.usd
                const tt = (
                  <>
                    <div className="tt-title">
                      {b.l} → {trName(f.key)}
                    </div>
                    <div>{sentence(b.l, f)}</div>
                  </>
                )
                return (
                  <m.rect
                    key={b.l}
                    y={y + 2}
                    height={20}
                    rx={2}
                    fill={lenderColor[b.l]}
                    initial={{ x: labelW, width: 0 }}
                    animate={{ x: x0, width: Math.max(1.5, x(b.usd) - 1) }}
                    transition={{ duration: dur, delay: reduce ? 0 : i * 0.05, ease: motion.ease }}
                    onPointerEnter={(e) => show(e, tt)}
                    onPointerMove={move}
                    onPointerLeave={hide}
                    onPointerDown={(e) => show(e, tt)}
                  />
                )
              })}
              {hot && <rect x={labelW - 3} y={y - 1} width={x(f.usd) + 6} height={26} rx={4} fill="none" stroke={COPPER} strokeWidth={2} />}
              <text x={labelW + x(f.usd) + 8} y={y + 12} dy="0.32em" fontSize={phone ? 11.5 : 13} fontWeight={700} fill={i === 0 || hot ? COPPER_TEXT : INK}>
                {usdM(f.usd, 1)}
                <tspan fontWeight={500} fill={MUTED}>
                  {' '}
                  · {pct(f.usd / total, 0)}
                </tspan>
              </text>
              {showAbroad && !phone && ABROAD[f.key] && (
                <m.text x={labelW} y={y + 36} fontSize={11} fill={COPPER_TEXT} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: dur, delay: reduce ? 0 : 0.3 }}>
                  ↗ {ABROAD[f.key]}*
                </m.text>
              )}
            </g>
          )
        })}
        {showAbroad && regionalCci && (
          <text x={0} y={height - 6} fontSize={11} fill={COPPER_TEXT}>
            + {usdM(regionalCci.t1, 0)} {regionalCci.lender} loan to Coca-Cola İçecek ({regionalCci.year}), booked as regional, not in these totals
          </text>
        )}
      </m.g>
    )
  }

  /* ============================================================== LENDERS */
  if (view === 'lenders') {
    height = phone ? 300 : 360
    const top = 30
    const bottom = 12
    const lw = phone ? 64 : 92
    const fx = phone ? width * 0.46 : width * 0.5
    const fBarMax = Math.max(30, width - fx - (phone ? 120 : 190))
    const avail = height - top - bottom
    const lGap = 18
    const k = (avail - lGap * (lenders.length - 1)) / Math.max(1, total)
    let ly = top
    const lPos = new Map<Lender, { y0: number; y1: number }>()
    for (const l of lenders) {
      lPos.set(l.l, { y0: ly, y1: ly + l.usd * k })
      ly += l.usd * k + lGap
    }
    const rowH = avail / Math.max(1, firms.length)
    const fy = (i: number) => top + i * rowH + rowH / 2
    const fScale = d3.scaleLinear().domain([0, firms[0]?.usd ?? 1]).range([0, fBarMax])
    const wScale = d3.scaleSqrt().domain([0, firms[0]?.usd ?? 1]).range([1.2, phone ? 7 : 10])
    const lCursor = new Map<Lender, number>()
    for (const l of lenders) lCursor.set(l.l, lPos.get(l.l)!.y0)
    const links = firms.flatMap((f, i) =>
      f.byLender.map((b) => {
        const p = lPos.get(b.l)!
        const share = b.usd * k
        const sy = lCursor.get(b.l)! + share / 2
        lCursor.set(b.l, lCursor.get(b.l)! + share)
        return { f, b, sy: Math.min(p.y1 - 2, Math.max(p.y0 + 2, sy)), ty: fy(i) }
      }),
    )
    const focusFirm = firms.find((f) => f.key === focus)
    const linkOn = (l: Lender, f: string) => !focus || focus === l || focus === f
    body = (
      <m.g key="lenders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: dur / 2 }}>
        <text x={0} y={14} fontSize={10.5} fontWeight={700} letterSpacing="0.08em" fill={MUTED}>
          LENDER
        </text>
        <text x={fx} y={14} fontSize={10.5} fontWeight={700} letterSpacing="0.08em" fill={MUTED}>
          {phone ? 'PARENT GROUP' : 'PARENT GROUP IN TÜRKIYE, RANKED'}
        </text>
        {links.map(({ f, b, sy, ty }, i) => {
          const x0 = lw + 4
          const x1 = fx - 6
          const mx = (x0 + x1) / 2
          const on = linkOn(b.l, f.key)
          const hl = highlight ? f.key === highlight : false
          return (
            <m.path
              key={`${b.l}-${f.key}`}
              d={`M${x0},${sy} C${mx},${sy} ${mx},${ty} ${x1},${ty}`}
              fill="none"
              stroke={lenderColor[b.l]}
              strokeWidth={wScale(b.usd)}
              strokeLinecap="round"
              initial={{ pathLength: reduce ? 1 : 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: !on ? 0.06 : highlight && !hl ? 0.16 : focus ? 0.95 : 0.6 }}
              transition={{ duration: reduce ? 0 : 1, delay: reduce ? 0 : 0.1 + i * 0.05, ease: motion.ease }}
              style={{ cursor: 'pointer' }}
              onPointerEnter={(e) => {
                setFocus(f.key)
                show(
                  e,
                  <>
                    <div className="tt-title">
                      {b.l} → {trName(f.key)}
                    </div>
                    <div>{sentence(b.l, f)}</div>
                  </>,
                )
              }}
              onPointerMove={move}
              onPointerLeave={() => {
                setFocus(null)
                hide()
              }}
            />
          )
        })}
        {lenders.map((l) => {
          const p = lPos.get(l.l)!
          const on = !focus || focus === l.l || !!focusFirm?.byLender.some((b) => b.l === l.l)
          const tall = p.y1 - p.y0 > 50
          return (
            <g
              key={l.l}
              opacity={on ? 1 : 0.3}
              style={{ transition: 'opacity 400ms', cursor: 'pointer', outline: 'none' }}
              tabIndex={0}
              role="button"
              aria-label={`${l.l}: ${l.n} deals, ${usdM(l.usd)}. Highlight its flows.`}
              onPointerEnter={() => setFocus(l.l)}
              onPointerLeave={() => setFocus(null)}
              onFocus={() => setFocus(l.l)}
              onBlur={() => setFocus(null)}
            >
              <rect x={0} y={p.y0} width={lw} height={Math.max(4, p.y1 - p.y0)} rx={4} fill={lenderColor[l.l]} />
              {tall ? (
                <>
                  <text x={8} y={p.y0 + 19} fontSize={phone ? 13 : 16} fontWeight={750} fill="#fff">
                    {l.l}
                  </text>
                  <text x={8} y={p.y0 + 35} fontSize={phone ? 10 : 11.5} fill="#fff">
                    {l.n} deals
                  </text>
                  <text x={8} y={p.y0 + 50} fontSize={phone ? 10 : 11.5} fontWeight={650} fill="#fff">
                    {usdM(l.usd, 0)}
                  </text>
                </>
              ) : (
                <text x={0} y={p.y1 + 13} fontSize={11} fontWeight={700} fill={lenderText[l.l]}>
                  {l.l} · {l.n} deals · {usdM(l.usd, 0)}
                </text>
              )}
            </g>
          )
        })}
        {firms.map((f, i) => {
          const yy = fy(i)
          const on = !focus || focus === f.key || f.byLender.some((b) => b.l === focus)
          const hl = highlight === f.key
          const dim = (highlight && !hl) || !on
          const bw = Math.max(2, fScale(f.usd))
          return (
            <g
              key={f.key}
              opacity={dim ? 0.3 : 1}
              style={{ transition: 'opacity 400ms', cursor: 'pointer', outline: 'none' }}
              tabIndex={0}
              role="button"
              aria-label={`${trName(f.key)}: ${usdM(f.usd)}, ${f.n} deals. Highlight its flows.`}
              onPointerEnter={() => setFocus(f.key)}
              onPointerLeave={() => setFocus(null)}
              onFocus={() => setFocus(f.key)}
              onBlur={() => setFocus(null)}
            >
              <m.rect
                x={fx}
                y={yy - 7}
                height={14}
                rx={2}
                fill={hl ? COPPER : INK}
                opacity={0.88}
                initial={{ width: reduce ? bw : 0 }}
                animate={{ width: bw }}
                transition={{ duration: dur, delay: reduce ? 0 : 0.6 + i * 0.05 }}
              />
              <text x={fx + bw + 6} y={yy} dy="0.32em" fontSize={phone ? 10.5 : 12} fontWeight={hl || i === 0 ? 700 : 550} fill={hl ? COPPER_TEXT : INK}>
                {trName(f.key)}
                <tspan fill={MUTED} fontWeight={500}>
                  {' '}
                  {usdM(f.usd, 0)}
                </tspan>
              </text>
            </g>
          )
        })}
      </m.g>
    )
  }

  /* ================================================================= TIME */
  if (view === 'time') {
    height = phone ? 330 : 410
    const margin = { top: 26, right: phone ? 12 : 120, left: phone ? 34 : 128, bottom: 24 }
    const x = d3.scaleLinear().domain([2001.5, 2025.8]).range([margin.left, width - margin.right])
    const chartBottom = height * 0.58
    const y = d3.scaleLinear().domain([0, total * 1.12]).range([chartBottom, margin.top + 30])
    const regRows = Array.from(new Set(regulation.map((e) => e.domain))).map((dm) => ({
      domain: dm,
      events: regulation.filter((e) => e.domain === dm).sort((a, b) => (a.year ?? 0) - (b.year ?? 0)),
    }))
    const regTop = chartBottom + 30
    const rowH = Math.min(28, (height - regTop - margin.bottom - 4) / Math.max(1, regRows.length))
    const mkt = regulation.find((e) => e.domain === 'Marketing to children' && e.strength === 'Binding')?.year ?? 2018
    const before = timeLayout.cum.find((c) => c.year === mkt - 1)?.v ?? 0
    const after = total - before
    const cumExt = [...timeLayout.cum, { year: 2025.8, v: total }]
    const area = d3
      .area<{ year: number; v: number }>()
      .x((d) => x(d.year))
      .y0(chartBottom)
      .y1((d) => y(d.v))
      .curve(d3.curveStepAfter)
    const line = d3
      .line<{ year: number; v: number }>()
      .x((d) => x(d.year))
      .y((d) => y(d.v))
      .curve(d3.curveStepAfter)
    const rDot = d3.scaleSqrt().domain([0, 170]).range([2.5, phone ? 8 : 11])
    body = (
      <m.g key="time" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: dur / 2 }}>
        {d3.range(2002, 2026, phone ? 4 : 2).map((yr) => (
          <g key={yr}>
            <line x1={x(yr)} x2={x(yr)} y1={margin.top} y2={height - margin.bottom} stroke={RULE} strokeDasharray="2 4" />
            <text x={x(yr)} y={height - 8} textAnchor="middle" fontSize={10.5} fill={MUTED}>
              {phone ? `’${String(yr).slice(2)}` : yr}
            </text>
          </g>
        ))}
        {y.ticks(4).map((t) => (
          <text key={t} x={margin.left + 4} y={y(t) - 4} textAnchor="start" fontSize={10} fill={MUTED}>
            {t === 0 ? '0' : t >= 1000 ? `${(t / 1000).toFixed(1)}bn` : `${t}m`}
          </text>
        ))}
        {!phone && (
          <text x={0} y={margin.top + 40} fontSize={10.5} fontWeight={700} letterSpacing="0.06em" fill={COPPER_TEXT}>
            <tspan x={0}>RUNNING TOTAL OF</tspan>
            <tspan x={0} dy="1.3em">TIER 1 MONEY</tspan>
            <tspan x={0} dy="1.3em" fontWeight={400} letterSpacing="0">
              dots = deals, by lender
            </tspan>
          </text>
        )}
        <rect x={x(mkt)} y={margin.top + 22} width={x(2025.8) - x(mkt)} height={chartBottom - margin.top - 22} fill="rgba(176,90,43,0.07)" />
        <m.path d={area(cumExt) ?? ''} fill="rgba(176,90,43,0.16)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: dur }} />
        <m.path
          d={line(cumExt) ?? ''}
          fill="none"
          stroke={COPPER}
          strokeWidth={2.5}
          initial={{ pathLength: reduce ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reduce ? 0 : 1.6, ease: motion.ease }}
        />
        {timeLayout.sorted.map((d, i) => {
          const same = timeLayout.sorted.filter((o) => o.year === d.year)
          const k = same.indexOf(d)
          const r = rDot(d.t1 ?? 0)
          const cy = chartBottom - 3 - r - k * (phone ? 14 : 19)
          const tt = (
            <>
              <div className="tt-title">{d.company}</div>
              <div className="tt-row">
                <span>
                  {d.lender}, {d.year}
                </span>
                <span>{usdM(d.t1)}</span>
              </div>
              <div>{trName(d.parent)}</div>
            </>
          )
          return (
            <m.circle
              key={d.id}
              cx={x(d.year!)}
              cy={cy}
              r={r}
              fill={lenderColor[d.lender]}
              stroke="#fff"
              strokeWidth={1}
              initial={{ opacity: 0, scale: reduce ? 1 : 0 }}
              animate={{ opacity: 0.95, scale: 1 }}
              transition={{ duration: dur, delay: reduce ? 0 : 0.4 + i * 0.04 }}
              onPointerEnter={(e) => show(e, tt)}
              onPointerMove={move}
              onPointerLeave={hide}
              onPointerDown={(e) => show(e, tt)}
            />
          )
        })}
        <line x1={x(mkt)} x2={x(mkt)} y1={margin.top - 6} y2={height - margin.bottom} stroke="#0F6E6E" strokeWidth={1.5} />
        <m.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: dur, delay: reduce ? 0 : 1.2 }}>
          <text x={x(mkt) - 6} y={margin.top + 4} textAnchor="end" fontSize={phone ? 10.5 : 12} fontWeight={700} fill="#0F6E6E">
            {mkt}: binding marketing limits
          </text>
          <text x={x(mkt) - 6} y={margin.top + 20} textAnchor="end" fontSize={phone ? 10.5 : 12} fill={INK}>
            {usdM(before, 0)} committed before
          </text>
          {!phone ? (
            <>
              <path d={`M${x(2025.8) + 6},${y(before)} V${y(total) + 6}`} stroke={COPPER} strokeWidth={2} markerEnd="url(#a567-up)" />
              <line x1={x(mkt)} x2={x(2025.8) + 10} y1={y(before)} y2={y(before)} stroke={COPPER} strokeDasharray="3 3" />
              <text x={x(2025.8) + 14} y={(y(before) + y(total)) / 2 - 8} fontSize={14} fontWeight={750} fill={COPPER_TEXT}>
                +{usdM(after, 0)}
              </text>
              <text x={x(2025.8) + 14} y={(y(before) + y(total)) / 2 + 8} fontSize={11} fill={INK}>
                <tspan x={x(2025.8) + 14}>after the limits:</tspan>
                <tspan x={x(2025.8) + 14} dy="1.25em">
                  {pct(after / total, 0)} of the total
                </tspan>
              </text>
            </>
          ) : (
            <text x={width - margin.right} y={y(total) - 8} textAnchor="end" fontSize={11} fontWeight={750} fill={COPPER_TEXT}>
              +{usdM(after, 0)} after {mkt} ({pct(after / total, 0)})
            </text>
          )}
        </m.g>
        <defs>
          <marker id="a567-up" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill={COPPER} />
          </marker>
        </defs>
        <text x={phone ? margin.left : 0} y={regTop - 10} fontSize={10.5} fontWeight={700} fill="#0F6E6E" letterSpacing="0.06em">
          REGULATION IN FORCE
        </text>
        {regRows.map((row, i) => {
          const yy = regTop + i * rowH
          return (
            <g key={row.domain}>
              {!phone && (
                <text x={0} y={yy + rowH / 2} dy="0.32em" fontSize={11} fill={INK}>
                  {row.domain}
                </text>
              )}
              {row.events.map((e, j) => {
                const next = row.events[j + 1]?.year ?? 2025.8
                const end = Math.min(e.end ?? next, 2025.8)
                const bind = e.strength === 'Binding'
                const x0 = x(e.year ?? 2002)
                return (
                  <g key={e.id}>
                    <m.rect
                      x={x0}
                      y={yy + 3}
                      height={rowH - 6}
                      rx={3}
                      fill={bind ? '#0F6E6E' : '#9ED3CF'}
                      initial={{ width: reduce ? x(end) - x0 : 0 }}
                      animate={{ width: Math.max(2, x(end) - x0) }}
                      transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : 0.1 + i * 0.06 }}
                      onPointerEnter={(ev) =>
                        show(
                          ev,
                          <>
                            <div className="tt-title">
                              {e.domain} · {e.strength}
                            </div>
                            <div>{e.detail}</div>
                            <div style={{ opacity: 0.8 }}>In force {e.year}</div>
                          </>,
                        )
                      }
                      onPointerMove={move}
                      onPointerLeave={hide}
                    />
                    <text x={x0 + 5} y={yy + rowH / 2} dy="0.32em" fontSize={10} fill={bind ? '#FFFDF9' : INK} pointerEvents="none">
                      {phone ? `${row.domain.split(' ')[0]} · ${e.year}` : `${e.year} ${bind ? 'binding' : 'voluntary'}`}
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })}
      </m.g>
    )
  }

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="group"
          aria-label={
            view === 'firms'
              ? 'Türkiye: Tier 1 money by parent group, split by lender'
              : view === 'lenders'
                ? 'Türkiye: flows from lenders to parent groups'
                : 'Türkiye: running total of Tier 1 money over the regulation timeline'
          }
          style={{ overflow: 'visible' }}
        >
          {body}
        </svg>
      )}
      <Tooltip tip={tip} />
    </div>
  )
}
