"""Export public-safe JSON for the "Funding What We Regulate" website.

Reads the Stata-built files in Data/Stata/data and the typed sources in
Data/Stata/source (READ-ONLY) and writes small JSON files to
Website/public/data/.

Rules enforced here (see Website/README.md):
  * Licensed data never leaves: no Euromonitor values, no ATNi row-level data,
    no PitchBook, no row-level H1 list-match flags. Only H1 *aggregates*.
  * Free text is sanitised: `notes` and `parent_assign_note` are never
    exported; `reason` / `evidence_notes` are replaced if they mention
    licensed sources or market shares.
  * The site never runs its own statistics: regression results are
    hand-entered from the Stata output in results.json.
"""
from __future__ import annotations

import json
import math
import re
import sys
from datetime import date
from pathlib import Path

import pandas as pd
import pycountry

ROOT = Path(__file__).resolve().parents[2]  # ~/Desktop/Thesis
STATA = ROOT / "Data" / "Stata"
MASTER = ROOT / "Data" / "Processed" / "UPF_Thesis_Master_Dataset_2026-11-18.xlsx"
OUT = Path(__file__).resolve().parents[1] / "public" / "data"

LICENSED_RE = re.compile(r"euromonitor|\bEM\b|share|%|ATNi|pitchbook", re.I)
REDACTED = "Coded from licensed market-share data (value not shown); see Methods."

LENDERS = ["IFC", "EBRD", "EIB", "IDB Invest"]

# ISO3 codes that pycountry does not know (World Bank specials)
ISO_NUM_EXTRA = {"XKX": "-99", "CHI": None}


def r1(x):
    return None if x is None or (isinstance(x, float) and math.isnan(x)) else round(float(x), 1)


def rnd(x, n):
    return round(float(x), n)


def r3(x):
    return None if x is None or (isinstance(x, float) and math.isnan(x)) else round(float(x), 3)


def clean(v):
    """JSON-safe scalar."""
    if v is None:
        return None
    if isinstance(v, float):
        if math.isnan(v):
            return None
        return v
    if hasattr(v, "item"):
        return clean(v.item())
    if isinstance(v, str):
        v = v.strip()
        return v if v else None
    return v


def sanitise(text):
    t = clean(text)
    if t is None:
        return None
    return REDACTED if LICENSED_RE.search(t) else t


INTERNAL_RE = re.compile(r"\bIndia\b|\bfor me\b|would not load|to check the page|flag cleared|\(values in [A-Z]/[A-Z]\)", re.I)


def sanitise_evidence(text):
    """Evidence notes: drop internal workflow notes (after ' | ', or sentences
    addressed to the researcher), then apply the licence rule."""
    t = clean(text)
    if t is None:
        return None
    t = t.split(" | ")[0]
    sentences = re.split(r"(?<=[.;])\s+", t)
    t = " ".join(x for x in sentences if not INTERNAL_RE.search(x)).strip()
    if not t:
        return None
    return "Evidence note withheld: it refers to licensed market data." if LICENSED_RE.search(t) else t


def slugify(s: str) -> str:
    s = (s.lower().replace("ı", "i").replace("ü", "u").replace("ö", "o").replace("ç", "c")
         .replace("ş", "s").replace("ğ", "g").replace("é", "e").replace("ã", "a").replace("ñ", "n"))
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def iso_numeric(iso3: str):
    if iso3 in ISO_NUM_EXTRA:
        return ISO_NUM_EXTRA[iso3]
    c = pycountry.countries.get(alpha_3=iso3)
    return c.numeric if c else None


def write(name: str, obj) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    with open(OUT / name, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"), default=lambda o: o.item())
    print(f"  wrote {name:24s} {(OUT / name).stat().st_size / 1024:7.1f} KB")


def main() -> int:
    print("Reading Stata data (read-only) …")
    deals = pd.read_stata(STATA / "data" / "deals.dta", convert_categoricals=False)
    countries = pd.read_stata(STATA / "data" / "countries.dta", convert_categoricals=False)
    panel = pd.read_stata(STATA / "data" / "panel.dta", convert_categoricals=False)
    did_long = pd.read_stata(STATA / "data" / "did_long.dta", convert_categoricals=False)
    coi = pd.read_stata(STATA / "data" / "coi_firms.dta", convert_categoricals=False)
    reg = pd.read_csv(STATA / "source" / "reg_events.csv")
    lit = pd.read_csv(STATA / "source" / "coi_litigation.csv")

    country_name = dict(zip(countries.iso3, countries.country))

    # ------------------------------------------------------------------ deals
    food = deals[deals.food_mfg == "Yes"].copy()
    deal_rows = []
    for _, d in food.iterrows():
        iso3 = clean(d.iso3)
        deal_rows.append({
            "id": clean(d.deal_id),
            "lender": d.lender,
            "project_id": clean(d.project_id),
            "company": clean(d.company),
            "parent": clean(d.parent_group),
            "iso3": iso3,
            "country": country_name.get(iso3) if iso3 else clean(d.country_as_reported),
            "regional": iso3 is None,
            "year": int(d.year) if not math.isnan(d.year) else None,
            "status": clean(d.status),
            "sector": clean(d.sector_label),
            "title": clean(d.products_or_title),
            "role": clean(d.role),
            "band": clean(d.nova4_band),
            "upf_firm": clean(d.upf_firm),
            "measure": clean(d.money_measure),
            "tier1": d.tier == "T1",
            "supply_chain": d.tier == "T1" and d.money_measure == "supply-chain",
            "amount": r1(d.amount_usd_m_2024),
            "t1": r3(d.core_t1_usd_m_2024),
            "food": r3(d.core_food_usd_m_2024),
            "sc_t1": r3(d.supply_chain_t1_usd_m_2024),
            "income": clean(d.income3_at_approval),
            "binding": None if math.isnan(d.binding_in_force_at_approval) else int(d.binding_in_force_at_approval),
            "confidence": r3(d.confidence),
            "reason": sanitise(d.reason),
            "source_url": clean(d.source_url),
        })
    write("deals.json", deal_rows)

    # --------------------------------------------------------------- countries
    food_money = food.groupby("iso3").core_food_usd_m_2024.sum()
    t1_deals = deals[deals.tier == "T1"]
    t1_by_iso_lender = t1_deals.groupby(["iso3", "lender"]).core_t1_usd_m_2024.sum()
    inc2025 = {"L": "Low", "LM": "Middle", "UM": "Middle", "H": "High"}
    pop_avg = panel.groupby("iso3").pop.mean()
    country_rows = []
    for _, c in countries.iterrows():
        iso3 = c.iso3
        by_lender = {l: r1(t1_by_iso_lender.get((iso3, l), 0.0)) for l in LENDERS}
        p = pop_avg.get(iso3)
        country_rows.append({
            "iso3": iso3,
            "num": iso_numeric(iso3),
            "name": c.country,
            "region": clean(c.wb_region),
            "income2010": clean(c.income3_start),
            "income2025": inc2025.get(clean(c.income_fy26_2025) or "", None),
            "first_binding": None if math.isnan(c.first_binding_year) else int(c.first_binding_year),
            "first_voluntary": None if math.isnan(c.first_voluntary_year) else int(c.first_voluntary_year),
            "n_food": int(c.n_food_deals),
            "n_t1": int(c.n_t1_deals),
            "t1": r1(c.core_t1_usd_m_2024),
            "food": r1(food_money.get(iso3, 0.0)),
            "t1_by_lender": by_lender,
            "t1_per1000": None if (p is None or math.isnan(p) or p == 0) else r1(c.core_t1_usd_m_2024 * 1e6 / p * 1000),
            "in_sample": c.in_deal_sample == "Yes",
            "h4_group": c.h4_group,
        })
    write("countries.json", country_rows)

    # ------------------------------------------------------------ country_year
    sample = set(countries[countries.in_deal_sample == "Yes"].iso3)
    cy = panel[panel.iso3.isin(sample)]
    cy_rows = [{
        "iso3": r.iso3, "year": int(r.year),
        "t1": r3(r.core_t1_usd_m_2024), "food": r3(r.core_food_usd_m_2024),
        "t1_per1000": r1(r.t1_usd_per_1000_people), "income": clean(r.income3),
        "pop": None if math.isnan(r.pop) else int(r.pop),
    } for r in cy.itertuples()]
    write("country_year.json", cy_rows)

    # -------------------------------------------------------------- regulation
    core = reg[reg.h4_core == "Yes"]
    reg_rows = [{
        "id": r.event_id, "iso3": r.iso3, "country": country_name.get(r.iso3, r.country),
        "domain": r.domain, "detail": clean(r.instrument_detail), "strength": r.strength,
        "year": None if pd.isna(r.in_force_year) else int(r.in_force_year),
        "end": None if pd.isna(r.end_year) else int(r.end_year),
        "source": clean(r.source),
    } for r in core.itertuples()]
    write("regulation.json", reg_rows)

    # ------------------------------------------------------------------- firms
    funded = coi[coi.public_money_t1_core_usd_m_2024 > 0]
    lit_by_parent = lit.dropna(subset=["parent_group"]).groupby("parent_group")
    firm_rows = []
    for _, f in funded.iterrows():
        pg = f.parent_group
        fd = t1_deals[(t1_deals.parent_group == pg)]
        links = []
        for col in ("trade_assoc_source", "lobbying_source"):
            v = clean(f[col])
            if v:
                links += [u.strip() for u in re.split(r"\s;\s|\s+;|;\s+", v) if u.strip().startswith("http")]
        ig = f.interest_group_memberships_lance
        firm_rows.append({
            "parent": pg, "slug": slugify(pg),
            "t1": r1(f.public_money_t1_core_usd_m_2024),
            "n_t1": int(f.n_deals_t1),
            "countries": sorted({country_name.get(i, i) for i in fd.iso3 if i} |
                                {clean(c) for c, i in zip(fd.country_as_reported, fd.iso3) if not i and clean(c)}),
            "iso3s": sorted({i for i in fd.iso3 if i}),
            "lenders": {l: r1(fd[fd.lender == l].core_t1_usd_m_2024.sum()) for l in LENDERS if (fd.lender == l).any()},
            "grade": int(f.obstruction_grade_0_3),
            "coi": bool(f.coi_flag),
            "n_lawsuits": int(f.n_lawsuits),
            "interest_groups": None if pd.isna(ig) else int(ig),
            "trade_assoc": clean(f.trade_assoc_opposed_regulation_y),
            "lobbying": clean(f.documented_lobbying_y_n_source),
            "confidence": clean(f.confidence),
            "evidence": sanitise_evidence(f.evidence_notes),
            "links": links,
        })
    firm_rows.sort(key=lambda r: -r["t1"])
    write("firms.json", firm_rows)

    # ---------------------------------------------------------------- lawsuits
    lit_rows = [{
        "id": int(r.case_id), "country": r.country, "plaintiff": clean(r.plaintiff),
        "plaintiff_type": clean(r.plaintiff_type), "defendant": clean(r.defendant),
        "case": clean(r.case_name), "court": clean(r.court),
        "filed": None if pd.isna(r.filed) else int(r.filed),
        "resolved": None if pd.isna(r.resolved) else int(r.resolved),
        "law": clean(r.disputed_law), "parent": clean(r.parent_group),
    } for r in lit.itertuples()]
    write("lawsuits.json", lit_rows)

    # --------------------------------------------------------- exclusion lists
    ex = pd.read_excel(MASTER, "H3_Exclusion_Lists", header=1)
    cols = ["excludes_tobacco", "excludes_alcohol", "excludes_weapons", "excludes_UPF_or_unhealthy_food",
            "excludes_sugary_drinks", "mentions_BMS_Code", "nutrition_criteria"]
    ex_rows = []
    for _, e in ex.iterrows():
        inst = clean(e.institution)
        kind = "benchmark" if inst.startswith("Benchmark") else "comparator" if inst.startswith("Comparator") else "lender"
        ex_rows.append({
            "institution": inst, "kind": kind, "document": clean(e.document),
            "version": clean(str(e.version_date)), "url": clean(e.url),
            **{c: (None if pd.isna(e[c]) else int(e[c])) for c in cols},
        })
    order = {"lender": 0, "comparator": 1, "benchmark": 2}
    ex_rows.sort(key=lambda r: order[r["kind"]])
    write("exclusion_lists.json", ex_rows)

    # ----------------------------------------------------- H1 aggregates only
    t1 = t1_deals.copy()
    t1["m1"] = t1.core_t1_usd_m_2024 * (t1.h1_list_match_disclosed != "")
    t1["m1b"] = t1.core_t1_usd_m_2024 * (t1.h1_list_match_with_parent != "")
    t1["named"] = (t1.h1_list_match_disclosed != "").astype(int)
    h1 = {}
    for l in LENDERS + ["All"]:
        g = t1 if l == "All" else t1[t1.lender == l]
        m2, m1, m1b = g.core_t1_usd_m_2024.sum(), g.m1.sum(), g.m1b.sum()
        h1[l] = {
            "m2": r1(m2), "m1": r1(m1), "m1b": r1(m1b),
            "gap": rnd(m2 / m1, 2) if m1 else None,
            "gap_parent": rnd(m2 / m1b, 2) if m1b else None,
            "deals": int(len(g)), "deals_named": int(g.named.sum()),
        }
    inter = pd.read_excel(MASTER, "H1_Intermediated", header=1)
    inter_rows = []
    for _, r in inter.iterrows():
        name = str(r.lender).split(" (")[0]
        inter_rows.append({
            "lender": name, "currency": r.currency,
            "intermediated_bn": r1(r["intermediated (FI + funds) bn"]),
            "all_bn": r1(r["all lending bn"]),
            "share": rnd(r["intermediated (FI + funds) bn"] / r["all lending bn"], 5),
            "definition": clean(r["definition used"]),
        })

    # --------------------------------------------------- DiD (display means)
    dl = did_long[did_long.binding.notna()]
    means = (dl.groupby(["binding", "post"]).ln_y.mean().reset_index())
    did_means = [{"binding": int(m.binding), "post": int(m.post), "ln_y": round(float(m.ln_y), 4)} for m in means.itertuples()]
    did_countries = []
    for iso3, g in dl.groupby("iso3"):
        pre = g[g.post == 0].iloc[0]
        post = g[g.post == 1].iloc[0]
        did_countries.append({
            "iso3": iso3, "name": country_name.get(iso3, iso3), "binding": int(pre.binding),
            "pre": round(float(pre.ln_y), 4), "post": round(float(post.ln_y), 4),
            "pre_y": r1(pre.y_t1_per1000), "post_y": r1(post.y_t1_per1000),
        })
    # yearly trend means (Figure 6.2 equivalent)
    grp = countries.set_index("iso3").h4_group
    pt = panel[panel.iso3.map(grp).isin(["0 none", "2 binding"])].copy()
    pt["binding"] = (pt.iso3.map(grp) == "2 binding").astype(int)
    pt["ln_y"] = (1 + pt.t1_usd_per_1000_people).apply(math.log)
    trend = [{"binding": int(b), "year": int(y), "ln_y": round(float(v), 4)}
             for (b, y), v in pt.groupby(["binding", "year"]).ln_y.mean().items()]

    write("did.json", {"means": did_means, "countries": did_countries, "trend": trend,
                       "group_counts": {"binding": int(dl[dl.binding == 1].iso3.nunique()),
                                        "none": int(dl[dl.binding == 0].iso3.nunique())}})

    # ------------------------------------------------------- headline aggregates
    tc = t1[t1.iso3 != ""]
    # Binding share: core Tier 1 deals with a country (76 of 146 = 52.1%). See DATA_QUESTIONS.md Q1.
    tcc = tc[tc.money_measure == "core"]
    binding_share = tcc.binding_in_force_at_approval.mean()
    band_a = t1[(t1.nova4_band == "A")].core_t1_usd_m_2024.sum()
    band_c_food = deals[(deals.food_mfg == "Yes") & (deals.role == "Manufacturer") &
                        (deals.nova4_band.isin(["C"]))].core_food_usd_m_2024.sum()
    coi_f = funded.copy()
    w = coi_f.public_money_t1_core_usd_m_2024
    coi_share = (w * coi_f.coi_flag).sum() / w.sum()
    coi_noY = (w * coi_f.coi_flag * (coi_f.parent_group != "Yildiz Holding (Ulker/pladis)")).sum() / w.sum()
    grade_money = {str(int(g)): r1(v) for g, v in coi_f.groupby("obstruction_grade_0_3").public_money_t1_core_usd_m_2024.sum().items()}
    grade_n = {str(int(g)): int(v) for g, v in coi_f.groupby("obstruction_grade_0_3").size().items()}
    ranked = coi_f.sort_values("public_money_t1_core_usd_m_2024", ascending=False)
    total = w.sum()
    inc_c = countries[countries.core_t1_usd_m_2024 > 0].groupby("income3_start").core_t1_usd_m_2024.sum()
    core_pos = t1[(t1.money_measure == "core") & (t1.core_t1_usd_m_2024 > 0)]

    def period(y):
        return "2010-13" if y <= 2013 else "2014-17" if y <= 2017 else "2018-21" if y <= 2021 else "2022-25"
    t1["period"] = t1.year.apply(period)
    by_period = {p: {"usd_m": r1(g.core_t1_usd_m_2024.sum()), "deals": int(len(g))} for p, g in t1.groupby("period")}
    p2225_no_cci = t1[(t1.period == "2022-25")]
    cci = t1[t1.company.str.contains("Coca-Cola İçecek|Coca-Cola Icecek|COCA-COLA ICECEK", case=False, regex=True) & (t1.year == 2024)]
    inc_at = {}
    for k, g in t1.groupby(t1.income3_at_approval.replace("", "Regional")):
        inc_at[k] = {"usd_m": r1(g.core_t1_usd_m_2024.sum()), "deals": int(len(g))}

    agg = {
        "t1_deals": int(len(t1)),
        "t1_core_deals": int((t1.money_measure == "core").sum()),
        "t1_sc_deals": int((t1.money_measure == "supply-chain").sum()),
        "t1_core_usd_m": r1(t1.core_t1_usd_m_2024.sum()),
        "t1_sc_usd_m": r1(t1.supply_chain_t1_usd_m_2024.sum()),
        "by_lender": {l: {"usd_m": r1(t1[t1.lender == l].core_t1_usd_m_2024.sum()),
                          "deals": int((t1.lender == l).sum())} for l in LENDERS},
        "by_period": by_period,
        "period_2022_25_without_cci": r1(p2225_no_cci.core_t1_usd_m_2024.sum() - cci.core_t1_usd_m_2024.sum()),
        "by_income_at_approval": inc_at,
        "money_with_country": {"usd_m": r1(tc.core_t1_usd_m_2024.sum()), "deals": int(len(tc))},
        "regional": {"usd_m": r1(t1[t1.iso3 == ""].core_t1_usd_m_2024.sum()), "deals": int((t1.iso3 == "").sum())},
        "by_income_2010": {k: {"usd_m": r1(v), "share": rnd(v / inc_c.sum(), 3)} for k, v in inc_c.items()},
        "h1": h1,
        "intermediated": inter_rows,
        "top_parents": [{"parent": r.parent_group, "usd_m": r1(r.public_money_t1_core_usd_m_2024),
                         "share": rnd(r.public_money_t1_core_usd_m_2024 / total, 3)} for r in ranked.head(10).itertuples()],
        "top5_share": rnd(ranked.head(5).public_money_t1_core_usd_m_2024.sum() / total, 3),
        "top10_share": rnd(ranked.head(10).public_money_t1_core_usd_m_2024.sum() / total, 3),
        "named_list_share": rnd(h1["All"]["m1b"] / h1["All"]["m2"], 3),
        "n_parent_groups": int(len(funded)),
        "n_countries": int(t1[t1.iso3 != ""].iso3.nunique()),
        "median_deal": r1(core_pos.core_t1_usd_m_2024.median()),
        "top_countries": [{"iso3": r.iso3, "name": r.country, "usd_m": r1(r.core_t1_usd_m_2024), "deals": int(r.n_t1_deals)}
                          for r in countries.sort_values("core_t1_usd_m_2024", ascending=False).head(10).itertuples()],
        "binding_share": round(float(binding_share), 3),
        "binding_share_n": {"binding": int(tcc.binding_in_force_at_approval.sum()), "deals": int(len(tcc))},
        "screen_20": r1(t1.core_t1_usd_m_2024.sum()),
        "screen_50": r1(band_a),
                "coi_share": round(float(coi_share), 3),
        "coi_share_without_yildiz": round(float(coi_noY), 3),
        "coi_groups_ge2": [{"parent": r.parent_group, "usd_m": r1(r.public_money_t1_core_usd_m_2024), "grade": int(r.obstruction_grade_0_3)}
                           for r in ranked[ranked.obstruction_grade_0_3 >= 2].itertuples()],
        "coi_groups_ge2_usd_m": r1(ranked[ranked.obstruction_grade_0_3 >= 2].public_money_t1_core_usd_m_2024.sum()),
        "grade_money": grade_money,
        "grade_n": grade_n,
        "turkiye": {"deals": int(((t1.iso3 == "TUR")).sum()), "usd_m": r1(t1[t1.iso3 == "TUR"].core_t1_usd_m_2024.sum()),
                    "yildiz_in_tur": r1(t1[(t1.iso3 == "TUR") & (t1.parent_group == "Yildiz Holding (Ulker/pladis)")].core_t1_usd_m_2024.sum()),
                    "by_lender": {l: int(((t1.iso3 == "TUR") & (t1.lender == l)).sum()) for l in LENDERS}},
        "mexico_lawsuits": int((lit.country == "Mexico").sum()),
        "lawsuits_total": int(len(lit)),
        "did_groups": {"binding": int(dl[dl.binding == 1].iso3.nunique()), "none": int(dl[dl.binding == 0].iso3.nunique()),
                       "n": int(len(dl))},
    }

    # ----------------------------------------------- results (hand-entered)
    results = {
        "_note": "Regression results are hand-entered from the Stata output of UPF_Thesis_Master_2026-11-21.do (Part B). The website never estimates them. Aggregates in `computed` are sums/counts/shares of the public data.",
        "headline_t1": {"value": 6432.6, "unit": "US$m 2024", "label": "at least US$6.43bn", "source": "do-file §1 (tabstat core_t1_usd_m_2024 by lender)"},
        "h1_gap": {"value": 6.95, "with_parents": 4.64, "by_lender": {"IFC": [4.93, 4.2], "EBRD": [20.42, 5.0], "EIB": [3.74, 3.7], "IDB Invest": [None, None]},
                   "robust_band_a": 6.81, "robust_em_confirmed": 6.04, "source": "do-file §2a (H1 gap)"},
        "h3_did_main": {"value": 1.221, "se": 0.951, "p": 0.205, "ci": [-0.69, 3.13], "n": 104, "groups": {"binding": 18, "none": 34},
                        "unit": "log points, ln(1 + US$ per 1,000 people)", "model": "reg ln_y i.binding##i.post, vce(cluster countryid)",
                        "source": "do-file §4c / decision D066"},
        "h3_did_gdp": {"value": 1.292, "p": 0.183, "n": 102, "source": "do-file §4d (i)"},
        "h3_did_levels": {"value": -465.6, "p": 0.451, "unit": "US$ per 1,000 people", "source": "do-file §4d (ii)"},
        "h3_any_deal": {"value": 0.104, "p": 0.13, "source": "codebook B4(d)"},
        "kappa": {"role": 0.51, "upf": 0.35, "upf_without_unsure": 0.55, "source": "do-file §9"},
        "h4_coi": {"value": 0.428, "without_yildiz": 0.322, "nine_groups_usd_m": 2754.2, "source": "do-file §6"},
        "baker_2020": {"kg_per_capita_2019": {"High": 109.3, "Upper-middle": 32.3, "Lower-middle": 9.7},
                        "growth_2009_19": {"High": 0.4, "Upper-middle": 2.8, "Lower-middle": 4.4},
                        "source": "Baker et al. 2020, Obesity Reviews 21(12): e13126"},
        "computed": agg,
    }
    write("results.json", results)

    write("meta.json", {
        "data_version": "Frozen 18 Nov 2026; H3 DiD per D066, 21 Nov 2026",
        "build_date": date.today().isoformat(),
        "title": "Funding What We Regulate: public money, corporate power and the ultra-processed food (UPF) transition",
        "author": "India Clarke",
        "institution": "NYU Center for Global Affairs, MS thesis",
        "citation": "Clarke, India. 2026. “Funding What We Regulate: Public Money, Corporate Power and the Ultra-Processed Food Transition.” MS thesis, New York University Center for Global Affairs.",
        "notes": ["Commitments, not disbursements.", "All money in US$ millions at 2024 prices (US GDP deflator).",
                  "Euromonitor-based results appear in the thesis only as group summaries and are not on this site."],
    })
    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
