/**
 * Act 1 pieces: NOVA strip, deal-card band sorter, Baker et al. 2020 panel.
 */
import { AnimatePresence, LayoutGroup, motion as m } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import type { Deal, SiteData } from '../lib/data'
import { countryName } from '../lib/data'
import { usdM } from '../lib/format'
import { useInView, useReducedMotion } from '../lib/hooks'
import { bandColor, motion } from '../lib/tokens'
import { Info } from '../components/Info'

/* ------------------------------------------------------------- NOVA strip */
const NOVA = [
  {
    n: 1,
    name: 'Unprocessed or minimally processed',
    desc: 'Edible parts of plants and animals, at most dried, frozen, pasteurised or packed.',
    ex: ['Fresh fruit', 'Rice', 'Milk', 'Eggs', 'Plain meat'],
  },
  {
    n: 2,
    name: 'Processed culinary ingredients',
    desc: 'Substances pressed, refined or milled from group 1, used in kitchens.',
    ex: ['Vegetable oil', 'Butter', 'Sugar', 'Salt'],
  },
  {
    n: 3,
    name: 'Processed foods',
    desc: 'Group 1 foods with group 2 added: two or three ingredients, recognisable.',
    ex: ['Cheese', 'Fresh bread', 'Canned vegetables', 'Salted nuts'],
  },
  {
    n: 4,
    name: 'Ultra-processed foods',
    desc: 'Industrial formulations, mostly of substances extracted from foods plus additives (flavours, colours, emulsifiers) rarely used in home kitchens.',
    ex: ['Soft drinks', 'Packaged snacks', 'Confectionery', 'Sweet biscuits', 'Instant noodles', 'Flavoured yoghurts', 'Reconstituted meat'],
  },
]

export function NovaStrip() {
  const [sel, setSel] = useState(4)
  const g = NOVA.find((x) => x.n === sel)!
  return (
    <div>
      <div className="a012-nova" role="group" aria-label="The four NOVA food groups">
        {NOVA.map((x) => (
          <button
            key={x.n}
            type="button"
            className={`a012-nova-g ${x.n === 4 ? 'g4' : ''}`}
            aria-pressed={sel === x.n}
            onMouseEnter={() => setSel(x.n)}
            onFocus={() => setSel(x.n)}
            onClick={() => setSel(x.n)}
          >
            <span className="a012-nova-n">{x.n}</span>
            <span className="a012-nova-name">{x.name}</span>
            {x.n === 4 && <span className="a012-nova-desc">The group this thesis follows.</span>}
            <span className="a012-nova-ex" aria-hidden="true">
              {x.ex.slice(0, x.n === 4 ? 7 : 3).map((e) => (
                <span key={e}>{e}</span>
              ))}
            </span>
          </button>
        ))}
      </div>
      <p className="a012-nova-detail" aria-live="polite">
        <strong>NOVA {g.n}: {g.name}.</strong> {g.desc} <span className="muted">Examples: {g.ex.join(', ')}.</span>
      </p>
      <p className="small muted">Classification: Monteiro et al., NOVA food classification (2019).</p>
    </div>
  )
}

/* ------------------------------------------------------------ band sorter */
const EXAMPLES: { id: string; band: 'A' | 'B' | 'C' | 'D' }[] = [
  { id: 'IFC-40929', band: 'A' },
  { id: 'IFC-39589', band: 'B' },
  { id: 'EBRD-N0018', band: 'C' },
  { id: 'EBRD-N0133', band: 'D' },
]
const BINS = [
  { b: 'A', head: '≥ 50%', sub: 'NOVA 4 is at least half of sales' },
  { b: 'B', head: '20–50%', sub: 'NOVA 4 a material share' },
  { b: 'C', head: '< 20%', sub: 'Some NOVA 4, below the threshold' },
  { b: 'D', head: '≈ 0%', sub: 'Little or no NOVA 4' },
] as const

export function BandSorter({ data }: { data: SiteData }) {
  const reduce = useReducedMotion()
  const [ref, seen] = useInView<HTMLDivElement>(0.35)
  const deals = useMemo(
    () => EXAMPLES.map((e) => ({ ...e, d: data.deals.find((x) => x.id === e.id) })).filter((e): e is { id: string; band: 'A' | 'B' | 'C' | 'D'; d: Deal } => !!e.d),
    [data.deals],
  )
  // i = index of the card currently on the table; sorted = cards already in bins
  const [i, setI] = useState(0)
  const [sorted, setSorted] = useState<number[]>([])
  const [auto, setAuto] = useState(true)

  const next = () => {
    if (sorted.length >= deals.length) {
      setSorted([])
      setI(0)
      return
    }
    setSorted((s) => [...s, i])
    setI((x) => x + 1)
  }
  useEffect(() => {
    if (!seen || !auto || reduce) return
    if (sorted.length >= deals.length) return
    const t = setTimeout(next, sorted.length === 0 ? 2600 : 3600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen, auto, sorted.length, reduce])

  const current = i < deals.length ? deals[i] : null
  const done = sorted.length >= deals.length
  const t = { duration: motion.slow / 1000, ease: motion.ease }

  const card = (e: (typeof deals)[number], full: boolean) => (
    <m.div layoutId={reduce ? undefined : `a012-card-${e.id}`} transition={t} className={full ? 'a012-deal-card' : 'a012-bin-chip'} style={!full ? { borderLeft: `3px solid ${bandColor[e.band]}` } : undefined}>
      {full ? (
        <>
          <div className="a012-dc-top">
            <span>
              {e.d.lender} · {e.d.year}
            </span>
            <span style={{ textTransform: 'none' }}>{usdM(e.d.amount)}</span>
          </div>
          <div className="a012-dc-co">{e.d.company}</div>
          <div className="small muted">
            {countryName(e.d.country)} · {e.d.sector ?? 'Food manufacturing'}
          </div>
          <blockquote>
            <span className="small" style={{ fontWeight: 650 }}>Coding reason: </span>
            {e.d.reason}
          </blockquote>
          <div className="small" style={{ marginTop: '0.6rem' }}>
            Band <b style={{ color: e.band === 'A' || e.band === 'B' ? 'var(--copper-text)' : 'var(--muted)' }}>{e.band}</b>
            {e.band === 'A' || e.band === 'B' ? ' → counts as Tier 1' : ' → not Tier 1 (not counted)'}
          </div>
        </>
      ) : (
        <>
          <b>{e.d.company}</b>
          <div className="muted">{e.d.lender} {e.d.year}</div>
        </>
      )}
    </m.div>
  )

  return (
    <div ref={ref} className="a012-sorter">
      <div>
        <div style={{ minHeight: 300 }}>
          <LayoutGroup>
            <AnimatePresence mode="popLayout">
              {current ? (
                <m.div key={current.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={t}>
                  {card(current, true)}
                </m.div>
              ) : (
                <m.div key="done" className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p style={{ margin: 0 }}>
                    Only bands <b className="copper">A</b> and <b className="copper">B</b> count. Each of the 663 food-manufacturing deals was read and
                    coded this way; 153 manufacturer deals ended up as Tier 1.
                  </p>
                </m.div>
              )}
            </AnimatePresence>
          </LayoutGroup>
        </div>
        <div className="a012-sorter-controls">
          <button type="button" className="btn primary" onClick={() => { setAuto(false); next() }}>
            {done ? 'Start again' : sorted.length === 0 ? 'Sort this deal' : 'Sort the next deal'}
          </button>
          <span className="small muted" aria-live="polite">
            {done ? 'All four sorted.' : `Deal ${i + 1} of ${deals.length}: real coding from the dataset.`}
          </span>
        </div>
      </div>
      <div>
        <div className="a012-bins">
          {BINS.map((bin) => (
            <div key={bin.b} className={`a012-bin ${bin.b === 'A' || bin.b === 'B' ? 't1' : ''}`}>
              <div className="a012-bin-head">
                <b style={{ color: bin.b === 'A' || bin.b === 'B' ? 'var(--copper-text)' : 'var(--muted)' }}>Band {bin.b}</b>
                <span className="num" style={{ fontWeight: 650 }}>{bin.head}</span>
                <div className="muted">{bin.sub}</div>
              </div>
              <LayoutGroup>
                {sorted
                  .map((k) => deals[k])
                  .filter((e) => e && e.band === bin.b)
                  .map((e) => (
                    <div key={e.id}>{card(e, false)}</div>
                  ))}
              </LayoutGroup>
            </div>
          ))}
          <div className="a012-t1-bracket">Tier 1 = NOVA 4 at least 20% of sales</div>
          <div style={{ gridColumn: '3 / span 2', textAlign: 'center', fontSize: '0.72rem', color: 'var(--muted)', borderTop: '2px solid var(--rule)', paddingTop: '0.3rem', marginTop: 4, fontWeight: 650, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Not counted
          </div>
        </div>
        <p className="small muted" style={{ marginTop: '0.8rem' }}>
          The 20% line is the IFC’s own materiality threshold. Band E (“too little information”) and C/D are also left out, so the total is a lower bound.
          Second-coder agreement was moderate (κ 0.51 role; 0.55 UPF excluding “unsure”)<Info id="kappa" />.
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ Baker panel */
const BAKER = [
  { g: 'High income', kg: 109.3, gr: 0.4 },
  { g: 'Upper-middle income', kg: 32.3, gr: 2.8 },
  { g: 'Lower-middle income', kg: 9.7, gr: 4.4 },
]
export function BakerPanel() {
  const reduce = useReducedMotion()
  const [ref, seen] = useInView<HTMLDivElement>(0.4)
  const max = 109.3
  return (
    <div ref={ref}>
      <div className="a012-baker" role="img" aria-label="UPF sales per person in 2019: high-income 109.3 kg, upper-middle 32.3 kg, lower-middle 9.7 kg. Annual growth 2009–19: 0.4%, 2.8%, 4.4%.">
        {BAKER.map((b, i) => (
          <div className="a012-baker-col" key={b.g}>
            <div className="a012-baker-bar-wrap">
              <m.div
                className="a012-baker-bar"
                style={{ background: i === 0 ? '#9AA0A6' : i === 1 ? '#D98A55' : '#B05A2B' }}
                initial={{ height: reduce ? `${(b.kg / max) * 100}%` : 0 }}
                animate={{ height: seen || reduce ? `${(b.kg / max) * 100}%` : 0 }}
                transition={{ duration: 0.7, delay: i * 0.12, ease: motion.ease }}
              />
            </div>
            <div className="a012-baker-kg num">{b.kg} kg</div>
            <div className="small">{b.g}</div>
            <div className="a012-baker-growth">
              {i === 2 ? '▲▲▲' : i === 1 ? '▲▲' : '▲'} +{b.gr}% a year
            </div>
          </div>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: '0.8rem' }}>
        UPF sales per person, 2019, and average yearly growth 2009–19. Source: Baker et al. 2020, <em>Obesity Reviews</em>
        <Info id="baker" />. Context from the literature, not thesis data.
      </p>
    </div>
  )
}
