import { animate } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../lib/hooks'

/** A number that eases to each new value (for live recomputation). */
export function useTween(value: number, duration = 0.6): number {
  const reduce = useReducedMotion()
  const [v, setV] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    if (reduce) {
      setV(value)
      from.current = value
      return
    }
    const c = animate(from.current, value, {
      duration,
      ease: [0.22, 0.61, 0.36, 1],
      onUpdate: (x) => {
        from.current = x
        setV(x)
      },
    })
    return () => c.stop()
  }, [value, duration, reduce])
  return v
}

export const DOMAIN_COLOR: Record<string, string> = {
  'Sugary drink tax': '#0F6E6E',
  'Front-of-pack label': '#3B6EA5',
  'Marketing to children': '#7A5C99',
  'Salt / sodium limits': '#8C8C3A',
  'Trans-fat limit': '#B07A2B',
  'Unhealthy food / UPF tax': '#A4483A',
}
export const DOMAINS = Object.keys(DOMAIN_COLOR)
