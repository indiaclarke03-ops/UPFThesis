import { motion as m } from 'framer-motion'
import { useState } from 'react'
import { CoiCards } from '../charts/a567_CoiCards'
import { ConflictDiagram } from '../charts/a567_ConflictDiagram'
import { GradeLadder, YILDIZ } from '../charts/a567_GradeLadder'
import { Info } from '../components/Info'
import { ScrollStory } from '../components/ScrollStory'
import { ActEnd, ChartFrame, Toggle } from '../components/ui'
import { exploreHref } from '../lib/aggregate'
import { parentName, type SiteData } from '../lib/data'
import { pct, usdBn, usdM } from '../lib/format'
import { useReducedMotion } from '../lib/hooks'
import { gradeColor, gradeLabel, motion } from '../lib/tokens'
import './a567_acts.css'

/** Act 5 · H4: the same firms (conflict of interest). */
export default function Act5Conflict({ data }: { data: SiteData }) {
  const c = data.results.computed
  const [noY, setNoY] = useState(false)
  const firms = data.firms
  const nine = firms.filter((f) => f.grade >= 2).sort((a, b) => b.t1 - a.t1)
  const g0 = firms.filter((f) => f.grade === 0)
  const yMoney = c.top_parents.find((p) => p.parent === YILDIZ)?.usd_m ?? 0

  const steps = [
    <p key="0">
      Each circle is one of the <strong>{c.n_parent_groups} parent groups</strong> that received Tier 1 money, sized by how much. Each was searched for evidence of
      opposing health regulation, then graded 0 to 3.
    </p>,
    <p key="1">
      For {g0.length} groups ({usdM(c.grade_money['0'], 0)}), <strong>no evidence was found</strong>. That is not proof of no obstruction: many are regional firms
      with a thinner public record.
    </p>,
    <p key="2">
      Nine groups are graded 2 or 3: documented lobbying, trade-association opposition or litigation against health rules. Together they received{' '}
      <strong>{usdM(data.results.h4_coi.nine_groups_usd_m)}</strong>
      <Info id="coi_nine" />.
    </p>,
    <p key="3">
      One grade needs care. <strong>Yıldız</strong> is graded 2 for its UK arm, pladis; its funded deals are mostly in Türkiye. Without it, the share falls from{' '}
      {pct(c.coi_share)} to <strong>{pct(c.coi_share_without_yildiz)}</strong>.
    </p>,
  ]

  return (
    <section className="act" id="act-5" aria-labelledby="act-5-title">
      <div className="act-header">
        <span className="act-num">Act 5 · Hypothesis 4</span>
        <h2 id="act-5-title">The same firms</h2>
        <p className="lede">
          Many of the firms that public lenders finance are also documented working against the health rules that those lenders’ shareholder governments adopt.
        </p>
      </div>

      <ScrollStory
        id="act-5-ladder"
        steps={steps}
        stepLabels={steps.length === 4 ? ['All groups', 'Grade 0', 'Grades 2–3', 'Yıldız'] : undefined}
        graphic={(step) => (
          <ChartFrame
            title="Funded parent groups, by evidence of opposing health regulation"
            sub="Circle size = core Tier 1 money, 2010–2025 (2024 US$). Hover or tap a circle."
            summary={`${c.n_parent_groups} funded parent groups on a 0–3 grade ladder. Grade 0 (no evidence found): ${c.grade_n['0']} groups, ${usdM(c.grade_money['0'])}. Grade 2: ${c.grade_n['2']} groups, ${usdM(c.grade_money['2'])}. Grade 3: ${c.grade_n['3']} groups, ${usdM(c.grade_money['3'])}. Share to groups graded 2 or 3: ${pct(c.coi_share)}; ${pct(c.coi_share_without_yildiz)} without Yıldız.`}
            table={{
              head: ['Parent group', 'Grade', 'Tier 1 US$m', 'Deals', 'Lawsuits'],
              rows: firms.map((f) => [parentName(f.parent), `${f.grade}: ${gradeLabel[f.grade]}`, f.t1.toFixed(1), f.n_t1, f.n_lawsuits]),
            }}
            explore={{ to: exploreHref({ grades: [2, 3] }), label: 'Explore deals to groups graded 2–3' }}
            source="Grades: thesis coding of interest-group, trade-association, lobbying and litigation evidence (litigation: Lighthouse Reports)."
          >
            <ShareBar total={c.t1_core_usd_m} coi={c.coi_share} noY={c.coi_share_without_yildiz} emphasiseNoY={step >= 3} />
            <GradeLadder firms={firms} focus={step >= 3 ? 'yildiz' : step === 2 ? 'coi' : 'all'} withoutYildiz={step >= 3} />
          </ChartFrame>
        )}
      />

      {/* headline + nine cards */}
      <div className="container" style={{ marginTop: '6vh' }}>
        <div className="a567-headline">
          <div>
            <div className="kicker">The headline, with its sensitivity</div>
            <p className="a567-big serif">
              <span className={noY ? 'a567-faded' : ''}>
                <span className="num">{pct(c.coi_share)}</span>
              </span>
              <span className="a567-slash"> / </span>
              <span className={noY ? '' : 'a567-faded'}>
                <span className="num">{pct(c.coi_share_without_yildiz)}</span>
              </span>
              <Info id="coi_share" />
            </p>
            <p className="lede" style={{ maxWidth: 640 }}>
              of Tier 1 money went to groups documented as lobbying against or litigating over health regulation: {pct(c.coi_share)} counting all nine groups,{' '}
              {pct(c.coi_share_without_yildiz)} without Yıldız.
            </p>
          </div>
          <div style={{ maxWidth: 380 }}>
            <Toggle
              label="Count Yıldız Holding"
              value={noY ? 'no' : 'yes'}
              onChange={(v) => setNoY(v === 'no')}
              options={[
                { value: 'yes', label: 'All nine groups' },
                { value: 'no', label: 'Without Yıldız' },
              ]}
            />
            <p className="small muted" style={{ marginTop: '0.6rem' }} aria-live="polite">
              {noY
                ? `Yıldız’s grade rests on evidence about its UK arm, pladis, while its ${usdM(yMoney, 0)} in Tier 1 deals went mostly to Türkiye, where no evidence was found. Dropping it gives ${pct(c.coi_share_without_yildiz)}.`
                : `Grades are given at parent-group level, as designed: ${pct(c.coi_share)}. The sensitivity figure, ${pct(c.coi_share_without_yildiz)}, drops the one group whose evidence comes from a different market than its deals.`}
            </p>
          </div>
        </div>

        <h3 style={{ marginTop: '3rem' }}>
          The nine groups graded 2 or 3 <span className="muted" style={{ fontWeight: 400 }}>· {usdM(data.results.h4_coi.nine_groups_usd_m)} in total</span>
        </h3>
        <p className="small muted" style={{ maxWidth: 680 }}>
          Grade 3 = a party to litigation against health regulation; grade 2 = documented lobbying or trade-association opposition. Each card describes a public
          lender’s commitment as what it is, not as wrongdoing.
        </p>
        <CoiCards firms={nine} withoutYildiz={noY} />
      </div>

      {/* the conflict */}
      <div className="narrow" style={{ marginTop: '10vh' }}>
        <div className="kicker">The conflict, defined</div>
        <h3>One shareholder, two roles</h3>
        <p>
          The governments that own the development banks are the same governments that tax sugary drinks and require warning labels. With one hand they regulate these
          firms; through their banks, they finance them.
        </p>
      </div>
      <div className="container">
        <ConflictDiagram />
      </div>
      <ActEnd to={exploreHref({ grades: [2, 3] })} label="Explore this: deals to groups graded 2–3" />
    </section>
  )
}

/** Stacked bar of all Tier 1 money: graded 2–3 without Yıldız, plus Yıldız, plus the rest. Both shares always labelled. */
function ShareBar({ total, coi, noY, emphasiseNoY }: { total: number; coi: number; noY: number; emphasiseNoY: boolean }) {
  const reduce = useReducedMotion()
  const yShare = coi - noY
  const t = { duration: reduce ? 0 : motion.base / 1000, ease: motion.ease }
  return (
    <div className="a567-sharebar" aria-hidden="true">
      <div className="a567-sharebar-track">
        <m.div className="seg" style={{ background: gradeColor[2] }} initial={{ width: 0 }} animate={{ width: `${noY * 100}%` }} transition={t} />
        <m.div
          className="seg"
          style={{
            background: emphasiseNoY ? 'repeating-linear-gradient(135deg,#FFFDF9 0 3px,#A4483A 3px 6px)' : gradeColor[2],
            borderLeft: '1px solid #FFFDF9',
          }}
          initial={{ width: 0 }}
          animate={{ width: `${yShare * 100}%` }}
          transition={t}
        />
        <div className="seg" style={{ flex: 1 }} />
      </div>
      <div className="a567-sharebar-labels small">
        <span>
          <b className="num" style={{ opacity: emphasiseNoY ? 0.55 : 1 }}>{pct(coi)}</b> to groups graded 2–3 ·{' '}
          <b className="num" style={{ opacity: emphasiseNoY ? 1 : 0.7 }}>{pct(noY)}</b> without Yıldız{emphasiseNoY ? " (Yıldız hatched)" : ""}
        </span>
        <span className="muted">of {usdBn(total)}</span>
      </div>
    </div>
  )
}
