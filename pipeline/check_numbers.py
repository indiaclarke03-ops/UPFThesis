"""Assert every canonical thesis number (build prompt §4) against the public JSON,
and scan public/ for licensed content. Exits non-zero on any failure.

Tolerance: ±0.1 on US$m and on ratios; ±0.1 percentage points on shares.
Do NOT fix a failure by editing data: report it (see DATA_QUESTIONS.md).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

WEB = Path(__file__).resolve().parents[1]
DATA = WEB / "public" / "data"

R = json.loads((DATA / "results.json").read_text())
C = R["computed"]
DEALS = json.loads((DATA / "deals.json").read_text())
EX = json.loads((DATA / "exclusion_lists.json").read_text())

rows: list[tuple[str, str, object, object, bool]] = []


def money(label, src, got, want, tol=0.1):
    ok = got is not None and abs(got - want) <= tol + 1e-9
    rows.append((label, src, got, want, ok))


def share(label, src, got, want_pct):
    ok = got is not None and abs(got * 100 - want_pct) <= 0.1 + 1e-9
    rows.append((label, src, None if got is None else round(got * 100, 2), want_pct, ok))


def exact(label, src, got, want):
    rows.append((label, src, got, want, got == want))


# --- §1
exact("Tier 1 deals", "do §1", C["t1_deals"], 153)
exact("  core Tier 1 deals", "do §1", C["t1_core_deals"], 151)
exact("  supply-chain Tier 1 deals", "do §1", C["t1_sc_deals"], 2)
money("Core Tier 1 money", "do §1", C["t1_core_usd_m"], 6432.6)
money("Tier 1 supply-chain finance", "D001", C["t1_sc_usd_m"], 135.3)
for l, v in {"IFC": 2501.3, "EBRD": 2428.9, "EIB": 1116.9, "IDB Invest": 385.5}.items():
    money(f"By lender: {l}", "do §1b", C["by_lender"][l]["usd_m"], v)
for p, (v, n) in {"2010-13": (1070.3, 30), "2014-17": (1859.1, 37), "2018-21": (1290.3, 36), "2022-25": (2212.9, 50)}.items():
    money(f"By period {p}", "do §1c", C["by_period"][p]["usd_m"], v)
    exact(f"  deals {p}", "do §1c", C["by_period"][p]["deals"], n)
money("2022-25 without Coca-Cola İçecek 2024", "Act 2 note", C["period_2022_25_without_cci"], 1962.9, tol=10)  # "US$1.96bn"
for k, (v, n) in {"High": (1640.7, 28), "Middle": (4270.5, 110), "Low": (96.8, 10), "Regional": (424.6, 5)}.items():
    money(f"Income at approval: {k}", "do §1d", C["by_income_at_approval"][k]["usd_m"], v)
    exact(f"  deals {k}", "do §1d", C["by_income_at_approval"][k]["deals"], n)
money("Money with a country", "Tables 4.1/4.4", C["money_with_country"]["usd_m"], 6008.0)
exact("  deals with a country", "Tables 4.1/4.4", C["money_with_country"]["deals"], 148)
money("Regional deals", "Tables 4.1/4.4", C["regional"]["usd_m"], 424.6)
for k, (v, s) in {"Middle": (4015.8, 67), "High": (1465.3, 24), "Low": (526.8, 9)}.items():
    money(f"Income 2010: {k}", "do §6b-ii/§7", C["by_income_2010"][k]["usd_m"], v)
    rows.append((f"  share {k} (rounded %)", "do §7", round(C["by_income_2010"][k]["share"] * 100), s,
                 round(C["by_income_2010"][k]["share"] * 100) == s))
# --- H1
h1 = C["h1"]["All"]
money("H1 measure 1", "H1_Measures", h1["m1"], 925.2)
money("H1 measure 1b", "H1_Measures", h1["m1b"], 1387.4)
money("H1 measure 2", "H1_Measures", h1["m2"], 6432.6)
money("H1 pooled gap", "do §2a", h1["gap"], 6.95, tol=0.01)
money("H1 pooled gap with parents", "do §2a", h1["gap_parent"], 4.64, tol=0.01)
for l, (g, gp) in {"IFC": (4.9, 4.2), "EBRD": (20.4, 5.0), "EIB": (3.7, 3.7)}.items():
    money(f"H1 gap {l}", "do §2a", C["h1"][l]["gap"], g)
    money(f"H1 gap {l} with parents", "do §2a", C["h1"][l]["gap_parent"], gp)
exact("H1 gap IDB Invest undefined", "do §2a", C["h1"]["IDB Invest"]["gap"], None)
exact("Deals carrying a listed name", "do §2a", h1["deals_named"], 12)
for i in C["intermediated"]:
    want = {"IFC": 52, "EBRD": 56, "EIB": 29, "IDB Invest": 25}[i["lender"]]
    pct = int(i["share"] * 100 + 0.5)  # conventional half-up rounding
    rows.append((f"Intermediated share {i['lender']} (rounded %)", "H1_Intermediated", pct, want, pct == want))
# --- top parents / countries
tp = {p["parent"]: p for p in C["top_parents"]}
money("Coca-Cola system", "do §2c", tp["Coca-Cola system"]["usd_m"], 1027.7)
share("  Coca-Cola share", "do §2c", tp["Coca-Cola system"]["share"], 16.0)
money("Yıldız/Ülker", "do §2c", tp["Yildiz Holding (Ulker/pladis)"]["usd_m"], 681.5)
money("PRAN-RFL", "do §2c", tp["PRAN-RFL Group"]["usd_m"], 382.3)
share("Top 5 share", "do §2c", C["top5_share"], 41.3)
share("Top 10 share", "do §2c", C["top10_share"], 60.4)
exact("Parent groups", "H1_Context", C["n_parent_groups"], 82)
exact("Countries", "H1_Context", C["n_countries"], 45)
money("Median deal", "H1_Context", C["median_deal"], 28.6)
tc = {c["iso3"]: c["usd_m"] for c in C["top_countries"]}
for iso, v in {"TUR": 1027.9, "EGY": 426.1, "BGD": 403.5, "SRB": 342.8, "POL": 330.9}.items():
    money(f"Top country {iso}", "do §2c", tc[iso], v)
# --- H2 exclusion lists
lenders = [e for e in EX if e["kind"] == "lender"]
exact("H2 lender lists", "H3_Exclusion_Lists", len(lenders), 10)
exact("H2 lists naming tobacco", "H3_Exclusion_Lists", sum(e["excludes_tobacco"] == 1 for e in lenders), 10)
exact("H2 lists naming UPF/unhealthy food", "H3_Exclusion_Lists", sum(e["excludes_UPF_or_unhealthy_food"] == 1 for e in lenders), 0)
# --- screen
money("Screen at 20%", "do §1f", C["screen_20"], 6432.6)
money("Screen at 50% (band A, 'about 4,270')", "do §1f", C["screen_50"], 4270.0, tol=1.0)
# --- H3 (hand-entered, checked for transcription)
m = R["h3_did_main"]
exact("H3 DiD b", "do §4c/D066", m["value"], 1.221)
exact("H3 DiD SE", "do §4c", m["se"], 0.951)
exact("H3 DiD p", "do §4c", m["p"], 0.205)
exact("H3 DiD CI", "do §4c", m["ci"], [-0.69, 3.13])
exact("H3 DiD N", "do §4c", m["n"], 104)
exact("H3 DiD N (from did_long)", "did_long", C["did_groups"]["n"], 104)
exact("H3 groups binding", "did_long", C["did_groups"]["binding"], 18)
exact("H3 groups none", "did_long", C["did_groups"]["none"], 34)
exact("H3 + log GDP", "do §4d", (R["h3_did_gdp"]["value"], R["h3_did_gdp"]["p"], R["h3_did_gdp"]["n"]), (1.292, 0.183, 102))
exact("H3 levels", "do §4d", (R["h3_did_levels"]["value"], R["h3_did_levels"]["p"]), (-465.6, 0.451))
share("Binding share (core T1 deals with a country)", "Methods v7", C["binding_share"], 52.1)
# --- H4
share("H4 COI share", "do §6", C["coi_share"], 42.8)
share("H4 COI share without Yıldız", "do §6", C["coi_share_without_yildiz"], 32.2)
money("Nine groups graded ≥2", "do §6", C["coi_groups_ge2_usd_m"], 2754.2)
exact("  number of groups graded ≥2", "do §6", len(C["coi_groups_ge2"]), 9)
for g, v in {"0": 3678.3, "2": 1665.3, "3": 1089.0}.items():
    money(f"Money by grade {g}", "do §6", C["grade_money"][g], v)
# --- validation
exact("κ", "do §9", (R["kappa"]["role"], R["kappa"]["upf"], R["kappa"]["upf_without_unsure"]), (0.51, 0.35, 0.55))
# --- Türkiye box
exact("Türkiye Tier 1 deals", "case box §8", C["turkiye"]["deals"], 20)
money("Türkiye money", "case box §8", C["turkiye"]["usd_m"], 1027.9)
money("Yıldız/Ülker in Türkiye", "case box §8", C["turkiye"]["yildiz_in_tur"], 625.6)
exact("Türkiye EBRD / IFC deals", "case box §8", (C["turkiye"]["by_lender"]["EBRD"], C["turkiye"]["by_lender"]["IFC"]), (18, 2))

# --- deals.json reproduces the core totals (what the front-end aggregates)
money("deals.json core T1 sum", "deals.json", round(sum(d["t1"] or 0 for d in DEALS), 1), 6432.6)
exact("deals.json food-manufacturing rows", "deals.json", len(DEALS), 663)
exact("deals.json Tier 1 rows", "deals.json", sum(d["tier1"] for d in DEALS), 153)
exact("every deal has a source_url", "deals.json", all(d["source_url"] for d in DEALS), True)

# ------------------------------------------------------------- licence scan
FORBIDDEN_KEYS = ["em_marketsize", "h5_core_upf", "core_upf_usd", "upf2012", "upf_growth", "upf_stage",
                  "h1_list_match_disclosed", "h1_list_match_with_parent", "parent_assign_note", "em_unresolved",
                  "market_size", "pitchbook"]
FORBIDDEN_FILES = re.compile(r"euromonitor|em_market|h5_core|country_groups|pitchbook|atni", re.I)
scan_fail: list[str] = []
for f in sorted((WEB / "public").rglob("*")):
    if not f.is_file():
        continue
    if FORBIDDEN_FILES.search(f.name):
        scan_fail.append(f"forbidden file name: {f.relative_to(WEB)}")
    if f.suffix == ".json":
        txt = f.read_text(encoding="utf-8")
        for k in FORBIDDEN_KEYS:
            if re.search(rf'"{k}\w*"\s*:', txt, re.I):
                scan_fail.append(f"forbidden column '{k}' in {f.relative_to(WEB)}")
        if '"notes":' in txt and f.name not in ("meta.json",):
            scan_fail.append(f"'notes' column present in {f.relative_to(WEB)}")
# free-text in deals/firms must not mention licensed sources
LIC = re.compile(r"euromonitor|\bEM\b|pitchbook", re.I)
for d in DEALS:
    for k in ("reason",):
        if d.get(k) and LIC.search(d[k]) and not d[k].startswith("Coded from licensed"):
            scan_fail.append(f"licensed mention in deal {d['id']}.{k}")
for fm in json.loads((DATA / "firms.json").read_text()):
    if fm.get("evidence") and LIC.search(fm["evidence"]) and not fm["evidence"].startswith("Coded from licensed"):
        scan_fail.append(f"licensed mention in firm {fm['parent']}.evidence")

INTERNAL = re.compile(r"\bIndia\b|for me\b|would not load", re.I)
for fm in json.loads((DATA / "firms.json").read_text()):
    if fm.get("evidence") and INTERNAL.search(fm["evidence"]):
        scan_fail.append(f"internal research note in firm {fm['parent']}.evidence")

# ------------------------------------------------------------------ report
w = max(len(r[0]) for r in rows)
fails = [r for r in rows if not r[4]]
print(f"\nCanonical numbers ({len(rows)} checks)\n" + "-" * (w + 50))
for label, src, got, want, ok in rows:
    print(f"{'PASS' if ok else 'FAIL'}  {label:<{w}}  got {got!s:<14} want {want!s:<14} [{src}]")
print("\nLicence scan: " + ("PASS (no licensed columns, files or free text in public/)" if not scan_fail else "FAIL"))
for s in scan_fail:
    print("  - " + s)
print(f"\n{len(rows) - len(fails)}/{len(rows)} numbers match. ", end="")
if fails or scan_fail:
    print("BUILD BLOCKED: see failures above; report them, do not edit the data.")
    sys.exit(1)
print("All green.")
