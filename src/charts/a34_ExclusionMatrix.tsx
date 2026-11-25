/**
 * Act 3 · The exclusion matrix. Rows = published exclusion lists (10 lenders,
 * then the Norway GPFG comparator and the two ATNi benchmarks). Columns =
 * products each list names. Columns fill in as the reader scrolls.
 */
import { motion as m } from 'framer-motion'
import type { ExclusionList } from '../lib/data'
import { useReducedMotion } from '../lib/hooks'

export const XM_COLS = [
  { key: 'excludes_tobacco', label: 'Tobacco', short: 'Tobacco' },
  { key: 'excludes_alcohol', label: 'Alcohol', short: 'Alcohol' },
  { key: 'excludes_weapons', label: 'Weapons', short: 'Weapons' },
  { key: 'excludes_UPF_or_unhealthy_food', label: 'UPF / unhealthy food', short: 'UPF / unhealthy food' },
  { key: 'excludes_sugary_drinks', label: 'Sugary drinks', short: 'Sugary drinks' },
  { key: 'mentions_BMS_Code', label: 'Breast-milk substitutes Code', short: 'BMS Code' },
  { key: 'nutrition_criteria', label: 'Nutrition criteria', short: 'Nutrition criteria' },
] as const
export type XmKey = (typeof XM_COLS)[number]['key']

export function shortInstitution(s: string): string {
  if (s.startsWith('EDFI')) return 'EDFI members'
  if (s.startsWith('AFD')) return 'AFD Group'
  if (s.startsWith('MIGA')) return 'MIGA (WBG)'
  if (s.startsWith('Comparator: Norway')) return 'Norway GPFG'
  if (s.startsWith('Benchmark: ATNi')) return 'ATNi'
  return s
}
export const firstUrl = (u: string) => u.split(/\s*;\s*/)[0]

const UPF_IDX = 3

export function ExclusionMatrix({
  rows,
  revealCols,
  showComparators,
  focus,
}: {
  rows: ExclusionList[]
  /** number of columns revealed (0–7) */
  revealCols: number
  showComparators: boolean
  /** column to emphasise */
  focus?: XmKey | null
}) {
  const reduce = useReducedMotion()
  const lenders = rows.filter((r) => r.kind === 'lender')
  const others = rows.filter((r) => r.kind !== 'lender')
  const upfShown = revealCols > UPF_IDX

  const cell = (r: ExclusionList, ci: number, ri: number) => {
    const col = XM_COLS[ci]
    const v = r[col.key]
    const shown = ci < revealCols
    const isUpf = ci === UPF_IDX
    const name = shortInstitution(r.institution)
    const verdict = v === 1 ? 'named on the list' : v === 0 ? 'not named' : 'not assessed'
    const dim = focus && focus !== col.key
    return (
      <div className={`xm-cell ${isUpf && upfShown && r.kind === 'lender' ? 'xm-upf' : ''} ${isUpf && upfShown && focus === 'excludes_UPF_or_unhealthy_food' && r.kind === 'lender' ? 'xm-upf-focus' : ''}`} key={col.key}>
        {isUpf && upfShown && r.kind === 'lender' && ri === 4 && (
          <m.span
            className="xm-stamp"
            aria-hidden="true"
            initial={reduce ? false : { opacity: 0, scale: 1.6, rotate: -14 }}
            animate={{ opacity: 1, scale: 1, rotate: -9 }}
            transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : 0.55, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <b>None</b>
            <span>0 of 10</span>
          </m.span>
        )}
        <a
          href={firstUrl(r.url)}
          target="_blank"
          rel="noreferrer"
          aria-label={`${name}, ${col.label}: ${shown ? verdict : 'not yet revealed'}. Source: ${r.document}, ${r.version}`}
          title={`${r.document} (${r.version})`}
        >
          {shown && (
            <m.svg
              width={20}
              height={20}
              viewBox="-10 -10 20 20"
              initial={reduce ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: dim ? 0.3 : 1 }}
              transition={{ duration: reduce ? 0 : 0.45, delay: reduce ? 0 : ri * 0.045, ease: [0.22, 0.61, 0.36, 1] }}
            >
              {v === 1 ? (
                <circle r={7.5} fill={r.kind === 'benchmark' && (isUpf || ci > UPF_IDX) ? '#0F6E6E' : '#14213D'} />
              ) : v === 0 ? (
                <circle r={6.5} fill="none" stroke={isUpf ? '#B05A2B' : '#9AA0A6'} strokeWidth={isUpf ? 1.8 : 1.2} />
              ) : (
                <line x1={-4} x2={4} stroke="#9AA0A6" strokeWidth={1.4} />
              )}
            </m.svg>
          )}
        </a>
      </div>
    )
  }

  const row = (r: ExclusionList, ri: number) => (
    <div style={{ display: 'contents' }} key={r.institution + r.version}>
      <div className="xm-label">
        <a href={firstUrl(r.url)} target="_blank" rel="noreferrer" title={r.document}>
          {shortInstitution(r.institution)}
          {r.kind === 'benchmark' && <span className="muted" style={{ fontWeight: 400 }}> · {r.version}</span>}
        </a>
        <span className="xm-ver">{r.document}</span>
      </div>
      {XM_COLS.map((_, ci) => cell(r, ci, ri))}
    </div>
  )

  const tobacco = lenders.filter((r) => r.excludes_tobacco === 1).length
  const upf = lenders.filter((r) => r.excludes_UPF_or_unhealthy_food === 1).length

  return (
    <div className="xm">
      <div className="xm-grid" role="group" aria-label="Products named on each lender's exclusion list">
        <div />
        {XM_COLS.map((c, i) => (
          <div key={c.key} className={`xm-head ${i < revealCols ? 'on' : ''} ${i === UPF_IDX ? 'upf' : ''}`}>
            {c.short}
          </div>
        ))}
        {lenders.map((r, i) => row(r, i))}
        <div className="xm-count" />
        {XM_COLS.map((c, i) => (
          <div key={c.key} className="xm-count" style={{ color: i === UPF_IDX ? '#9A4A1F' : undefined, opacity: i < revealCols ? 1 : 0 }}>
            {i < revealCols ? `${lenders.filter((r) => r[c.key] === 1).length}/10` : ''}
          </div>
        ))}
        {showComparators && (
          <>
            <div className="xm-sep">Comparator and benchmarks: a nutrition screen already exists</div>
            {others.map((r, i) => row(r, i + 10))}
          </>
        )}
      </div>
      <div className="xm-legend" aria-hidden="true">
        <span>
          <svg width={14} height={14} viewBox="-7 -7 14 14"><circle r={6} fill="#14213D" /></svg> Named on the list
        </span>
        <span>
          <svg width={14} height={14} viewBox="-7 -7 14 14"><circle r={5} fill="none" stroke="#9AA0A6" strokeWidth={1.2} /></svg> Not named
        </span>
        <span>
          <svg width={14} height={14} viewBox="-7 -7 14 14"><line x1={-4} x2={4} stroke="#9AA0A6" strokeWidth={1.4} /></svg> Not assessed
        </span>
        <span>
          {tobacco}/10 lender lists name tobacco · {upf}/10 name UPF or unhealthy food
        </span>
      </div>
    </div>
  )
}
