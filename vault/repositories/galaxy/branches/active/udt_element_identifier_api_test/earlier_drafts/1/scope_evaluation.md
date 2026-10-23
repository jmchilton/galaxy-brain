# Scope evaluation

**Recommendation: expand modestly.** Keep the as-implemented fix, which reads the persisted `<name>|__identifier__` into both `setup_for_runtimeify` and `to_cwl`, and add two things. (1) Carry the transient `element_identifier` onto implicitly converted HDAs in `process_dataset` (`lib/galaxy/tools/actions/__init__.py` ~L207-217). That is about 3 lines plus 1 API test. The existing L558 loop then persists `|__identifier__` for converted mapped-over inputs, and the branch's resolved-HDA lookup picks it up with no further changes. It also fixes the same bug for XML/Cheetah tools, which today fall back to the converted HDA's name. (2) For plain (non-mapped) datasets, fall back to the HDA name in the UDT evaluator path only, which gives parity with `labels.py` and with Cheetah. The `null` baseline test flips in the fix commit. Do (1) before (2), or the fallback yields the converted HDA's name. (2) is the more debatable half: if John wants CWL-style `null` for unmapped inputs, take only (1). Leave out per-input keying (Codex P2), recording `{"src": "dce"}` in the tool state, routing `/api/tools` UDTs through runtimeify, and a backport.

## Possible Decompositions

The branch is 167 insertions over 7 files: about 30 production lines, and the rest is tests and populator helpers.

- **A. Two PRs, as committed.** (1) `414a1fcb686` Baseline tests: `TOOL_WITH_ELEMENT_IDENTIFIER`, `get_collection_element_contents`, and the plain-dataset and workflow map-over baselines. (2) `4a7dfd2c555`: the fix, `tool_request_raw(tool_uuid=)`, and the 2 red mapped-over API tests.
- **B. Split the fix by consumer.** (1) Baselines and helpers. (2) `ElementIdentifierMapper.identifiers_by_dataset_id`, the runtimeify `adapt_dataset` change, and the `/api/jobs` test. (3) `to_cwl` threading and the `/api/tools` test, which also adds the DCE `element_identifier` for workflow expression steps.
- **C. With the recommended expansion.** (1) The `actions/__init__.py` converted-HDA carry and a Cheetah-tool API test, as a standalone XML-tool bug fix (it can land first, independently). (2) Baselines. (3) The UDT fix. (4) The plain-dataset name fallback, which flips the `null` baseline. That way the fallback semantics question is reviewed on its own.

## Scope: as implemented

The UDT evaluator builds `{input dataset id: identifier}` from the persisted `|__identifier__` job params via `ElementIdentifierMapper` and passes it to runtimeify (`/api/jobs`) and legacy `to_cwl` (`/api/tools`). The tool-form/API map-over then renders each element's identifier, matching workflow map-over and output labels.

| Pros | Cons |
|---|---|
| <ul><li>Reuses Cheetah's existing source of truth (`ElementIdentifierMapper` plus job params). No tool-state or job-cache changes.</li><li>Small: about 30 production lines. Red-to-green API tests cover both submission paths.</li><li>Fixes the label vs command-line disagreement for mapped-over jobs.</li></ul> | <ul><li>Implicitly converted mapped-over inputs still render `null`.</li><li>Plain datasets render `null`, while the UDT's own output labels and Cheetah render the HDA name. The same job can still give the label and the command different answers.</li><li>`to_cwl` now emits `element_identifier` for DCEs in workflow expression steps too. The change is additive, but it reaches beyond UDTs.</li></ul> |

## Scope: + carry identifier onto implicitly converted inputs (recommended)

In `process_dataset`, read `getattr(data, "element_identifier", None)` before swapping in the converted HDA and set it on the converted HDA. The existing persistence loop and this branch's lookup then cover converted inputs, for both UDT and Cheetah tools.

| Pros | Cons |
|---|---|
| <ul><li>About 3 lines in code the issue already names. It closes open question 2 of the issue draft.</li><li>Fixes a real XML/Cheetah bug: `$input.element_identifier` for a converted mapped-over input currently falls back to the converted HDA's name, not the element identifier. This needs a test to confirm the exact name the converter assigns.</li><li>No changes are needed in the UDT code this branch adds. The resolved-HDA lookup already keys on the converted id.</li></ul> | <ul><li>Changes Cheetah output for converted mapped-over inputs. The normal review deferred it for that reason, but that is the "related bug in touched code" reason the process says to override.</li><li>Sets a transient attr on a possibly shared, cached converted HDA. The last write wins if two mapped collections share an element, which is the same collapse as today's originals.</li><li>Job cache: new jobs record `|__identifier__` for converted inputs, so `managers/jobs.py` (~L849) will require an identifier match. Older cached jobs without the param likely miss the cache once.</li></ul> |

## Scope: + plain-dataset name fallback (recommended, debatable)

When no identifier was recorded, the UDT evaluator path supplies `hda.name` as `element_identifier`. It does this in the map or in `adapt_dataset` and `to_cwl` only when called from `UserToolEvaluator`. That matches `labels.py` `_dataset_attribute` and `DatasetFilenameWrapper.element_identifier`.

| Pros | Cons |
|---|---|
| <ul><li>Command line, output labels, and Cheetah agree for every input shape, which is the issue's own complaint generalized.</li><li>Lets tools use `element_identifier` unconditionally for sample naming, as XML tools do.</li><li>Confined to the UDT path, so workflow expression and `when` steps are unaffected.</li></ul> | <ul><li>A semantic choice: CWL-style `null` lets a tool tell mapped inputs from unmapped ones (e.g. `$(inputs.x.element_identifier \|\| inputs.x.basename)`).</li><li>Flips the `null` baseline test in the fix commit (intended, but visible).</li><li>If it's confined to the UDT path, the threading in `to_cwl` needs the map or a flag.</li><li>Depends on the converted-input carry landing first.</li></ul> |

## Scope: per-input identifier keying (Codex P2), not recommended

Key identifiers by parameter path instead of dataset id, so that a second input that directly selects an element HDA doesn't inherit its identifier.

| Pros | Cons |
|---|---|
| <ul><li>Correct in a rare edge case.</li></ul> | <ul><li>Cheetah's `ElementIdentifierMapper` has the same collapse, so fixing only UDTs diverges.</li><li>Requires threading parameter paths through runtimeify's `adapt_dataset` callback signature.</li><li>Rare: the same HDA has to be both a mapped element and a direct input.</li></ul> |

## Scope: record `{"src": "dce"}` in job tool state for batch expansion, not recommended

`meta.py` batch expansion records the DCE instead of a bare HDA, so runtimeify's existing DCE branch covers it, and the evaluator mapping is no longer needed for `/api/jobs`.

| Pros | Cons |
|---|---|
| <ul><li>Structurally cleaner: identifiers come from the model, not from a side-channel param.</li></ul> | <ul><li>Touches tool state and job-cache matching for every mapped-over tool, not just UDTs.</li><li>Doesn't help `/api/tools` (`to_cwl`, no `job.tool_state`).</li><li>Is a large, separate design change.</li></ul> |

## Scope: route `/api/tools` UDTs through runtimeify and drop the `to_cwl` threading, not recommended

The thermo-nuclear review's "code-judo" move. It would remove the `element_identifiers` kwarg from all `to_cwl` recursions.

| Pros | Cons |
|---|---|
| <ul><li>One consumer instead of two, and less plumbing in a shared workflow function.</li></ul> | <ul><li>Changes behavior for every legacy-path UDT (`/api/tools` has no `job.tool_state`).</li><li>Is much larger than the bug, and riskier to review.</li></ul> |

## Scope: backport to `release_26.1` / `release_26.0`, not recommended

Retarget the fix to the oldest affected release.

| Pros | Cons |
|---|---|
| <ul><li>UDT map-over is broken on releases too, and Galaxy is liberal about release-branch bug fixes.</li></ul> | <ul><li>Release 26.1 has diverged heavily in the touched files: `git diff 51e0a80a0db origin/release_26.1 --stat` on `runtime.py`, `evaluation.py` and `modules.py` shows 343+/779-, with no `shell_quotable` or deferred plumbing. Release 26.0 has no runtimeify at all.</li><li>A backport would be a separate rewrite rather than a cherry-pick. That's better as a follow-up once dev lands.</li></ul> |

<details><summary>Notes</summary>

- Converted-input flow: `_collect_input_datasets.process_dataset` swaps `data` for the converted HDA before `inp_data[name]` is set. The transient `element_identifier` lives only on the original element HDA, so the L558 loop (`getattr(data, "element_identifier", None)`) skips it, and neither `ElementIdentifierMapper` nor this branch's map sees an identifier.
- Cheetah fallback: `DatasetFilenameWrapper.element_identifier` returns `self.name` when no identifier was passed. `labels.py` `_dataset_attribute` does `getattr(value, "element_identifier", None) or value.name`.
- The job cache already treats `|__identifier__` specially (`managers/jobs.py` L641, L743, L849). Writing the param for converted inputs makes those conditions apply to them too.
</details>
