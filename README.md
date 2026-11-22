# Funding What We Regulate: interactive data story

An interactive companion to India Clarke's NYU Center for Global Affairs MS thesis, *Funding What We Regulate: public money, corporate power and the ultra-processed food (UPF) transition*. It has three parts:

- **Story** (`/`): an eight-act scrollytelling piece (H1 to H4, the case studies and the limitations).
- **Explorer** (`/explore`): every food-manufacturing deal, with linked views, a URL-encoded filter bar, CSV download and "cite this view".
- **Extras**: country and firm profiles, a "follow the money" Sankey, a scenario explorer (labelled *not part of the thesis analysis*), a methods page and a presentation mode (`?present=1`).

Built with Vite, React, TypeScript, D3, Scrollama and Framer Motion. Maps use d3-geo with Natural Earth (world-atlas), bundled locally, so there is no tile server and no API key.

## Rebuild after the data changes

The site reads only the Stata-built files. Nothing in `../Data` is ever written.

```sh
# one-off setup
python3 -m venv .venv && .venv/bin/pip install -r pipeline/requirements.txt
npm install

# 1. re-run the Stata master do-file (Part A builds Data/Stata/data/*.dta)
# 2. export public JSON, assert every thesis number and run the licence scan
npm run data          # = export_site_data.py && check_numbers.py
# 3. build the static site (runs `npm run data` first and fails if any check fails)
npm run build
npm run preview       # http://localhost:4173
```

`npm run data` **fails the build** if any canonical number is off by more than ±0.1 (US$m), ±0.1 pp (shares), or if a licensed column, file or phrase appears in `public/`. Do not fix a failure by editing data. Record it in `DATA_QUESTIONS.md`.

Other scripts: `npm test` (Vitest: the front-end aggregation reproduces the thesis numbers from `deals.json`), `npm run e2e` (Playwright smoke and axe-core tests), `npm run dev`.

## Live site and deployment

The site deploys to GitHub Pages automatically on every push to `main` (`.github/workflows/pages.yml`). CI cannot re-export the data, because the raw Stata files are not in this repo. It does re-run `check_numbers.py` (all canonical numbers and the licence scan) against the committed JSON, runs the unit tests, builds, and deploys. Run `npm run data` locally before committing new data.

Lighthouse: `npm run build:site && npx vite preview --port 4173`, then `sh scripts/lighthouse.sh` (reports go to `lighthouse-reports/`, git-ignored). Accessibility: `npm run e2e` (Playwright and axe on every route).

## What is public and what is not

| Published (`public/data/`) | Never published |
|---|---|
| `deals.json`: 663 food-manufacturing deals; whitelisted columns; `reason` sanitised | Euromonitor values (`em_marketsize_*`, `h5_core_upf`, `country_groups` UPF columns) |
| `countries.json`, `country_year.json`: lender money, WDI population, income groups, regulation years | Row-level H1 list-match flags (`h1_list_match_*`) |
| `regulation.json`: H4-core regulation events | `notes`, `parent_assign_note`, `em_unresolved` |
| `firms.json`, `lawsuits.json`: COI grades and evidence links; Lighthouse Reports cases | ATNi row-level data, PitchBook |
| `exclusion_lists.json`, `did.json`, `results.json`, `meta.json` | |

## Where every number comes from

| Number on the site | Value | Source |
|---|---|---|
| Core Tier 1 money | at least US$6,432.6m | do-file §1 |
| Tier 1 deals | 153 (151 core + 2 supply-chain) | do-file §1, D001 |
| Supply-chain Tier 1 | US$135.3m (separate) | D001 |
| By lender | IFC 2,501.3; EBRD 2,428.9; EIB 1,116.9; IDB Invest 385.5 | do-file §1b |
| By period | 2010–13 1,070.3 (30) → 2022–25 2,212.9 (50) | do-file §1c |
| By income at approval | High 1,640.7; Middle 4,270.5; Low 96.8; regional 424.6 | do-file §1d |
| By income group 2010 | Middle 4,015.8 (67%); High 1,465.3 (24%); Low 526.8 (9%) | do-file §6b-ii/§7 |
| H1 measures 1 / 1b / 2 | 925.2 / 1,387.4 / 6,432.6 | H1_Measures (aggregated in the pipeline) |
| H1 gap | 6.95 pooled (4.64 with parents); IFC 4.9, EBRD 20.4, EIB 3.7, IDB n/a | do-file §2a |
| Intermediated share | IFC 52%, EBRD 56%, EIB 29%, IDB Invest 25% | H1_Intermediated |
| Top parents | Coca-Cola 1,027.7 (16.0%); Yıldız/Ülker 681.5; PRAN-RFL 382.3; top 5 41.3%; top 10 60.4% | do-file §2c |
| Top countries | Türkiye 1,027.9; Egypt 426.1; Bangladesh 403.5; Serbia 342.8; Poland 330.9 | do-file §2c |
| H2 exclusion lists | 10/10 name tobacco; 0/10 name UPF | H3_Exclusion_Lists |
| Screen simulator | 6,432.6 at 20%; about 4,270 at 50% | band split of Tier 1 deals |
| H3 DiD | +1.221, SE 0.951, p = 0.205, 95% CI −0.69 to 3.13, N = 104 | do-file §4c, D066 (hand-entered) |
| H3 robustness | log GDP +1.292 (p 0.183, N 102); levels −465.6 (p 0.451) | do-file §4d (hand-entered) |
| Binding share | 52% (76 of 146) | Methods v7; see DATA_QUESTIONS Q1 |
| H4 COI share | 42.8% (32.2% without Yıldız); nine groups 2,754.2 | do-file §6 |
| Validation | κ role 0.51; UPF 0.35 (0.55 without "Unsure") | do-file §9 (hand-entered) |
| Türkiye box | 20 deals, 1,027.9; Yıldız/Ülker 625.6 | do-file §8 |

Every headline number on the site has an ⓘ provenance tooltip (`src/lib/provenance.ts`) that gives the dataset, filter, do-file section, decision ID and caveat.

## Layout

```
pipeline/    export_site_data.py, check_numbers.py, requirements.txt
public/data/ generated, public-safe JSON
src/story/   Act0Hero … Act7Close (scroll story)
src/explore/ filter bar, linked views, deal table, Ask-the-data chips
src/charts/  reusable D3 components
src/pages/   Methods, Scenarios, Country, Firm, Present
src/lib/     aggregate.ts, data.ts, format.ts, provenance.ts, tokens.ts
```
