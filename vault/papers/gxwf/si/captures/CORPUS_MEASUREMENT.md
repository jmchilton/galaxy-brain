# IWC Corpus Measurement — gxwf validate/roundtrip

Captured 2026-06-22. Audit trail for the manuscript line-86 numbers + Axis-4 finding.

## Provenance
- IWC corpus commit: `ed959c92a` (2026-05-28), `~/projects/repositories/iwc/workflows`, **122 `.ga` workflows**.
- gxwf: `@galaxy-tool-util/cli` (homebrew global; `--version` misreports 1.0.0).
- Tool cache: default location, ~545 tools. **Coverage: 514/551 distinct corpus tool versions cached (93%) at run time** (4 more added during diagnosis → 518). 37 versions uncached; topping up the rest was blocked by a backgrounded-`add` TTY hang (see below), so uncached steps are bucketed separately rather than counted as failures.
- Commands (cache-only, no network):
  - `gxwf validate-tree <iwc> --json > corpus-validate.json`
  - `gxwf roundtrip-tree <iwc> --json > corpus-roundtrip.json` (gzipped here)

## Validation (default mode, tool-state)
- Tool steps: **2741 ok / 0 fail / 0 error / 67 skipped (uncached)**, total 2808.
- Per-workflow: **106 fully clean**, **16 clean-except-uncached-tools**, **0 with tool-state failures**, 0 with workflow-level errors.
- **No tool-state validation errors anywhere in the current corpus.** Consistent with IWC already gating contributions on `gxwf validate --strict` in CI — the corpus is clean by construction. The "auto-cleanable" / "human-attention" diagnostic buckets are ~empty on this snapshot; a non-trivial finding there would require historical (before/after) analysis of the corpus.
- Connection validation is NOT aggregated by `validate-tree` (the `--connections` report is a single-file flag); corpus-wide connection stats still TODO via a per-file loop.

## Round-trip (native → format2 → native)
- 122 total: **1 byte-identical**, **76 benign-only diffs** (→ **77 round-trip successes**), **45 "failed"**.
- **errorDiffs: 0** across all 122 — i.e. **0 state-altering diffs. The conversion never alters preserved state.** (4376 benign diffs total: UUID regen, key reorder.)
- The 45 "failures" are all `failureClass: conversion_error` = the *reimported* state fails post-conversion **schema** validation. They are NOT diffs (the failing steps show `diffs: []`). Split per-workflow:
  - **7 failed only because of uncached tools** ("tool not resolved …") — measurement artifact of the 93% cache, not a workflow finding.
  - **38 failed with ≥1 cached tool whose reimported state is missing a required parameter / fails a conditional-case check** — the real signal.

### Modal finding — tools behind the 38 (cached-schema post-conversion failures)
| count (step-level) | tool |
|---|---|
| 43 | `compose_text_param` |
| 10 | `macs2_callpeak` |
| 6 | `busco` |
| 4 | `calculate_numeric_param` |
| 3 | `scanpy_filter` |
| 4 | `meryl` / `meryl_count_kmers` |
| ~4 | qiime2 (`dada2`, `diversity`) |

Modal tool: **`compose_text_param`** (IUC), via its `components` repeat + `param_type` conditional.

### Worked example (verbatim)
`computational-chemistry/fragment-based-docking-scoring/fragment-based-docking-scoring.ga`, step 9, `iuc/compose_text_param/0.1.1`:
```
state failed post-conversion validation:
  components.1.param_type.component_value: is missing;
  components.1.param_type.select_param_type: Expected "text", actual "float";
  components.1.param_type: Expected undefined, actual {"select_param_type":"float"};
  components: Expected undefined, actual [{"param_type":{"select_param_type":"text",
    "component_value":"$SuCOS_Score >= "}},{"param_type":{"select_param_type":"float"}}]
diffs: []
```
This is the **cascading-conditional-selector** pattern (the figS2 caveat): the `float` case of `select_param_type` is reported as unexpected (validator appears to model only the `text` case) and the cascade collapses into parent-object mismatches.

## INTERPRETATION — needs triage (do NOT assert a cause in the manuscript yet)
`diffs: []` + `errorDiffs: 0` ⇒ the round-trip **preserves** state; this is **not** conversion data-loss. The open question is why the *reimported* state fails post-conversion schema validation while forward `validate-tree` (default) reported 0 failures. Candidate causes:
1. **Validator/schema gap** — the parsed tool schema doesn't model the `float` (or other) conditional case, so legal state is rejected. (If so: a real validator bug to file; weakens nothing about conversion, but the depth claim's floor.)
2. **Validation-profile asymmetry** — post-conversion validation enforces required-param presence; forward default mode does not. Benign; reframe as "strict surfaces latent state gaps."
3. **Genuinely stale source state** — the published workflow omits a now-required param. The manuscript's exact "latent inconsistency the round-trip surfaces" story.

Resolving (1) vs (2)/(3) requires inspecting `compose_text_param`'s parsed schema cases vs the tool XML. **This is the highest-value next analysis and an author/dev judgment call.**

## Known measurement gap
- Backgrounded `galaxy-tool-cache add` hangs without a controlling TTY (network fetch blocks); individual foreground `add` is ~1s. Top-up of the 37 uncached versions left incomplete. Re-run cache top-up in small foreground batches, then re-measure to drive uncached skips → 0 and confirm the 7 uncached-only roundtrip failures clear.
