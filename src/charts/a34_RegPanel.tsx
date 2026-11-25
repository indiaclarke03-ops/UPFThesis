/**
 * Act 4 · Regulation spreads, with direct controls.
 * The year follows the scroll until the reader touches a control; then the
 * controls take over (a "Following scroll" button hands control back).
 * Controls: Play/Pause + year slider, domain, strength, Tier 1 money overlay.
 * Below the map: cumulative countries covered over time, current year marked.
 */
import * as d3 from 'd3'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { SiteData } from '../lib/data'
import { useReducedMotion, useSize } from '../lib/hooks'
import { ALL_DOMAINS, RegSpread, firstYears, statusFiltered, type Strength } from './a34_RegSpread'
import { DOMAINS, DOMAIN_COLOR } from './a34_util'

const Y_MIN = 2005
const Y_MAX = 2025
const SHORT: Record<string, string> = {
  'Sugary drink tax': 'Sugary-drink tax',
  'Front-of-pack label': 'Front-of-pack label',
  'Marketing to children': 'Marketing',
  'Salt / sodium limits': 'Salt / sodium',
  'Trans-fat limit': 'Trans-fat',
  'Unhealthy food / UPF tax': 'UPF tax',
}

export function RegPanel({ data, scrollYear }: { data: SiteData; scrollYear: number }) {
  const [manual, setManual] = useState(false)
  const [year, setYear] = useState(scrollYear)
  const [playing, setPlaying] = useState(false)
  const [domain, setDomain] = useState<string>(ALL_DOMAINS)
  const [strength, setStrength] = useState<Strength>('both')
  const [money, setMoney] = useState(false)
  const reduce = useReducedMotion()
  const timer = useRef<number | null>(null)

  const shown = manual ? year : scrollYear

  // Play: step one year at a time, 2005 → 2025
  useEffect(() => {
    if (!playing) return
    timer.current = window.setInterval(
      () =>
        setYear((y) => {
          if (y >= Y_MAX) {
            setPlaying(false)
            return Y_MAX
          }
          return y + 1
        }),
      reduce ? 900 : 520,
    )
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [playing, reduce])

  const takeOver = () => {
    if (!manual) {
      setYear(scrollYear)
      setManual(true)
    }
  }
  const play = () => {
    takeOver()
    if (playing) return setPlaying(false)
    if ((manual ? year : scrollYear) >= Y_MAX) setYear(Y_MIN)
    setPlaying(true)
  }

  return (
    <div className="rp">
      <div className="rp-controls" role="group" aria-label="Map controls">
        <div className="rp-row">
          <button type="button" className="rp-play" onClick={play} aria-label={playing ? 'Pause' : 'Play the years from 2005 to 2025'}>
            {playing ? (
              <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden="true"><rect x={2} y={1} width={3.5} height={12} rx={1} fill="currentColor" /><rect x={8.5} y={1} width={3.5} height={12} rx={1} fill="currentColor" /></svg>
            ) : (
              <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5 L12.5 7 L3 12.5 Z" fill="currentColor" /></svg>
            )}
            {playing ? 'Pause' : 'Play'}
          </button>
          <label className="rp-year">
            <span className="sr-only">Year</span>
            <input
              type="range"
              min={Y_MIN}
              max={Y_MAX}
              step={1}
              value={shown}
              onChange={(e) => {
                takeOver()
                setPlaying(false)
                setYear(Number(e.target.value))
              }}
              aria-valuetext={String(shown)}
            />
          </label>
          {manual ? (
            <button
              type="button"
              className="rp-resume"
              onClick={() => {
                setManual(false)
                setPlaying(false)
              }}
              title="Hand the year back to the scroll"
            >
              Following scroll ↺
            </button>
          ) : (
            <span className="rp-hint">Year follows your scroll</span>
          )}
        </div>
        <div className="rp-row rp-wrap">
          <div className="rp-pills" role="group" aria-label="Measure">
            {[ALL_DOMAINS, ...DOMAINS].map((d) => (
              <button key={d} type="button" aria-pressed={domain === d} onClick={() => { takeOver(); setDomain(d) }}>
                {d !== ALL_DOMAINS && <i style={{ background: DOMAIN_COLOR[d] }} />}
                {d === ALL_DOMAINS ? 'All' : SHORT[d] ?? d}
              </button>
            ))}
          </div>
        </div>
        <div className="rp-row rp-wrap">
          <div className="rp-pills" role="group" aria-label="Strength">
            {(
              [
                ['both', 'Both'],
                ['binding', 'Binding'],
                ['voluntary', 'Voluntary'],
              ] as [Strength, string][]
            ).map(([k, l]) => (
              <button key={k} type="button" aria-pressed={strength === k} onClick={() => { takeOver(); setStrength(k) }}>
                {l}
              </button>
            ))}
          </div>
          <button type="button" className="rp-money" aria-pressed={money} onClick={() => { takeOver(); setMoney((v) => !v) }}>
            <i aria-hidden="true" /> {money ? 'Hide' : 'Show'} Tier 1 money
          </button>
        </div>
      </div>

      <RegSpread data={data} year={shown} domain={domain} strength={strength} money={money} showStrip={false} compact maxMapH={Math.round((typeof window !== 'undefined' ? window.innerHeight : 900) * (typeof window !== 'undefined' && window.innerWidth < 640 ? 0.2 : 0.36))} />
      <Coverage data={data} year={shown} domain={domain} strength={strength} />
    </div>
  )
}

/** Cumulative number of countries covered, 2000–2025, with the selected year marked. */
function Coverage({ data, year, domain, strength }: { data: SiteData; year: number; domain: string; strength: Strength }) {
  const [ref, { width }] = useSize<HTMLDivElement>()
  const fy = useMemo(() => firstYears(data, domain), [data, domain])
  const years = d3.range(2000, 2026)
  const series = useMemo(() => {
    const isos = data.countries.map((c) => c.iso3)
    const count = (y: number, s: 'binding' | 'voluntary') =>
      isos.filter((i) => statusFiltered(fy.get(i), y, strength === 'both' ? 'both' : strength) === s).length
    return years.map((y) => ({ y, b: strength === 'voluntary' ? 0 : count(y, 'binding'), v: strength === 'binding' ? 0 : count(y, 'voluntary') }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.countries, fy, strength])
  const H = 104
  const mg = { t: 16, r: 64, b: 18, l: 30 }
  const x = d3.scaleLinear().domain([2000, 2025]).range([mg.l, Math.max(mg.l + 20, width - mg.r)])
  const yMax = d3.max(series, (d) => d.b + d.v) || 1
  const y = d3.scaleLinear().domain([0, yMax]).nice().range([H - mg.b, mg.t])
  const areaB = d3.area<(typeof series)[number]>().x((d) => x(d.y)).y0(y(0)).y1((d) => y(d.b)).curve(d3.curveMonotoneX)
  const areaV = d3.area<(typeof series)[number]>().x((d) => x(d.y)).y0((d) => y(d.b)).y1((d) => y(d.b + d.v)).curve(d3.curveMonotoneX)
  const cur = series.find((d) => d.y === year) ?? series[series.length - 1]
  const first = series[0]
  const last = series[series.length - 1]
  return (
    <div ref={ref} className="rp-coverage">
      {width > 0 && (
        <svg width={width} height={H} role="img" aria-label={`Countries with a ${strength === 'voluntary' ? 'voluntary' : 'binding'} UPF rule rose from ${first.b + first.v} in 2000 to ${last.b + last.v} in 2025.`}>
          <text x={mg.l} y={11} fontSize={11} fill="#5E6472">
            Countries covered over time{domain !== ALL_DOMAINS ? ` · ${SHORT[domain] ?? domain}` : ''}
          </text>
          {y.ticks(3).map((t) => (
            <g key={t}>
              <line x1={mg.l} x2={width - mg.r} y1={y(t)} y2={y(t)} stroke="#E7E1D6" strokeDasharray={t ? '2 3' : undefined} />
              <text x={mg.l - 5} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill="#5E6472">{t}</text>
            </g>
          ))}
          <rect x={x(2013)} width={x(2019) - x(2013)} y={mg.t} height={H - mg.t - mg.b} fill="#0F6E6E" opacity={0.06} />
          <text x={(x(2013) + x(2019)) / 2} y={mg.t + 10} fontSize={9.5} textAnchor="middle" fill="#0F6E6E">test window 2013–19</text>
          <path d={areaV(series) ?? ''} fill="#9ED3CF" opacity={0.9} />
          <path d={areaB(series) ?? ''} fill="#0F6E6E" opacity={0.9} />
          <line x1={x(year)} x2={x(year)} y1={mg.t - 4} y2={H - mg.b} stroke="#14213D" strokeWidth={1.25} />
          <circle cx={x(year)} cy={y(cur.b + cur.v)} r={4} fill="#14213D" stroke="#fff" strokeWidth={1.5} />
          <text x={x(year) + (x(year) > width - mg.r - 60 ? -8 : 8)} y={y(cur.b + cur.v) - 8} textAnchor={x(year) > width - mg.r - 60 ? 'end' : 'start'} fontSize={12} fontWeight={700} fill="#14213D">
            {cur.b + cur.v} in {year}
          </text>
          <text x={width - mg.r + 6} y={y(last.b + last.v)} dy="0.32em" fontSize={11} fontWeight={650} fill="#0F6E6E">
            {last.b + last.v}
          </text>
          <text x={width - mg.r + 6} y={y(last.b + last.v) + 13} dy="0.32em" fontSize={9.5} fill="#5E6472">in 2025</text>
          {[2000, 2005, 2010, 2015, 2020, 2025].map((t) => (
            <text key={t} x={x(t)} y={H - 5} fontSize={10} textAnchor="middle" fill="#5E6472">{t}</text>
          ))}
        </svg>
      )}
    </div>
  )
}
