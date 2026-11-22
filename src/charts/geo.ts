/**
 * World geometry: Natural Earth 1:110m via world-atlas, bundled locally
 * (no tile server, no API key). Equal Earth projection everywhere.
 */
import type { FeatureCollection, Geometry, MultiLineString } from 'geojson'
import { useEffect, useState } from 'react'
import { feature, mesh } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'

export interface CountryFeature {
  type: 'Feature'
  id: string // ISO 3166-1 numeric, zero-padded string ("792" = Türkiye)
  properties: { name: string }
  geometry: Geometry
}

export interface World {
  countries: CountryFeature[]
  borders: MultiLineString
  land: FeatureCollection
}

let cache: Promise<World> | null = null

export function loadWorld(): Promise<World> {
  if (!cache) {
    cache = import('world-atlas/countries-110m.json').then((m) => {
      const topo = (m.default ?? m) as unknown as Topology<{ countries: GeometryCollection<{ name: string }>; land: GeometryCollection }>
      const fc = feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>
      return {
        countries: fc.features.map((f) => ({ ...f, id: String(f.id ?? '') })) as CountryFeature[],
        borders: mesh(topo, topo.objects.countries, (a, b) => a !== b) as MultiLineString,
        land: feature(topo, topo.objects.land) as unknown as FeatureCollection,
      }
    })
  }
  return cache
}

export function useWorld(): World | null {
  const [w, setW] = useState<World | null>(null)
  useEffect(() => {
    let alive = true
    loadWorld().then((x) => alive && setW(x))
    return () => {
      alive = false
    }
  }, [])
  return w
}

/** Countries too small for the 110m map: approximate centroids [lon, lat] for dot fallbacks. */
export const SMALL_COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  MUS: [57.55, -20.25],
  SGP: [103.82, 1.35],
  BHR: [50.55, 26.07],
  MLT: [14.4, 35.9],
  CPV: [-23.6, 15.1],
  MDV: [73.2, 3.2],
  HKG: [114.17, 22.32],
  LUX: [6.13, 49.61],
  BRB: [-59.55, 13.17],
  AND: [1.52, 42.5],
  XKX: [20.9, 42.6],
  MNE: [19.3, 42.7],
  MKD: [21.7, 41.6],
  PSE: [35.2, 31.9],
  WSM: [-172.1, -13.8],
  TON: [-175.2, -21.2],
  KIR: [-157.4, 1.87],
  STP: [6.6, 0.3],
  COM: [43.3, -11.7],
  SYC: [55.5, -4.6],
  LCA: [-60.98, 13.9],
  GRD: [-61.68, 12.12],
  VCT: [-61.2, 13.25],
  DMA: [-61.37, 15.42],
  ATG: [-61.8, 17.07],
  KNA: [-62.75, 17.33],
  TUV: [179.2, -8.5],
  NRU: [166.9, -0.52],
  MHL: [171.2, 7.1],
  FSM: [158.2, 6.9],
  PLW: [134.6, 7.5],
}
