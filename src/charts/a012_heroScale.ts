import { scaleSqrt } from 'd3'

/** Radius scale shared by the hero map and its key so sample dots match. */
export function heroRadius(width: number, maxUsd: number) {
  return scaleSqrt()
    .domain([0, maxUsd])
    .range([2, Math.max(8, Math.min(19, width / 75))])
}
