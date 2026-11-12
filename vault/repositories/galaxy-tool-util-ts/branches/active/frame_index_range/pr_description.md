Follow-up to 🔀 #227 - frame `contains_steps`/`contains_comments` indices past the end of the step or comment list are now lint and conversion errors instead of dangling `child_steps`.

#227 checked frame labels but left integer and digit-string indices alone, so out-of-range ones still converted silently:

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
| `gxwf lint` | nothing | 4 errors, e.g. `Frame 'Range' references out-of-range step index '999' in contains_steps` (`FrameReferenceNotFound`, `/comments/0/contains_steps/2`) |
| `gxwf convert --to native` | `child_steps` pointing at steps that don't exist | `Conversion failed:` with the same message as lint, exit 1 |

The check lives in the resolver #227 added, `unresolvedFrameReferences`, so lint and conversion still agree. `contains_steps` indices are native step ids, inputs first then steps, so the range is `0 <= i < inputs + steps`; `contains_comments` indices range over the comments. **Labels still win: a step labeled `"7"` resolves as that label even when 7 is past the end, matching conversion's labels-first lookup.** Digit strings in `contains_comments` remain labels, as before.

<details><summary>Tested cases</summary>

- `synthetic-frame-index-out-of-range.gxwf.yml`: int, digit-string, too-large and negative step indices plus an out-of-range comment index; four lint errors and a conversion error.
- `synthetic-frame-digit-label.gxwf.yml`: a step labeled `"7"` referenced as `"7"` lints clean and converts to `child_steps: [1, 0]`.
- A 5000-digit index string reports out-of-range (`Number()` gives `Infinity`), matching gxformat2's guard.
- Non-integer numbers such as `-0.5` are skipped, as gxformat2 skips non-`int` entries.
- Out-of-range cases red on `main`, green here; the digit-label cases guard label-first precedence.

</details>

The messages, rule names and fixtures are identical to galaxyproject/gxformat2#298. The declarative cases (`lint_format2.yml`, `to_native.yml` plus two fixtures) are synced unchanged from that branch.

Not in this PR (same as #227):
- Lint messages from a subworkflow still carry the parent's JSON pointer.
- Best-practice rules still check only the top level.
- No native (`.ga`) `child_steps` checks.

## Risks

Risks are minimal. The new error fires only on indices that pointed at no step or comment, which Galaxy can't place in a frame anyway. This is a two-way door.

## Context

Port of galaxyproject/gxformat2#298; fixtures are synced from that branch until it merges. Builds on 🔀 #227.

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Replaced positional check tuples with a named <code>FrameRefCheck</code> and an early-return helper; no behavior change.</summary>

- `frameRefProblem` follows gxformat2's `_FrameRefCheck.problem` order: labels, then digit index, else unknown label, so the two ports diff line for line.
- Kept as is: no explicit long-digit guard (`Number()` already gives `Infinity`), and `labels` stays structurally typed rather than unifying the step `Map` and comment `Set`.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy-tool-util-ts/branches/frame_index_range/thermo_nuclear_review/). Run via Claude Opus 5.5 at low effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings.</summary>

- Reviewed against the gxformat2 branch; no parity defects or duplicated logic.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy-tool-util-ts/branches/frame_index_range/codex_review/). Run via gpt-6-sol at medium effort.

</details>
