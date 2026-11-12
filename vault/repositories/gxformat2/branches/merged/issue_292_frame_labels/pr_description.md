Fix 🎯 #292 - an unknown label in a frame's `contains_steps` crashes conversion, and lint misses it and empty frames.

One typo in a frame's `contains_steps` is enough to stop a Format 2 workflow from converting, and nothing points at the typo:

```yaml
comments:
  - type: frame
    title: Typo
    contains_steps: [cat_stepp]   # the step is cat_step
```

| | `main` | this branch |
|---|---|---|
| `lint_format2` | nothing | error `Frame 'Typo' references unknown step or input label 'cat_stepp' in contains_steps` (`FrameReferenceNotFound`, `/comments/0/contains_steps/0`) |
| `python_to_workflow` | `ValueError: invalid literal for int() with base 10: 'cat_stepp'` | `ValueError` with the same message as lint |
| `contains_steps: []` | nothing | best-practice warning `Frame 'Empty' contains no steps or comments.` (`FrameIsEmpty`) |

Unknown `contains_comments` labels on a frame get the same lint error. Conversion already rejected those, but with a message that didn't say which frame.

Lint and conversion use one resolver, `NormalizedFormat2.unresolved_frame_references`, and it checks entries against the labels conversion registers: a step's `label or id` and an input's `id`. Lint can't pass a frame that conversion then rejects. **One visible change for authors: a step with an explicit `label` must be referenced by that label, not by its `id` or map key; conversion only ever resolved the label.** Integers and ASCII all-digit strings stay step indices, as before.

<details><summary>What counts as resolved</summary>

- Positive fixture `synthetic-frame-references.gxwf.yml`: an input id, step labels, an integer index, the digit string `"2"`, a comment label, a comment index, and a frame holding only comments (that one isn't "empty"). It lints clean and converts to `child_steps: [0, 1, 2]`.
- `synthetic-frame-step-id-shadowed-by-label.gxwf.yml`: a list-form step with `id: cat_step` and `label: concat`, referenced by its id. Conversion registers only the label, so lint now flags this too.
- Frames inside a subworkflow resolve against that subworkflow's labels (`test_format2_to_native_bad_step_label_in_subworkflow`).
- Frames are named by title, then label, then comment index.

</details>

Over IWC (135 frames), nothing references an unknown label. Four frames would get the empty-frame warning; they have `child_steps: null` in real Galaxy exports (`consensus-peaks-atac-cutandrun.ga` ×3, `Genome_annotation_with_braker3.ga`).

The cases are declarative (`lint_format2.yml`, `lint_best_practices_format2.yml`, `to_native.yml` plus five fixtures), so the TypeScript port in jmchilton/galaxy-tool-util-ts#227 syncs them unchanged.

Not in this PR:
- `validate_format2` doesn't change. Cross-references are lint's job; a dangling `outputSource` doesn't fail validation either.
- Integer or digit-string indices past the end of the step list still pass.
- Lint messages from a subworkflow, frame errors included, still carry the parent's JSON pointer. That's existing behavior for every nested `lint_format2` message.
- Best-practice rules, `FrameIsEmpty` included, still check only the top level.
- No native (`.ga`) `child_steps` checks.

## Risks

Risks are minimal. The new error fires on workflows that conversion already crashed on, plus entries like `"-1"` or `" 2"` that `int()` used to accept as indices, so `planemo workflow_lint` newly fails only workflows Galaxy can't import or that relied on that junk input. `FrameIsEmpty` is a warning in the best-practices profile. This is a two-way door.

## Context

Builds on 🔀 #137 (comment conversion). The TypeScript port is jmchilton/galaxy-tool-util-ts#227, for jmchilton/galaxy-tool-util-ts#225.

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Clean, small change. Resolution logic lives in one place; two copy-paste loops were deduplicated.</summary>

- Folded the duplicated `contains_steps` / `contains_comments` loops into one table-driven loop.
- Added a `_comment_context` lint helper, like `_native_step_context`.
- Restored the base `unknown comment label` error for non-frame comments that carry `contains_comments`. The first commit had turned it into a bare `KeyError`. Test added.
- Kept as is: comment labels are computed both as a set (lint) and as an index map (conversion).

[Full report](https://galaxy-brain.jmchilton.net/repositories/gxformat2/branches/issue_292_frame_labels/thermo_nuclear_review/). Run via Claude Opus 5.5 at low effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>Three findings, all deferred to keep scope: out-of-range indices, nested lint pointers, nested empty-frame checks.</summary>

- Out-of-range integer and digit-string indices still convert to dangling `child_steps`. Deferred as a follow-up.
- Pointers for lint messages inside a subworkflow, and empty-frame checks there, would need changes to every nested lint message and best-practice rule. Fixes were drafted, then dropped from this PR so that behavior changes for all rules together.

[Full report](https://galaxy-brain.jmchilton.net/repositories/gxformat2/branches/issue_292_frame_labels/codex_review/). Run via gpt-6-sol at medium effort.

</details>
