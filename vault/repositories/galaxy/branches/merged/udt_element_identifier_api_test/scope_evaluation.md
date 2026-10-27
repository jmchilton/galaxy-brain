# Scope evaluation (pass 2, after re-scope)

**Recommendation: expand modestly, once more.** Keep everything implemented: the UDT evaluator fix (`791a5e46b83`) and the converted-input carry (`d5ddac3f416`). Then add a **job-cache guard** in `managers/jobs.py` `_build_stmt_for_hda`: when the request has no identifier for input `k`, reject cached jobs that recorded a `{k}|__identifier__` parameter (a NOT EXISTS on `JobParameter`). Add one red-to-green `use_cached_job` API test with it. This is the only option that fully closes the Codex P1, which this branch turns from harmless into wrong output for UDTs. It also fixes the same pre-existing hole for XML/Cheetah tools. The change only makes caching stricter: it causes extra misses, never wrong hits. **The plain-dataset HDA-name fallback does not resolve the P1 in general.** It only makes the outputs agree when an element's identifier equals its HDA name. A list built from existing datasets with renamed identifiers still gets the mapped job's identifier back from the cache. So the fallback should stay a separate product call for John (lean yes, for parity with labels and Cheetah), decoupled from the cache fix. Fixing Cheetah's converted-input lookup is an optional third addition and ranks below the cache guard. Everything else stays out. Since this is the second evaluation, any expansion parks the branch as BLOCKED for John.

## Possible Decompositions

The branch is 166 insertions over 8 files: about 33 production lines, and the rest is tests and populator helpers. Current SHAs on base `51e0a80a0db`:

- **A. As committed: one PR, plus an optional baseline split.** (1) `22568e89198` Baseline tests: `TOOL_WITH_ELEMENT_IDENTIFIER`, the workflow-builder kwargs, and the plain-dataset `null` and workflow map-over baselines. (2) `791a5e46b83` The UDT fix and its `/api/tools` and `/api/jobs` red tests. (3) `d5ddac3f416` The converted-input carry and its red test.
- **B. With the recommended cache guard.** (1) Job-cache guard plus its API test, as a standalone job-cache correctness fix. It is independent of the UDT work: an XML-tool test can show the hole on base, so it could land first. (2) Baselines. (3) The UDT fix plus the converted-input carry.
- **C. Everything a reviewer might want, split by concern.** (1) Cache guard. (2) Baselines. (3) The UDT fix. (4) The converted-input carry plus the Cheetah parent-keying fix, as an "identifiers across implicit conversion" PR covering both tool flavors. (5) The plain-dataset name fallback, which flips the `null` baseline, so its semantics get reviewed alone.

## Scope: as implemented (keep)

The UDT evaluator reads the persisted `<name>|__identifier__` params through `ElementIdentifierMapper.identifiers_by_dataset_id` and passes the result to runtimeify (`/api/jobs`) and legacy `to_cwl` (`/api/tools`). `process_dataset` copies the transient identifier onto implicitly converted HDAs, so the converted mapped-over inputs get it too.

| Pros | Cons |
|---|---|
| <ul><li>Reuses Cheetah's source of truth. No tool-state changes.</li><li>Small (about 33 production lines), with red-to-green API tests for both submission paths and the converted case.</li><li>Fixes the disagreement between output labels and the command line for mapped-over jobs.</li></ul> | <ul><li>**It introduces a wrong-output job-cache hit for UDTs (Codex P1).** A plain run on HDA D can reuse a mapped job that ran on D and get the element identifier instead of `null`.</li><li>Plain datasets still render `null`, which diverges from the labels and from Cheetah.</li><li>Cheetah's `$input.element_identifier` for converted mapped-over inputs still falls back to the HDA name.</li></ul> |

## Scope: + job-cache guard for unidentified requests (recommended)

In `_build_stmt_for_hda`, the `elif require_name_match` path (when `identifier` is falsy) adds a condition: no `JobParameter` on the candidate job named `{k}|__identifier__`. A plain request then never reuses a job that was mapped over a collection. Identified requests keep matching on the exact identifier, as they do today.

| Pros | Cons |
|---|---|
| <ul><li>The only option that closes P1 for every naming situation.</li><li>Fixes the regression this branch creates. Before the branch, both runs rendered `null`, so reuse was harmless.</li><li>Also fixes a latent XML/Cheetah bug in the same pattern (see details).</li><li>Stricter only: the cost is extra cache misses for plain runs on datasets that were once mapped over, never wrong outputs.</li><li>About 5–10 lines. `test_run_cat1_use_cached_job_build_list` (`test_tools.py:1707`) is the precedent for the test.</li></ul> | <ul><li>Touches `managers/jobs.py`, which the branch doesn't touch yet. Cache SQL draws careful review.</li><li>Changes cache behavior for all tools, not just UDTs. Some legitimate reuse for tools that never read `element_identifier` is lost. Galaxy can't tell which tools read it.</li><li>Needs an API test with `use_cached_job`. That is a longer API run, done one at a time.</li></ul> |

<details><summary>Why the fallback doesn't substitute for this (from reading the code, not run)</summary>

- When `identifier` is falsy, `_build_stmt_for_hda` (`managers/jobs.py` ~L825-870) adds only `b.name == c.name`, plus the HDA-history name check.
  - For a plain run on D, `b` is D itself, or a copied element sharing `dataset_id` and name.
  - So the guard is trivially true.
- `|__identifier__` is skipped in both the parameter loop (L641/L743) and the parameter-count check (L669/L675). Nothing else distinguishes the mapped job from the plain one.
- Take a list built from existing HDAs, where element `sample_a` is HDA D named `foo.fastq`:
  - The mapped job renders `sample_a`.
  - A plain run on D would render `null` today, or `foo.fastq` with the fallback.
  - Either way the cache hands back `sample_a`.
  - The fallback only fixes it when identifier == name, which is the fetch-created case the tests use.
- XML tools already have this hole on base. Cheetah's plain fallback is `foo.fastq`, but the cached mapped job's output came from `sample_a`. Codex's "mostly masked" holds only when names equal identifiers.
- Confidence: high from the query structure. It hasn't been run, because API runs weren't allowed in this pass.
</details>

## Scope: + plain-dataset HDA-name fallback (John's call, lean yes, decoupled from P1)

When no identifier was recorded, the UDT path supplies `hda.name` as `element_identifier`. That matches `labels.py` `_dataset_attribute` and `DatasetFilenameWrapper.element_identifier`.

| Pros | Cons |
|---|---|
| <ul><li>The command line, labels and Cheetah agree for every input shape. That is the issue's complaint, generalized.</li><li>Tools can use `element_identifier` unconditionally for sample naming, as XML tools do.</li><li>It makes cache reuse harmless in the common case where the identifier equals the name.</li></ul> | <ul><li>**It doesn't fix P1** when the identifier differs from the name (see above), so it can't replace the cache guard.</li><li>It's a semantic choice. CWL-style `null` lets a tool tell mapped inputs from unmapped ones (`$(inputs.x.element_identifier \|\| inputs.x.basename)`).</li><li>Flips the pinned `null` baseline test.</li><li>Confining it to UDTs means `to_cwl` needs a flag, or the evaluator has to fill the map, so workflow expression steps stay unaffected.</li></ul> |

## Scope: + Cheetah converted-input identifier (optional, modest)

`__populate_wrappers` builds `ElementIdentifierMapper` from `job.io_dicts()` (keyed by the converted HDA) but queries it with `input_values[input.name]` (the original HDA). XML `$input.element_identifier` therefore misses and falls back to the name. The fix is to key the mapper by the converted HDAs' parents as well, or to query by the converted HDA. It needs a new tabular-only XML test tool.

| Pros | Cons |
|---|---|
| <ul><li>Finishes what `d5ddac3f416` started: identifiers survive implicit conversion for both tool flavors.</li><li>Touches `wrappers.py` and the conversion path, which the branch already changes. This is the "related bug in touched code" case.</li><li>Two reviews raised it (the rescope review and issue open question 2).</li></ul> | <ul><li>XML-tool behavior change, which goes beyond the UDT bug.</li><li>Needs a new test tool XML plus tool-conf wiring.</li><li>Lower value than the cache guard: the wrong output is a name rather than a cross-run cache hit.</li></ul> |

## Scope: per-input identifier keying (Codex P2 from pass 1), not recommended

Key identifiers by parameter path instead of dataset id.

| Pros | Cons |
|---|---|
| <ul><li>Correct when the same HDA is both a mapped element and a direct input.</li></ul> | <ul><li>Cheetah's mapper has the same collapse, so fixing only UDTs would make them diverge.</li><li>Needs parameter paths threaded through `adapt_dataset`. The case is rare.</li></ul> |

## Scope: carry identifiers per input instead of on the transient ORM attribute, not recommended

This is the thermo review's structural note: carry identifiers by input name through batch expansion instead of monkey-patching `hda.element_identifier`.

| Pros | Cons |
|---|---|
| <ul><li>Removes an implicit data flow that `d5ddac3f416` adds one more hop to.</li></ul> | <ul><li>The pattern predates this branch (`meta.py:508/544`).</li><li>It means restructuring the expansion path, far past this fix.</li></ul> |

## Scope: record `{"src": "dce"}` in job tool state, not recommended

Batch expansion records the DCE, so runtimeify's existing DCE branch would cover `/api/jobs`.

| Pros | Cons |
|---|---|
| <ul><li>Identifiers would come from the model, not from a side-channel param.</li></ul> | <ul><li>Touches tool state and cache matching for every mapped-over tool.</li><li>Doesn't help `/api/tools`, which has no `job.tool_state`.</li><li>It's a separate design change.</li></ul> |

## Scope: route `/api/tools` UDTs through runtimeify, not recommended

This would delete the `to_cwl` threading, the thermo review's code-judo move.

| Pros | Cons |
|---|---|
| <ul><li>One consumer, less plumbing in a shared workflow function.</li></ul> | <ul><li>Changes behavior for every legacy-path UDT.</li><li>Much larger than the bug.</li></ul> |

## Scope: backport to `release_26.1` / `release_26.0`, not recommended

| Pros | Cons |
|---|---|
| <ul><li>The bug exists on the releases too.</li></ul> | <ul><li>`runtime.py`, `evaluation.py` and `modules.py` have diverged heavily: 26.1 has no `shell_quotable` or deferred plumbing, and 26.0 has no runtimeify.</li><li>A backport would be a rewrite, better done as a follow-up once dev lands.</li><li>The cache guard alone could be backported separately if John wants the XML fix on releases.</li></ul> |
