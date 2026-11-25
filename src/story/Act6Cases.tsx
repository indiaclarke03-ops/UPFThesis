import * as d3 from 'd3'
import { useState } from 'react'
import { MexicoTimeline } from '../charts/a567_MexicoTimeline'
import { TurkiyeFlow, type TurView } from '../charts/a567_TurkiyeFlow'
import { Info } from '../components/Info'
import { ScrollStory } from '../components/ScrollStory'
import { ActEnd, ChartFrame, Toggle } from '../components/ui'
import { exploreHref } from '../lib/aggregate'
import { parentName, type SiteData } from '../lib/data'
import { pct, usdM } from '../lib/format'
import { useIsPhone } from '../lib/hooks'
import { lenderColor } from '../lib/tokens'
import './a567_acts.css'

const YILDIZ = 'Yildiz Holding (Ulker/pladis)'

/** Act 6 · Two case studies, each chosen by a stated rule. */
export default function Act6Cases({ data }: { data: SiteData }) {
  const c = data.results.computed
  // Buttons can override the scroll-driven view; scrolling to a new step resets it.
  const [turView, setTurView] = useState<TurView | null>(null)
  const [mexStage, setMexStage] = useState<number | null>(null)
  const phone = useIsPhone()

  /* ---------------------------------------------------------------- Türkiye */
  const tur = data.deals.filter((d) => d.iso3 === 'TUR' && d.tier1)
  const turReg = data.regulation.filter((e) => e.iso3 === 'TUR')
  const yDeals = tur.filter((d) => d.parent === YILDIZ)
  const cci = data.deals.find((d) => d.regional && d.tier1 && /Coca-Cola Icecek/i.test(d.company ?? '')) ?? null
  const turAfterMarketing = d3.sum(tur.filter((d) => (d.year ?? 0) >= 2018), (d) => d.t1 ?? 0)
  const mktBinding = turReg.find((e) => e.domain === 'Marketing to children' && e.strength === 'Binding')?.year
  const ssbYear = turReg.find((e) => e.domain === 'Sugary drink tax' && e.strength === 'Binding')?.year
  const turTotal = d3.sum(tur, (d) => d.t1 ?? 0)
  const yTotal = d3.sum(yDeals, (d) => d.t1 ?? 0)
  const ebrdTotal = d3.sum(tur.filter((d) => d.lender === 'EBRD'), (d) => d.t1 ?? 0)
  const stepView = (step: number): TurView => (step === 0 ? 'lenders' : step === 2 ? 'time' : 'firms')
  const TUR_TITLES: Record<TurView, [string, string]> = {
    lenders: ['Türkiye: who lent to whom', 'Line thickness = core Tier 1 money. Hover a lender or firm to isolate its flows.'],
    firms: ['Türkiye: where the money went', 'Core Tier 1 money by parent group, 2010–2025, split by lender (2024 US$)'],
    time: ['Türkiye: the money kept coming as rules arrived', 'Running total of core Tier 1 money; each dot is a deal. Bars below show rules in force.'],
  }

  const turSteps = [
    <p key="0">
      Türkiye is the largest recipient: <strong>{c.turkiye.deals} Tier 1 deals, {usdM(c.turkiye.usd_m)}</strong>
      <Info id="turkiye" />. The EBRD made {c.turkiye.by_lender.EBRD} of them; the IFC made {c.turkiye.by_lender.IFC}.
    </p>,
    <p key="1">
      Most went to national champions, not global brands. Yıldız Holding, which owns Ülker, received <strong>{usdM(c.turkiye.yildiz_in_tur)}</strong> in Türkiye
      alone, across {yDeals.length} deals.
    </p>,
    <p key="2">
      The money kept coming as rules arrived: a binding sugary-drink tax since {ssbYear}, binding marketing limits from {mktBinding}.{' '}
      <strong>{usdM(turAfterMarketing, 0)}</strong> was committed from {mktBinding} on.
    </p>,
    <p key="3">
      These groups also sell far beyond Türkiye, through pladis in the UK and Coca-Cola İçecek’s bottlers in Central Asia and the Middle East
      {cci ? `, which drew a further ${usdM(cci.t1, 0)} regional loan` : ''}.
    </p>,
  ]

  /* ----------------------------------------------------------------- Mexico */
  const mex = data.deals.filter((d) => d.iso3 === 'MEX')
  const mexReg = data.regulation.filter((e) => e.iso3 === 'MEX')
  const mexLaw = data.lawsuits.filter((l) => l.country === 'Mexico')
  const funded = new Set(mex.filter((d) => d.tier1 && d.parent).map((d) => d.parent!))
  const litigants = Array.from(funded).filter((p) => mexLaw.some((l) => l.parent === p))
  const litCount = (p: string) => mexLaw.filter((l) => l.parent === p).length
  const naturasol = d3.sum(mex.filter((d) => d.parent === 'Naturasol'), (d) => d.t1 ?? 0)
  const sc = mex.filter((d) => d.measure === 'supply-chain')
  const labels2020 = mexLaw.filter((l) => l.filed === 2020).length
  const scLine = sc.map((d) => `${d.lender} for ${parentName(d.parent).replace(' (Alfa)', '')} in ${d.year}`).join('; ')

  const mexSteps = [
    <p key="0">
      Mexico regulates hard: taxes on sugary drinks and high-calorie food in 2014, limits on children’s TV advertising, and from 2020 black warning octagons on
      packaged food.
    </p>,
    <p key="1">
      Public lenders kept financing manufacturers there: <strong>{usdM(naturasol)}</strong> of core Tier 1 money to Naturasol, plus{' '}
      <strong>{usdM(d3.sum(sc, (d) => d.amount ?? 0))}</strong> of supply-chain finance (dashed circles).
    </p>,
    <p key="2">
      Industry went to court. Lighthouse Reports records <strong>{c.mexico_lawsuits} lawsuits</strong>
      <Info id="mexico_lawsuits" /> against health rules in Mexico; {labels2020} were filed in 2020 alone, the year warning labels arrived.
    </p>,
    <p key="3">
      Two litigants also received public money: {litigants.map((p) => `${parentName(p).replace(' (Alfa)', '')} (${litCount(p)} case${litCount(p) === 1 ? '' : 's'})`).join(' and ')}.
      Supply-chain finance came from {scLine}.
    </p>,
  ]

  return (
    <section className="act" id="act-6" aria-labelledby="act-6-title">
      <div className="act-header">
        <span className="act-num">Act 6 · Case studies</span>
        <h2 id="act-6-title">Two countries, up close</h2>
        <p className="lede">
          Both cases were chosen by a rule set in advance, not because they fit the argument: the largest recipient, and the country where funded firms litigated
          against regulation already in force.
        </p>
      </div>

      {/* ------------------------------------------------------ Türkiye */}
      <div className="a567-case-head">
        <div className="a567-case-no" aria-hidden="true">
          I
        </div>
        <div>
          <span className="a567-rule-tag">Rule: the largest recipient</span>
          <h3 style={{ marginBottom: '0.3rem' }}>Türkiye: national champions with public money</h3>
          <p className="muted" style={{ margin: 0 }}>
            The EBRD is Türkiye’s biggest source of Tier 1 money, and most of it goes to home-grown snack, biscuit and drinks groups.
          </p>
        </div>
      </div>
      <ScrollStory
        id="act-6-turkiye"
        steps={turSteps}
        stepLabels={['Lenders', 'Yıldız/Ülker', 'Over time', 'Abroad']}
        onStep={() => setTurView(null)}
        graphic={(step) => {
          const v = turView ?? stepView(step)
          return (
          <ChartFrame
            title={TUR_TITLES[v][0]}
            sub={TUR_TITLES[v][1]}
            summary={`Türkiye received ${c.turkiye.deals} Tier 1 deals worth ${usdM(c.turkiye.usd_m)}: EBRD ${c.turkiye.by_lender.EBRD} deals, IFC ${c.turkiye.by_lender.IFC}. Yıldız/Ülker received ${usdM(c.turkiye.yildiz_in_tur)} in Türkiye.`}
            table={{
              head: ['Year', 'Lender', 'Company', 'Parent group', 'US$m'],
              rows: [...tur].sort((a, b) => (a.year ?? 0) - (b.year ?? 0)).map((d) => [d.year ?? '', d.lender, d.company ?? '', parentName(d.parent), (d.t1 ?? 0).toFixed(1)]),
            }}
            explore={{ to: exploreHref({ iso3s: ['TUR'] }), label: 'Explore Türkiye’s deals' }}
            source="Commitments, US$m at 2024 prices. Regulation: H4-core events. “Sells abroad” labels are company-reported context, not thesis data."
          >
            <div className="a567-takeaway">
              <span className="a567-takeaway-num">{pct(yTotal / turTotal, 0)}</span>
              <span>
                <strong>Yıldız/Ülker alone took {usdM(yTotal)}</strong>, {pct(yTotal / turTotal, 0)} of all Tier 1 money in Türkiye. The EBRD supplied{' '}
                {pct(ebrdTotal / turTotal, 0)} of the country total, in {c.turkiye.by_lender.EBRD} of {c.turkiye.deals} deals.
              </span>
            </div>
            <div className="a567-viewbar">
              <Toggle
                label="Türkiye chart view"
                value={v}
                onChange={(x) => setTurView(x)}
                options={[
                  { value: 'lenders', label: 'By lender' },
                  { value: 'firms', label: 'By firm' },
                  { value: 'time', label: 'Over time' },
                ]}
              />
            </div>
            <div className="a567-legend">
              <span><i style={{ background: lenderColor.EBRD }} />EBRD</span>
              <span><i style={{ background: lenderColor.IFC }} />IFC</span>
              {v === 'time' && (
                <>
                  <span><i style={{ background: '#0F6E6E', borderRadius: 2 }} />Binding</span>
                  <span><i style={{ background: '#9ED3CF', borderRadius: 2 }} />Voluntary</span>
                </>
              )}
            </div>
            <TurkiyeFlow
              deals={tur}
              regulation={turReg}
              view={v}
              highlight={!turView && step === 1 ? YILDIZ : null}
              showAbroad={!turView && step >= 3}
              regionalCci={cci}
            />
          </ChartFrame>
          )
        }}
      />

      {/* ------------------------------------------------------- Mexico */}
      <div className="a567-case-head" style={{ marginTop: '10vh' }}>
        <div className="a567-case-no" aria-hidden="true">
          II
        </div>
        <div>
          <span className="a567-rule-tag">Rule: funded firms litigated against rules in force</span>
          <h3 style={{ marginBottom: '0.3rem' }}>Mexico: lending alongside litigation</h3>
          <p className="muted" style={{ margin: 0 }}>
            One axis, three records: what the state required, what public lenders financed, and who sued.
          </p>
        </div>
      </div>
      <ScrollStory
        id="act-6-mexico"
        side="right"
        steps={mexSteps}
        stepLabels={['Rules', 'Money', 'Lawsuits', 'Both']}
        onStep={() => setMexStage(null)}
        graphic={(step) => {
          const st = mexStage ?? step
          return (
          <ChartFrame
            title="Mexico: regulation, public money and lawsuits, 2010–2025"
            sub="Money in US$m at 2024 prices; each square is one lawsuit, by year filed"
            summary={`Mexico: binding rules from 2014 and warning labels from 2020. Public money to food manufacturers includes ${usdM(naturasol)} core Tier 1 to Naturasol and supply-chain finance to ${sc.map((d) => parentName(d.parent)).join(' and ')}. ${c.mexico_lawsuits} lawsuits against health rules, ${labels2020} filed in 2020. Funded litigants: ${litigants.map(parentName).join(', ')}.`}
            table={{
              head: ['Year filed', 'Lawsuits', 'of which funded litigants'],
              rows: Array.from(d3.rollup(mexLaw, (v) => [v.length, v.filter((l) => litigants.includes(l.parent ?? '')).length], (l) => l.filed ?? 0))
                .sort((a, b) => a[0] - b[0])
                .map(([y, [n, f]]) => [y, n, f]),
            }}
            explore={{ to: exploreHref({ iso3s: ['MEX'], scope: 'food' }), label: 'Explore Mexico’s deals' }}
            source="Lawsuits: Lighthouse Reports (public dataset). Regulation: H4-core events. Dashed circles = supply-chain finance, a separate measure."
          >
            <div className="a567-viewbar">
              <Toggle
                label="Mexico chart layers"
                value={st}
                onChange={(x) => setMexStage(x)}
                options={[
                  { value: 0, label: phone ? 'Rules' : 'Rules only' },
                  { value: 1, label: phone ? '+ Money' : '+ Public money' },
                  { value: 2, label: '+ Lawsuits' },
                  { value: 3, label: phone ? 'Litigants' : 'Funded litigants' },
                ]}
              />
            </div>
            <div className="a567-legend">
              <span><i style={{ background: lenderColor['IDB Invest'] }} />IDB Invest</span>
              <span><i style={{ background: lenderColor.IFC }} />IFC</span>
              <span><i style={{ background: '#A4483A' }} />Lawsuit, parent identified</span>
              <span><i style={{ background: '#9AA0A6' }} />Lawsuit, other plaintiff</span>
              {st >= 3 && <span><i style={{ background: '#B05A2B' }} />Funded litigant</span>}
            </div>
            <MexicoTimeline deals={mex} regulation={mexReg} lawsuits={mexLaw} stage={st} fundedLitigants={litigants} />
          </ChartFrame>
          )
        }}
      />
      <div className="container" style={{ maxWidth: 900, marginTop: '4vh' }}>
        <div className="a567-dossier">
          <div className="kicker" style={{ color: '#E9B48F' }}>Case file · Mexico</div>
          <dl>
            <dt>Rules in force</dt>
            <dd>Sugary-drink and HFSS food taxes (2014); children’s TV ad limits (2014); warning octagons (2020); trans-fat limit (2023)</dd>
            <dt>Public money</dt>
            <dd>
              Naturasol {usdM(naturasol)} core Tier 1 (IDB Invest, IFC); supply-chain finance {sc.map((d) => `${parentName(d.parent)} ${usdM(d.amount, 1)} (${d.lender}, ${d.year})`).join('; ')}
            </dd>
            <dt>Lawsuits</dt>
            <dd>
              {c.mexico_lawsuits} of {c.lawsuits_total} in the Lighthouse Reports dataset are Mexican; {labels2020} filed in 2020
            </dd>
            <dt>Funded litigants</dt>
            <dd>{litigants.map((p) => `${parentName(p)}: ${litCount(p)} case${litCount(p) === 1 ? '' : 's'}`).join('; ')}</dd>
          </dl>
        </div>
      </div>
      <ActEnd to={exploreHref({ iso3s: ['MEX', 'TUR'], scope: 'food' })} label="Explore this: Türkiye and Mexico deals" />
    </section>
  )
}
