import { BakerPanel, BandSorter, NovaStrip } from '../charts/a012_Context'
import { ActEnd } from '../components/ui'
import { exploreHref } from '../lib/aggregate'
import type { SiteData } from '../lib/data'
import './a012_acts.css'

/** Act 1 · What counts as ultra-processed (short context). */
export default function Act1Context({ data }: { data: SiteData }) {
  return (
    <section className="act" id="act-1" aria-labelledby="act-1-title">
      <div className="act-header">
        <span className="act-num">Act 1 · Context</span>
        <h2 id="act-1-title">What counts as ultra-processed</h2>
        <p className="lede">
          The thesis follows one kind of firm: manufacturers whose sales are mostly ultra-processed food. Three steps decide which deals count.
        </p>
      </div>

      <div className="a012-sub">
        <div className="kicker">1 · The food</div>
        <h3>Four groups of food, by how much they are processed</h3>
        <p className="muted" style={{ maxWidth: '44rem' }}>
          Click any group to see examples. Group 4 is the one linked to diet-related disease, and the one health regulation targets.
        </p>
        <NovaStrip />
      </div>

      <div className="a012-sub" style={{ marginTop: '9vh' }}>
        <div className="kicker">2 · The firm</div>
        <h3>How a borrower becomes “Tier 1”</h3>
        <p className="muted" style={{ maxWidth: '44rem' }}>
          Each deal was banded by the share of NOVA 4 products in the borrower’s sales. A manufacturer counts as Tier 1 when that share is at least
          20%. Watch four real deals being sorted.
        </p>
        <BandSorter data={data} />
      </div>

      <div className="a012-sub" style={{ marginTop: '9vh' }}>
        <div className="a012-two-col">
          <div>
            <div className="kicker">3 · The market</div>
            <h3>Rich countries eat the most. Middle-income markets are where it grows.</h3>
            <p>
              In 2019 people in high-income countries bought about eleven times more ultra-processed food than people in lower-middle-income
              countries. But sales grew fastest where they were lowest.
            </p>
            <p className="muted small">That is the market the money in this story flows into.</p>
          </div>
          <BakerPanel />
        </div>
      </div>
      <ActEnd to={exploreHref({ bands: ['A', 'B'] })} label="Explore the banded deals" />
    </section>
  )
}
