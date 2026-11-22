import { ExclusionMatrix, XM_COLS, shortInstitution, type XmKey } from '../charts/a34_ExclusionMatrix'
import { ScreenSim } from '../charts/a34_ScreenSim'
import { TobaccoTimeline } from '../charts/a34_TobaccoTimeline'
import { Info } from '../components/Info'
import { ScrollStory } from '../components/ScrollStory'
import { ActEnd, ChartFrame } from '../components/ui'
import { exploreHref } from '../lib/aggregate'
import type { SiteData } from '../lib/data'
import { useIsPhone } from '../lib/hooks'
import './a34.css'

/** Act 3 · H2: the institutional blind spot. */
export default function Act3BlindSpot({ data }: { data: SiteData }) {
  const rows = data.exclusion
  const phone = useIsPhone()
  const lenders = rows.filter((r) => r.kind === 'lender')
  const n = (k: XmKey) => lenders.filter((r) => r[k] === 1).length

  // step → [columns revealed, show comparators, focus column]
  const plan: [number, boolean, XmKey | null][] = [
    [0, false, null],
    [1, false, 'excludes_tobacco'],
    [3, false, null],
    [4, false, 'excludes_UPF_or_unhealthy_food'],
    [7, false, null],
    [7, true, null],
  ]

  const steps = [
    <p key="0">
      Every public lender publishes an <strong>exclusion list</strong>: activities it will not finance, whatever the return. We read the
      current list of ten lenders, word by word.
    </p>,
    <p key="1">
      <strong>Tobacco: {n('excludes_tobacco')} of 10.</strong> Every list names it. A health harm became a line no lender crosses.
      <Info id="h2_lists" />
    </p>,
    <p key="2">
      Most also name alcohol ({n('excludes_alcohol')} of 10) and weapons ({n('excludes_weapons')} of 10). Exclusion is a normal,
      well-used tool.
    </p>,
    <p key="3">
      <strong>Ultra-processed or unhealthy food: {n('excludes_UPF_or_unhealthy_food')} of 10.</strong> The column stays empty for every
      lender.
    </p>,
    <p key="4">
      None names sugary drinks. None refers to the WHO Code on breast-milk substitutes. None applies nutrition criteria.
    </p>,
    <p key="5">
      Yet a screen already exists. The <strong>ATNi</strong> investor guides set out nutrition criteria for exactly this kind of lending.
      The gap is a choice, not a technical limit.
    </p>,
  ]

  return (
    <section className="act" id="act-3" aria-labelledby="act-3-title">
      <div className="act-header">
        <span className="act-num">Act 3 · Hypothesis 2</span>
        <h2 id="act-3-title">The institutional blind spot</h2>
        <p className="lede">Public lenders already refuse to finance some health harms. Ultra-processed food is not one of them.</p>
      </div>

      <ScrollStory
        id="act-3-matrix"
        steps={steps}
        graphic={(step) => {
          const [cols, comp, focus] = plan[Math.min(step, plan.length - 1)]
          return (
            <ChartFrame
              title="What public lenders refuse to finance"
              sub={phone ? undefined : 'Products named on each lender’s current exclusion list. Click any cell for the source document.'}
              summary={`Of 10 lender exclusion lists, ${n('excludes_tobacco')} name tobacco, ${n('excludes_alcohol')} alcohol, ${n('excludes_weapons')} weapons, and ${n('excludes_UPF_or_unhealthy_food')} name ultra-processed or unhealthy food. The two ATNi benchmark documents include nutrition criteria.`}
              table={{
                head: ['List', ...XM_COLS.map((c) => c.short), 'Version'],
                rows: rows.map((r) => [
                  shortInstitution(r.institution),
                  ...XM_COLS.map((c) => (r[c.key] === 1 ? 'Yes' : r[c.key] === 0 ? 'No' : 'n/a')),
                  r.version,
                ]),
              }}
              source="Lists downloaded 15 Nov 2026 (sheet H3_Exclusion_Lists). Keyword search, then read by hand."
            >
              <ExclusionMatrix rows={rows} revealCols={cols} showComparators={comp} focus={focus} />
            </ChartFrame>
          )
        }}
      />

      <div className="a34-block">
        <div className="a34-block-head">
          <div className="kicker">A precedent</div>
          <h3 className="a34-subhead">Tobacco took a policy. UPF has none.</h3>
          <p>
            The World Bank Group moved on tobacco in steps: a lending policy, an economic case, an exclusion list. Each step is a model for
            what a UPF screen could look like.
          </p>
        </div>
        <TobaccoTimeline />
      </div>

      <div className="a34-block">
        <div className="a34-block-head">
          <div className="kicker">Try it</div>
          <h3 className="a34-subhead">What would a tobacco-style screen have caught?</h3>
          <p>
            Apply the screen the lenders already use for tobacco to ultra-processed food manufacturers. Choose the threshold, the year it
            starts and the lenders.
          </p>
        </div>
        <ScreenSim deals={data.deals} />
      </div>

      <ActEnd to={exploreHref({ bands: ['A'] })} label="Explore this: band A deals" />
    </section>
  )
}
