import { Info } from '../components/Info'
import type { SiteData } from '../lib/data'
import { pct } from '../lib/format'

/** "In 60 seconds": the four findings as cards that jump to their acts. */
export function Summary({ data }: { data: SiteData }) {
  const r = data.results
  const c = r.computed
  const ci = r.h3_did_main.ci
  const cards = [
    {
      act: 'act-2',
      tag: 'H1 · How visible',
      big: `about ${Math.round(r.h1_gap.value)}×`,
      info: 'h1_gap',
      text: (
        <>
          All Tier 1 money is about seven times the money to firms on the global UPF list by name: for every named dollar, about six more go to firms you cannot see.
        </>
      ),
    },
    {
      act: 'act-3',
      tag: 'H2 · Blind spot',
      big: '0 of 10',
      info: 'h2_lists',
      text: <>lender exclusion lists name ultra-processed food. All 10 name tobacco.</>,
    },
    {
      act: 'act-4',
      tag: 'H3 · Regulation',
      big: 'No clear change',
      info: 'did_main',
      text: (
        <>
          in lending after binding national rules. The estimate is a null: 95% CI −{Math.abs(ci[0]).toFixed(2)} to +{ci[1].toFixed(2)}.
        </>
      ),
    },
    {
      act: 'act-5',
      tag: 'H4 · Same firms',
      big: pct(c.coi_share),
      info: 'coi_share',
      text: (
        <>
          of the money went to groups with documented opposition to health rules ({pct(c.coi_share_without_yildiz)} without Yıldız).
        </>
      ),
    },
  ]
  return (
    <section className="a012-sum" aria-labelledby="a012-sum-title">
      <div className="a012-sum-inner">
        <h2 id="a012-sum-title" className="a012-sum-title">
          <span className="a012-sum-kicker">In 60 seconds</span>
          Four findings
        </h2>
        <ol className="a012-sum-grid">
          {cards.map((k, i) => (
            <li key={k.act} className="a012-sum-card">
              <span className="a012-sum-tag">
                <span className="a012-sum-n">{i + 1}</span>
                {k.tag}
              </span>
              <span className="a012-sum-big">
                {k.big}
                <Info id={k.info} />
              </span>
              <p className="a012-sum-text">{k.text}</p>
              <a
                className="a012-sum-go"
                href={`#${k.act}`}
                onClick={(e) => {
                  e.preventDefault()
                  jumpToAct(k.act)
                }}
              >
                See the evidence <span aria-hidden="true">↓</span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/** Mount acts up to `id`, wait until they have rendered, then scroll to it. */
function jumpToAct(id: string) {
  window.dispatchEvent(new CustomEvent('act-jump', { detail: id }))
  const ids = Array.from({ length: Number(id.split('-')[1]) }, (_, i) => `act-${i + 1}`)
  const t0 = performance.now()
  const ready = () => ids.every((x) => document.getElementById(x)?.getAttribute('aria-busy') !== 'true')
  const go = () => {
    if (!ready() && performance.now() - t0 < 4000) return void setTimeout(go, 60)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    // charts may still settle; nudge once if we landed off target
    setTimeout(() => {
      const top = document.getElementById(id)?.getBoundingClientRect().top ?? 0
      if (Math.abs(top) > 40) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }, 1200)
  }
  go()
}
