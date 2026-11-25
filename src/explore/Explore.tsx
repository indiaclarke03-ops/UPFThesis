/**
 * /explore: the dashboard. Filters live in the URL so any view can be shared
 * or cited. All views are linked to the same filtered deal set.
 */
import { AnimatePresence, motion as m } from 'framer-motion'
import { useCallback, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { LenderStream } from '../charts/LenderStream'
import { FollowTheMoney } from '../charts/Sankey'
import { Info } from '../components/Info'
import { Skeleton, Toggle } from '../components/ui'
import { DEFAULT_FILTERS, filterDeals, filtersToParams, kpis, paramsToFilters, type Filters } from '../lib/aggregate'
import { useData, type Deal } from '../lib/data'
import { useReducedMotion } from '../lib/hooks'
import type { Lender } from '../lib/tokens'
import { QUESTIONS, type AskResult } from './ask'
import { AskMenu } from './AskMenu'
import { DealDrawer } from './DealDrawer'
import { DealTable, toCSV } from './DealTable'
import { FilterBar } from './FilterBar'
import { MapView } from './MapView'
import { Kpis, ParentBars, RegStrip } from './views'
import './explore.css'

export default function Explore() {
  const data = useData()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const reduce = useReducedMotion()
  const f = useMemo(() => paramsToFilters(params), [params])
  const [sel, setSel] = useState<Deal | null>(null)
  const [perCapita, setPerCapita] = useState(false)
  const [askId, setAskId] = useState<string | null>(null)
  const [answer, setAnswer] = useState<AskResult | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const onChange = useCallback(
    (patch: Partial<Filters>) => {
      setParams((p) => filtersToParams({ ...paramsToFilters(p), ...patch }), { replace: true })
      setAskId(null)
      setAnswer(null)
    },
    [setParams],
  )
  const reset = useCallback(() => {
    setParams(new URLSearchParams(), { replace: true })
    setAskId(null)
    setAnswer(null)
  }, [setParams])

  const deals = useMemo(() => (data ? filterDeals(data.deals, f, data.firmByParent) : []), [data, f])
  const scopeTotal = useMemo(() => (data ? kpis(filterDeals(data.deals, { ...DEFAULT_FILTERS, scope: f.scope }), f.scope) : null), [data, f.scope])
  // LenderStream sums core Tier 1 money; for the food scope, feed it food money.
  const streamDeals = useMemo(() => (f.scope === 't1' ? deals : deals.map((d) => ({ ...d, t1: d.food }))), [deals, f.scope])

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }

  if (!data || !scopeTotal)
    return (
      <div className="container ex-page" aria-busy="true">
        {/* Same header as the loaded page, so the heading paints before the data arrives. */}
        <div className="ex-head">
          <div>
            <Link to="/" className="ex-back">
              ← Back to the story
            </Link>
            <div className="kicker" style={{ marginTop: '0.75rem' }}>
              Explorer
            </div>
            <h1>Every deal behind the numbers</h1>
            <Skeleton height={44} style={{ maxWidth: 660 }} />
          </div>
        </div>
        <Skeleton height={90} style={{ marginBottom: 16 }} />
        <div className="kpis">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={96} />
          ))}
        </div>
        <Skeleton height={420} />
      </div>
    )

  const runAsk = (id: string) => {
    if (askId === id) {
      reset()
      return
    }
    const q = QUESTIONS.find((x) => x.id === id)!
    const r = q.run(data)
    setParams(filtersToParams({ ...DEFAULT_FILTERS, ...r.filters }), { replace: true })
    setAskId(id)
    setAnswer(r)
  }

  const shareUrl = `${window.location.origin}${window.location.pathname}#${location.pathname}${location.search}`
  const copy = (text: string, ok: string) =>
    navigator.clipboard
      ? navigator.clipboard.writeText(text).then(
          () => flash(ok),
          () => window.prompt('Copy:', text),
        )
      : window.prompt('Copy:', text)
  const cite = () => {
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    copy(
      `Clarke, India. 2026. “Funding What We Regulate: Public Money, Corporate Power and the Ultra-Processed Food Transition.” Interactive data explorer, filtered view. Data version: ${data.meta.data_version}. Accessed ${today}. ${shareUrl}.`,
      'Citation copied (Chicago)',
    )
  }
  const download = () => {
    const blob = new Blob([toCSV(deals)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `upf-public-finance-deals_${f.scope}_${deals.length}rows.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const highlightLender: Lender | null = f.lenders.length === 1 ? f.lenders[0] : ((answer?.highlight?.lender as Lender | undefined) ?? null)

  return (
    <div className="container ex-page">
      <div className="ex-head">
        <div>
          <Link to="/" className="ex-back">
            ← Back to the story
          </Link>
          <div className="kicker" style={{ marginTop: '0.75rem' }}>
            Explorer
          </div>
          <h1>Every deal behind the numbers</h1>
          <p className="muted" style={{ margin: 0, maxWidth: 660 }}>
            {f.scope === 't1' ? 'The 153 Tier 1 deals' : 'All 663 food-manufacturing deals'} from the IFC, EBRD, EIB and IDB Invest, 2010–2025. Filter anything:
            the URL updates, so you can share or cite this exact view.
            <Info id="t1_deals" />
          </p>
        </div>
        <div className="ex-actions">
          <button type="button" className="btn" onClick={download}>
            ↓ Download CSV
          </button>
          <button type="button" className="btn" onClick={cite}>
            “ Cite this view
          </button>
          <button type="button" className="btn" onClick={() => copy(shareUrl, 'Link copied')}>
            Copy link
          </button>
        </div>
      </div>

      <section className="ask" aria-label="Ask the data">
        <AskMenu activeId={askId} onPick={runAsk} onClear={reset} />
        <AnimatePresence mode="wait">
          {answer && (
            <m.div
              key={askId}
              className="ask-answer"
              initial={{ opacity: 0, y: reduce ? 0 : 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              role="status"
            >
              <span>{answer.answer}</span>
            </m.div>
          )}
        </AnimatePresence>
      </section>

      <FilterBar data={data} f={f} onChange={onChange} onReset={reset} />

      <Kpis deals={deals} scope={f.scope} total={scopeTotal} />

      <div className="ex-grid">
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div>
              <h2>Where the money goes</h2>
              <div className="panel-sub">Click a country to filter. Descriptive only: where lending lands, not what it causes.</div>
            </div>
            <Toggle
              label="Map measure"
              value={perCapita ? 'pc' : 'abs'}
              onChange={(v) => setPerCapita(v === 'pc')}
              options={[
                { value: 'abs', label: 'Total' },
                { value: 'pc', label: 'Per 1,000 people' },
              ]}
            />
          </div>
          <MapView
            data={data}
            deals={deals}
            scope={f.scope}
            selected={f.iso3s}
            perCapita={perCapita}
            onToggle={(iso) => onChange({ iso3s: f.iso3s.includes(iso) ? f.iso3s.filter((x) => x !== iso) : [...f.iso3s, iso] })}
          />
        </div>
        <div className="panel">
          <h2>Who gets it</h2>
          <div className="panel-sub">Parent groups by money in this view. Dot = conflict-of-interest grade (0–3). Click to filter.</div>
          <ParentBars data={data} deals={deals} scope={f.scope} active={f.parent} highlight={answer?.highlight?.parents} onPick={(p) => onChange({ parent: p })} />
        </div>
      </div>

      <div className="ex-grid">
        <div className="panel">
          <h2>When, and from whom</h2>
          <div className="panel-sub">{f.scope === 't1' ? 'Core Tier 1' : 'Core food-manufacturing'} commitments by approval year and lender, US$ at 2024 prices.</div>
          <LenderStream deals={streamDeals} mode="lenders" height={300} highlight={highlightLender} />
        </div>
        <div className="panel">
          <h2>Lending under the law</h2>
          <div className="panel-sub">Each country’s UPF rules (voluntary, then binding) with its deals on top. Top 30 by money.</div>
          <RegStrip data={data} deals={deals} scope={f.scope} />
        </div>
      </div>

      <div className="panel" style={{ marginBottom: '1rem' }}>
        <h2>Follow the money</h2>
        <div className="panel-sub">Lender → income group at approval → parent group → conflict-of-interest grade, for the deals in this view.</div>
        <FollowTheMoney deals={deals} firmByParent={data.firmByParent} />
      </div>

      <div className="panel">
        <div className="dt-tools">
          <div>
            <h2>The deals</h2>
            <div className="panel-sub" style={{ margin: 0 }}>
              {deals.length.toLocaleString('en-US')} rows · click a row for its coding card · every row links to the lender’s own disclosure
            </div>
          </div>
          <button type="button" className="btn" onClick={download}>
            ↓ CSV of these {deals.length} rows
          </button>
        </div>
        <DealTable deals={deals} selected={sel?.id ?? null} onSelect={setSel} />
      </div>

      <p className="small muted" style={{ marginTop: '1.25rem' }}>
        Commitments, not disbursements. US$ millions at 2024 prices. Grade 0 means no evidence was found, not that a group did not obstruct regulation.{' '}
        <Link to="/methods">Methods &amp; data</Link> · <Link to="/">Back to the story</Link>
      </p>

      <DealDrawer data={data} deal={sel} onClose={() => setSel(null)} />
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
