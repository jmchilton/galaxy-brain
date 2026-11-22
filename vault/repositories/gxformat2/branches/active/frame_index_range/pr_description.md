Follow-up to 🔀 #293 - frame `contains_steps`/`contains_comments` indices past the end of the step or comment list are now lint errors instead of dangling `child_steps`.

#293 checked frame labels but left integer and digit-string indices alone; its reviews flagged that out-of-range ones still convert silently:

```yaml
inputs:
  input1: {type: data}
steps:
  cat_step: {tool_id: cat1, in: {input1: input1}}
comments:
  - type: frame
    title: Range
    contains_steps: [1, "2", 999, -1]   # valid step ids are 0 and 1
    contains_comments: [1]              # only comment 0 exists
```

| | `main` | this branch |
|---|---|---|
| `lint_format2` | nothing | 4 errors, e.g. `Frame 'Range' references out-of-range step index '999' in contains_steps` (`FrameReferenceNotFound`, `/comments/0/contains_steps/2`) |
| `python_to_workflow` | `child_steps` pointing at steps that don't exist | `ValueError` with the same message as lint |

The check lives in the same resolver #293 added, `NormalizedFormat2.unresolved_frame_references`, so lint and conversion still agree. `contains_steps` indices are native step ids, inputs first then steps, so the range is `0 <= i < len(inputs) + len(steps)`; `contains_comments` indices range over the comments. **Labels still win: a step labeled `"7"` resolves as that label even when 7 is past the end, matching conversion's labels-first lookup.** Digit strings in `contains_comments` remain labels, as before.

<details><summary>Tested cases</summary>

- `synthetic-frame-index-out-of-range.gxwf.yml`: int, digit-string, too-large and negative step indices plus an out-of-range comment index; four lint errors and a conversion error.
- `synthetic-frame-digit-label.gxwf.yml`: a step labeled `"7"` referenced as `"7"` lints clean and converts to `child_steps: [1, 0]`.
- A 5000-digit index string reports out-of-range instead of tripping Python's `int()` digit limit.
- All red on `main`, green here.

</details>

Over IWC (160 frames), nothing references an out-of-range index.

The cases are declarative (`lint_format2.yml`, `to_native.yml` plus two fixtures), so the TypeScript port in jmchilton/galaxy-tool-util-ts#237 syncs them unchanged.

Not in this PR (same as #293):
- Lint messages from a subworkflow still carry the parent's JSON pointer.
- Best-practice rules still check only the top level.
- No native (`.ga`) `child_steps` checks.

## Risks

Risks are minimal. The new error fires only on indices that pointed at no step or comment, which Galaxy can't place in a frame anyway. This is a two-way door.

## Context

Builds on 🔀 #293. The TypeScript port is jmchilton/galaxy-tool-util-ts#237.

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Resolution order moved into one method with early returns; no behavior change.</summary>

- Replaced an `if/elif` chain with a `problem = None` sentinel by `_FrameRefCheck.problem`, which states the order: labels, then digit index, else unknown label.
- Checks are built once per workflow rather than per frame.
- Kept as is: `_format2.py` is near 1k lines but the branch shrinks it; field config stays on the check tuple.

[Full report](https://galaxy-brain.jmchilton.net/repositories/gxformat2/branches/frame_index_range/thermo_nuclear_review/). Run via Claude Opus 5.5 at low effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>One finding, fixed: very long digit strings crashed <code>int()</code> instead of reporting out-of-range.</summary>

- Strings over Python's 4300-digit `int()` limit raised `ValueError` out of lint. `_index_in_range` now rejects strings longer than the count's digits before converting. Red-to-green test added.

[Full report](https://galaxy-brain.jmchilton.net/repositories/gxformat2/branches/frame_index_range/codex_review/). Run via gpt-6-sol at medium effort.

</details>
