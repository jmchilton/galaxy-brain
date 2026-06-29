# Figure 5 — The workflow draft resolves (draft spec)

Source-of-truth content for Figure 5: one real workflow step shown at three resolution tiers over a fixed, concrete topology, ending in promotion to `class: GalaxyWorkflow` and a green `gxwf` check. The "under-determination as a typed state" payoff figure.

**Step shown:** `DESeq2 differential test` — the central step of the UC3 differential-ATAC construction run, and the step where `gxwf` caught a fabrication (below).

**Source artifacts** (UC3 interview→galaxy run, `_emulated-runs/interview-atac-uc3/`):
- Tier 2 (Identity-pinned) is the literal `galaxy-workflow-draft.gxwf.yml` (template-Mold output).
- Tier 3 (Resolved) is the literal `galaxy-workflow.gxwf.yml` (loop endstate).
- Tier 1 (Deferred) is **reconstructed** — see honesty note. The run's template Mold emitted directly at the identity-pinned tier because the IWC exemplar pinned the wrapper identity; the fully-deferred state is the schema-permitted earlier state, shown for completeness.

Tiers trimmed for legibility; `…` marks elided `_plan_*` prose and `tool_state` keys.

---

## Tier 1 — Deferred  *(reconstructed)*

```yaml
DESeq2 differential test:
  tool_id: TODO                 # wrapper not yet resolved
  tool_version: TODO
  in:
    TODO_counts: ATAC counts
    TODO_factor_table: ATAC sample metadata
  out: [{id: TODO_result}, {id: TODO_normalized}, {id: TODO_plots}]
  _plan_state:   "factor=condition (2 levels) from metadata; reduce whole counts list;
                  emit results+normalized+plots; downstream assumes c3=log2FC, c7=padj"
  _plan_context: "identity from IWC rnaseq-de exemplar (Medium); UC3 gives one counts
                  collection + sample_metadata, not the exemplar 2-collection idiom"
  _plan_in:      "TODO_counts→countsFile/select_data; TODO_factor_table→metadata TSV"
  _plan_out:     "TODO_result→clean/filter/volcano; normalized+plots promoted"
```
*Topology concrete (edges below); wrapper, version, ports all `TODO`; full planning intent carried.*

## Tier 2 — Identity-pinned  *(real: `galaxy-workflow-draft.gxwf.yml`)*

```yaml
DESeq2 differential test:
  tool_id: toolshed.g2.bx.psu.edu/repos/iuc/deseq2/deseq2   # identity pinned on exemplar evidence
  tool_version: TODO                                        # version still deferred
  in:
    TODO_counts: ATAC counts
    TODO_factor_table: ATAC sample metadata
  out: [{id: TODO_result}, {id: TODO_normalized}, {id: TODO_plots}]
  _plan_state:   "…"   # intent retained for the per-step loop to discharge
  _plan_context: "…"
  _plan_in:      "…"
  _plan_out:     "…"
```
*`tool_id` now concrete; `tool_version` + ports still `TODO`; `_plan_*` retained. Pinned only because an exemplar named the wrapper — never on plausibility.*

## Tier 3 — Resolved  *(real: `galaxy-workflow.gxwf.yml` loop endstate)*

```yaml
DESeq2 differential test:
  tool_id: toolshed.g2.bx.psu.edu/repos/iuc/deseq2/deseq2/2.11.40.8+galaxy2
  tool_version: 2.11.40.8+galaxy2
  tool_shed_repository: {changeset_revision: 6c363db8c702, name: deseq2, owner: iuc,
                         tool_shed: toolshed.g2.bx.psu.edu}
  in:
    select_data|countsFile:   {source: ATAC counts}            # real wrapper ports
    select_data|sample_sheet: {source: ATAC sample metadata}
  out: [{id: deseq_out}, {id: counts_out}, {id: plots}]        # real output names
  tool_state:
    select_data:
      how: sample_sheet_contrasts
      design_formula_mode:
        factor: ["2"]          # ◄ COLUMN INDEX — not "condition". gxwf rejected the name.
        reference_level: control
    output_options: {output_selector: [pdf, normCounts]}
    …                           # full tool_state bound
  # no _plan_* — planning intent discharged
```
*Wrapper version + changeset pinned, real ports bound, `tool_state` complete, planning fields gone.*

---

## Fixed topology (constant across all three tiers)

The edge graph for this step never changes — only the wrapper tier resolves:

```
[ATAC counts] ─────────────┐
                           ▼
[ATAC sample metadata] ─► DESeq2 differential test ─► result ─► Clean DESeq2 table ─► …
                           ├─► normalized counts  (promoted output)
                           └─► diagnostic plots   (promoted output)
```

## Promotion + validation (the endstate)

Tier 3 has no `TODO`/`_plan_*` anywhere, so the draft promotes whole: `class: GalaxyWorkflowDraft` → `class: GalaxyWorkflow`, no transformation. `gxwf validate` on the promoted workflow:

- **Structural validation: OK.**
- **`tool_state`: 5 validated OK** (DESeq2, 2× `tp_awk_tool`, `Filter1`, `tp_sort_header_tool`, `tp_tail_tool`), **2 skipped** (`volcanoplot`, `tp_head_tool` — not in the local tool cache, a coverage gap, not a defect).

**The schema-catch (annotation on Tier 3):** the first hand-authored Tier-3 `tool_state` set `design_formula_mode.factor: ["condition"]` — the factor *name*, which a fluent model writes by default. `gxwf validate` rejected it: the field is a **column index**, `"2"`. Corrected → validates. This is "under-determination as a typed state" closing the loop — the deferred step resolves, and the schema, not a prose caveat, catches the fabrication that resolution introduced.

---

## Panel layout sketch (for the designer)

Three columns left→right (Deferred · Identity-pinned · Resolved), the **fixed topology strip drawn once across the top** spanning all three to show it does not change. Within each column, the DESeq2 step block; highlight what hardens between columns:

```
        ┌───────────── fixed topology (counts + metadata → DESeq2 → result/…) ─────────────┐
        │                                                                                  │
  ┌─────────────┐            ┌─────────────┐               ┌─────────────────────────┐
  │  DEFERRED   │  ──────►   │ IDENTITY-   │   ──────►      │       RESOLVED          │
  │ tool_id:TODO│            │  PINNED     │               │ deseq2/…/2.11.40.8+gal2 │
  │ ports: TODO │            │ tool_id ✓   │               │ real ports + tool_state │
  │ _plan_* ████│            │ ver: TODO   │               │ factor:["2"] ◄ schema   │
  │             │            │ _plan_* ██  │               │ no _plan_*              │
  └─────────────┘            └─────────────┘               └───────────┬─────────────┘
   evidence: none yet         exemplar pins id              promote ▼ class: GalaxyWorkflow
                                                            gxwf validate ✓ (5 ok / 2 cache-skip)
```

Visual encoding: `_plan_*` shrinks column-to-column (intent discharged); `TODO` tokens turn concrete; the green `gxwf ✓` and the `factor:["2"]` catch anchor the right edge.

## Honesty notes

- **Tier 1 is reconstructed**, not a captured artifact — the template Mold went straight to identity-pinned here because the exemplar supplied the wrapper identity. The deferred tier is real *schema-permitted* state (the format allows `tool_id: TODO`), shown so the figure spans the full progression. Label it as reconstructed in the caption, or drop to a two-tier figure (Identity-pinned → Resolved, both real) if a reviewer objects to the synthetic tier.
- This is a **UC3 dev run on a domain stand-in fixture** (yeast counts), so the figure is a *mechanism illustration over a real draft snapshot* — same status as Figure 6 — not case-study evidence. Keep it out of the Evidence results table.
- Tiers are trimmed; the untrimmed artifacts are the cited source files for SI.
- The `gxwf` binary used was `gxwf 1.0.0`; two `tool_state`s were cache-skipped, so the green check covers 5 of 7 wrapped steps statically. A clean case-study run should validate against a fuller cache (and run `planemo`).
