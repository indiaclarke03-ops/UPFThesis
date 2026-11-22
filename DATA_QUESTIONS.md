# Data questions found while building the site

None of these were "fixed" in the data. Each is either a definitional choice the site had to make, or a small inconsistency to confirm. All 98 canonical checks in `pipeline/check_numbers.py` pass.

## Q1. Binding share: three possible denominators
"52% of Tier 1 deals with a country were approved where binding regulation was already in force."

| Denominator | Binding | Deals | Share |
|---|---|---|---|
| Core Tier 1 deals with a country (**used on the site**) | 76 | 146 | **52.1%** |
| Core Tier 1 deals with positive money (H1_Context) | 75 | 145 | 51.7% |
| All Tier 1 deals with a country (incl. 2 Mexico supply-chain deals) | 78 | 148 | 52.7% |

All round to "about 52%" except the last (53%). Please confirm which one the thesis uses. The provenance tooltip shows the site's choice.

## Q2. NOVA band definitions differ between the build prompt and the codebook
- Build prompt: A ≥50%, B 20–49%, **C unclear, D <20%**.
- Codebook (`UPF_Thesis_Variables_and_Code_Guide_2026-11-21.docx`): A ≥ 50%; B 20–50%; **C some NOVA 4 but < 20%; C/D, D little or none; E too little information**.

The site uses the codebook wording. Only bands A and B are Tier 1, so no number changes.

## Q3. "Screen at 50% (band A)": do-file §1f does not exist
The master do-file has no §1f. The site computes it as core Tier 1 money in band A deals: **US$4,270.6m** ("about 4,270"). The codebook also says "the share of Tier 1 money in band A is not reported as a result" (line 31). The simulator shows it with a caveat. Please confirm you want the 50% figure on a public site.

## Q4. Disclosure-gap reveal and row-level list matches
The 12 "lit" deals in the Act 2 unit grid come from `h1_list_match_disclosed`, which is a licensed row-level flag (rule 2). The site publishes only the **count per lender** (IFC 6, EBRD 4, EIB 2, IDB Invest 0). The lit units are anonymous and cannot be traced to a deal.

## Q5. Rounding differences within tolerance
- Bangladesh: 403.6 from the data vs 403.5 in the canonical table (float32 storage in `.dta`).
- The nine groups graded ≥2: 2,754.3 from the data vs 2,754.2 in the table.
Both are within ±0.1. The site displays the canonical figure in text and the data figure in charts.

## Q6. Period deal counts
H1_Context gives 35 (2018–21) and 48 (2022–25) deals. The canonical table gives 36 and 50. The difference is that H1_Context counts deals with positive core money, while the canonical table counts all Tier 1 deals, including 2 supply-chain deals and 1 core deal with no amount (IDBI-13882-01, Mexico 2022). The site uses the canonical counts.

## Q7. `em_unresolved` not published
`em_unresolved` was listed among the deal fields in the prompt, but it is a Euromonitor-derived robustness flag (D043). It is left out of `deals.json` to be safe.

## Q8. Free-text sanitising
47 of 1,018 `reason` values (all deals, before the food filter) matched the licensed-text pattern and are replaced with "Coded from licensed market-share data (value not shown); see Methods." The same rule is applied to the firms' `evidence_notes`.

## Q9. "US$1.0bn of band C dairy left out"
This Act 7 figure is quoted from the thesis text. The site does not recompute it, because the band C dairy subset is not a coded field.

## Q10. Mexico lawsuits
193 of the 239 Lighthouse Reports cases are in Mexico. Only 48 cases have a parent group assigned.
