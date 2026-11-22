/** Act 3 · "Tobacco took a policy. UPF has none." */
import { motion as m } from 'framer-motion'
import { useInView, useReducedMotion } from '../lib/hooks'

const EVENTS = [
  { year: '1991', text: 'World Bank adopts a tobacco policy: no lending for tobacco production or processing.' },
  { year: '1999', text: <><em>Curbing the Epidemic</em>: the World Bank makes the economic case for tobacco control.</> },
  { year: '2007', text: 'IFC Exclusion List names tobacco among the activities IFC will not finance.' },
  { year: '2009', text: 'IFC halts palm-oil lending after the Wilmar complaint: a moratorium on a whole sector.' },
  { year: '2010', text: 'Norway’s sovereign fund (GPFG) excludes tobacco producers.' },
  { year: 'Today', text: 'No public lender screens ultra-processed food.', empty: true },
]

export function TobaccoTimeline() {
  const reduce = useReducedMotion()
  const [ref, seen] = useInView<HTMLDivElement>(0.3)
  return (
    <div className="tl" ref={ref} role="list" aria-label="Timeline of health screens in development finance">
      <m.div
        className="tl-progress"
        aria-hidden="true"
        initial={reduce ? false : { scaleX: 0, scaleY: 0 }}
        animate={seen ? { scaleX: 1, scaleY: 1 } : {}}
        transition={{ duration: reduce ? 0 : 2.2, ease: [0.22, 0.61, 0.36, 1] }}
        style={{ right: 'calc(100% / 6 * 1 - 18px)' }}
      />
      {EVENTS.map((e, i) => (
        <m.div
          key={e.year}
          role="listitem"
          className={`tl-item ${e.empty ? 'empty' : ''}`}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={seen ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : 0.25 + i * 0.35 }}
        >
          <div className="tl-dot" aria-hidden="true" />
          <div className="tl-year">{e.year}</div>
          <div className="tl-text">{e.text}</div>
        </m.div>
      ))}
    </div>
  )
}
