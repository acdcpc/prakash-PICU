# Drug Data Verification Report — Teddy Bear & Neonate Formularies

**Date:** 2026-09-30 (Asia/Kathmandu) · **Scope:** every drug record in `teddy_bear_monographs` + `harriet_lane_monographs` (Supabase `upucdkfkjhsynysxfnib`), verified against the institution-authorized private extracts (`.clinical-private/`).
**Status:** COMPLETE — all records verified; 41 missing monographs recovered; damaged glyphs repaired; independent reviews passed.

## 1. Headline results

| Metric | Teddy Bear (>1 mo) | Neonate / Harriet Lane (<1 mo) |
|---|---:|---:|
| Records before verification | 238 | 458 |
| Missing monographs recovered | **+9** | **+32** |
| Records now (live database) | **247** | **490** |
| Exact source-slice fidelity (after repair) | 100% (247/247) | 100% (490/490) |

**Total: 737 monograph records, every one an exact contiguous slice of the authorized source text.** No duplicate ids/offsets/names; every offset unique, integer, in-bounds.

## 2. What was verified on every record
1. **Source fidelity** — content equals the exact trimmed slice of the private source at its offset (recomputed, not trusted).
2. **Completeness of detection** — cross-scans of the source for all monograph headings (multiple independent detectors) to find records that never made it into the database.
3. **Names** — match the source heading; checked against the monograph index; no accidental duplicates.
4. **Dose-text structure** — dose-like expressions per record; zero-dose analysis; high-alert rate-unit candidates; unit-family mixes.
5. **Encoding** — non-ASCII inventory; undecoded glyphs; control characters; mojibake scan.
6. **Cross-table** — shared generics between the two formularies (72 in both), no stale aliases.

## 3. Findings & repairs (all applied)

### 3.1 Missing monographs — 41 recovered
Root cause: the heading detectors were too strict. Missed headings were: indented 4–5 spaces instead of exactly 2 (`VANCOMYCIN`, `IBUPROFEN`, …), contained `±` (`ADAPALENE ± BENZOYL PEROXIDE`, …), contained en-dashes (`Ampicillin Sodium–Sulbactam Sodium`, …), were lowercase-styled (`metroNIDAZOLE`, `VITAMIN E/a-TOCOPHEROL`), spanned two lines (`Co-Trimoxazole (Trimoxazole–…`), or contained "See" (`VITAMIN B1 See Thiamine.`). Each missed monograph's text had been **absorbed into its alphabetical neighbor**; repairs split the text back out and re-sliced the neighbors.
- **Teddy (+9):** ampicillin-sodium-sulbactam-sodium, asparaginase-pegylated-pegaspargase, co-trimoxazole-trimethoprim-sulfamethoxazole, imipenem-cilastatin-sodium, metronidazole, piperacillin-sodium-tazobactam-sodium, ticarcillin-disodium-clavulanate-potassium, tissue-plasminogen-activator-t-pa-alteplase, vitamin-k1-phytonadione.
- **Neonate (+32):** adapalene-benzoyl-peroxide, amikacin-sulfate, bacitracin-polymyxin-b, cannabidiol, cetirizine-pseudoephedrine, clarithromycin, dextroamphetamine-amphetamine, ergotamine-tartrate-caffeine, fexofenadine-pseudoephedrine, heparin-sodium, hydroxyzine, ibuprofen, infliximab, ipratropium-bromide-albuterol, linezolid, loratadine-pseudoephedrine, mometasone-furoate-fomoterol-fumarate, pralidoxime-chloride-atropine, tobramycin, vancomycin, citrate-mixtures, digoxin-immune-fab-ovine, vitamin-b1, vitamin-b2, vitamin-b3, vitamin-b6, vitamin-b12, vitamin-c, vitamin-d2, vitamin-d3, vitamin-e-a-tocopherol, vitamin-k.
- **Notable clinically:** vancomycin, ibuprofen, amikacin, heparin, tobramycin (NICU-essential) and the vitamin block are now standalone records; previously they were only readable inside neighbors' text.
- **Conservation verified:** every recovered piece is an exact substring of the old absorbing record; nothing lost, nothing else changed (adversarial reviewer, checks 1–5 PASS, zero counterexamples).

### 3.2 Encoding / glyph repairs
- **63 undecoded `®` marks** in the zonisamide references (brand-name citations) restored from U+FFFD (54 further marks outside the monograph set were returned to their original extraction state; they appear to represent math symbols in unused front matter, which no record references).
- **38 stray BEL (U+0007) glyphs** in 3 Teddy monographs (irinotecan-hcl, iron-dextran, zoledronic-acid) replaced with spaces (invisible characters; lossless; 2 more outside the monograph set were normalized too).
- **1 truncated name** completed: `ALUMINUM HYDROXIDE WITH MAGNESIUM HYDROXIDE ± SIMETHICONE`.

### 3.3 Cleared as false alarms
- "Todo" flag = the author name "Todo S" in a reference (not a placeholder).
- Control characters = form feeds used as page separators (benign).
- Non-ASCII names = source-faithful typographic dashes and `±`.
- Short records = legitimate "See …" cross-reference entries.
- Teddy 9-run repair (previous session) untouched; teddy content start/end partition totals identical before/after repair.

## 4. Independent verification (subagent cross-checks)
- **subagent_01 (Teddy fidelity):** PASS 238/238 pre-repair; offsets/headings/names all pass.
- **subagent_02 (Neonate fidelity + NICU coverage):** PASS 458/458; flagged vancomycin/amikacin/ibuprofen/heparin embedded (the finding that triggered the repair).
- **subagent_03 (dose-text audit):** zero-dose lists identical to mainline; found 1 shared scanner gap (whitespace-split rate units — hydralazine-hcl); recommends whitespace normalization in scanners.
- **subagent_04 (encoding/naming):** confirmed the zonisamide ® hypothesis (63/63 brand contexts); BEL analysis; full non-ASCII census; severity-ranked fix list.
- **subagent_05 (repair reviewer, round 1):** PASS — change set exactly {29 new} ∪ {28 predecessors} ∪ {1 rename}; conservation clean; only `updated_at` bulk-bump noted (metadata-only).
- **subagent_06 (final reviewer, final 247/490 state):** PASS — slice checks 0 fails; zero unexplained changes; all 30 shrunk records are strict prefixes of their predecessors; all 41 recovered records conserved as contiguous substrings; 0 lost fragments. Frozen-hash verified.

## 5. Remaining advisories (recommendations, not applied)
1. Teddy: 511 private-use glyphs (U+F038) and ~60 soft hyphens / ~12 zero-width spaces from the PDF extraction in footer/URL contexts — optional cosmetic cleanup pass.
2. Neonate: 4 `◦` characters that are almost certainly `°` (e.g., "≥38◦ C").
3. Five short records carry trailing page furniture ("… See X 860 Part IV Formulary").
4. Consider marking the 45 "See …" alias rows as `record_kind = 'cross-reference'` so drug lists can filter them.
5. Route/review note: first and last records legitimately include book front/back matter edges (pre-existing extraction bounds behavior).

## 6. Governance
All records remain `pending-clinical-verification`; nothing was promoted into calculators; the review workflow, disclaimers and access model are unchanged. The recovered records are now visible in the authenticated review queues (Teddy Bear + Neonate) for team review.

## 7. Reproduce
```bash
node scripts/compile-teddy-bear-sql.mjs   # rebuild seeds from index+source
node scripts/compile-harriet-lane-sql.mjs
npm test                                   # 92 tests, incl. count gates
node .cluster/drug-verify/audit-formularies.mjs   # slice/dup/encoding audit
```
