/**
 * Act 5 · The conflict defined. Shareholder governments regulate UPF firms
 * with one hand and, through the development banks they own, finance them
 * with the other. Paths draw themselves once in view.
 */
import { motion as m } from 'framer-motion'
import { useInView, useReducedMotion } from '../lib/hooks'

export function ConflictDiagram() {
  const [ref, seen] = useInView<HTMLDivElement>(0.2)
  const reduce = useReducedMotion()
  const go = seen || reduce
  const draw = (delay: number) => ({
    initial: { pathLength: reduce ? 1 : 0, opacity: reduce ? 1 : 0 },
    animate: go ? { pathLength: 1, opacity: 1 } : {},
    transition: { duration: reduce ? 0 : 0.8, delay: reduce ? 0 : delay, ease: [0.22, 0.61, 0.36, 1] as [number, number, number, number] },
  })
  const fade = (delay: number) => ({
    initial: { opacity: reduce ? 1 : 0, y: reduce ? 0 : 6 },
    animate: go ? { opacity: 1, y: 0 } : {},
    transition: { duration: reduce ? 0 : 0.6, delay: reduce ? 0 : delay },
  })
  return (
    <div ref={ref} style={{ width: '100%', maxWidth: 760, margin: '0 auto' }}>
      <svg viewBox="0 0 760 330" width="100%" role="img" aria-label="Diagram: shareholder governments regulate UPF firms; the same governments own development banks, which finance those firms.">
        <defs>
          <marker id="a567-arrow-teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#0F6E6E" />
          </marker>
          <marker id="a567-arrow-copper" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#B05A2B" />
          </marker>
        </defs>
        {/* governments */}
        <m.g {...fade(0.0)}>
          <rect x={20} y={125} width={190} height={80} rx={8} fill="#1F3864" />
          <text x={115} y={158} textAnchor="middle" fill="#F7F5F1" fontSize={15} fontWeight={700}>
            Shareholder
          </text>
          <text x={115} y={178} textAnchor="middle" fill="#F7F5F1" fontSize={15} fontWeight={700}>
            governments
          </text>
        </m.g>
        {/* firms */}
        <m.g {...fade(0.11)}>
          <rect x={550} y={125} width={190} height={80} rx={8} fill="#FFFDF9" stroke="#14213D" />
          <text x={645} y={158} textAnchor="middle" fill="#14213D" fontSize={15} fontWeight={700}>
            UPF manufacturers
          </text>
          <text x={645} y={178} textAnchor="middle" fill="#5E6472" fontSize={12}>
            82 funded parent groups
          </text>
        </m.g>
        {/* banks */}
        <m.g {...fade(0.5)}>
          <rect x={285} y={238} width={190} height={70} rx={8} fill="#F3E4D8" stroke="#B05A2B" />
          <text x={380} y={266} textAnchor="middle" fill="#14213D" fontSize={14} fontWeight={700}>
            Development banks
          </text>
          <text x={380} y={286} textAnchor="middle" fill="#5E6472" fontSize={11.5}>
            IFC · EBRD · EIB · IDB Invest
          </text>
        </m.g>
        {/* regulate (upper arc) */}
        <m.path d="M 160 120 C 260 62, 500 62, 600 120" fill="none" stroke="#0F6E6E" strokeWidth={3} markerEnd="url(#a567-arrow-teal)" {...draw(0.22)} />
        <m.g {...fade(0.61)}>
          <text x={380} y={30} textAnchor="middle" fontSize={15} fontWeight={700} fill="#0F6E6E">
            regulate
          </text>
          <text x={380} y={48} textAnchor="middle" fontSize={11.5} fill="#5E6472">
            sugary-drink taxes, warning labels, marketing limits
          </text>
        </m.g>
        {/* own */}
        <m.path d="M 150 210 C 170 265, 220 273, 280 273" fill="none" stroke="#1F3864" strokeWidth={2.5} markerEnd="url(#a567-arrow-teal)" {...draw(0.5)} style={{ stroke: '#1F3864' }} />
        <m.g {...fade(0.77)}>
          <text x={192} y={300} textAnchor="middle" fontSize={13} fontWeight={650} fill="#1F3864">
            own
          </text>
        </m.g>
        {/* finance */}
        <m.path d="M 478 273 C 540 273, 590 265, 615 212" fill="none" stroke="#B05A2B" strokeWidth={3.5} markerEnd="url(#a567-arrow-copper)" {...draw(0.77)} />
        <m.g {...fade(1.04)}>
          <text x={580} y={300} textAnchor="middle" fontSize={15} fontWeight={700} fill="#9A4A1F">
            finance
          </text>
        </m.g>
      </svg>
      <p className="small muted" style={{ textAlign: 'center', marginTop: '0.5rem' }}>
        WHO’s framework for managing conflicts of interest in nutrition policy (EB142/23, 2018) is written for governments engaging with
        industry; the thesis applies it <em>by analogy</em> to governments’ development banks.
      </p>
    </div>
  )
}
