Fix 🎯 #225 - an unknown label in a frame's `contains_steps` passes `gxwf lint` and converts to `child_steps: [null]`.

With the issue's workflow (one frame with `contains_steps: []` and one with `contains_steps: [cat_stepp]`, where the step is `cat_step`):

```console
$ gxwf lint --skip-state-validation frame-labels.gxwf.yml
Structural lint errors:
  Frame 'Typo' references unknown step or input label 'cat_stepp' in contains_steps
Best practices warnings:
  ...
  Frame 'Empty' contains no steps or comments.
$ echo $?
2
$ gxwf convert --to native frame-labels.gxwf.yml
Conversion failed: Frame 'Typo' references unknown step or input label 'cat_stepp' in contains_steps
$ echo $?
1
```

On `main`, lint reports neither frame. `convert` writes `child_steps: [null]` (`parseInt("cat_stepp")` gives `NaN`), and Galaxy rejects that at import with `HTTP 400: Input should be a valid integer in ('frame', 'child_steps', 0)`, which points nowhere near the typo.

The messages, rule names and fixtures are identical. The cases are declarative and synced from that branch: five fixtures plus cases in `lint_format2.yml`, `lint_best_practices_format2.yml` and `to_native.yml`.

- **Lint**: `FrameReferenceNotFound` is a structural error for each `contains_steps` / `contains_comments` entry that names nothing, pointing at `/comments/<i>/<field>/<j>`. `FrameIsEmpty` is a best-practice warning for a frame with no steps and no comments.
- **Conversion**: `toNative` throws the same message instead of writing `null`. `gxwf convert` prints it as `Conversion failed: …` and exits 1, where it used to dump a stack trace. `convert-tree` already catches errors per file, so it lists the bad file as `ERROR (…)` and converts the rest.
- **One label set**: lint and conversion share `format2StepLabelIndices` (input `id`, step `label ?? id`), so lint can't pass a frame that conversion rejects. **A step with an explicit `label` must be referenced by that label, not its `id` or map key; conversion only ever resolved the label.** Integers and all-digit strings stay step indices.

<details><summary>Smaller behavior notes</summary>

- Dict-form comments now keep an explicit `label` over the map key, matching Python (`_normalize_comments`). Before, the key won.
- A non-frame comment carrying `contains_comments` with an unknown label still throws `contains_comments references unknown comment label '…'`, as on `main`.
- In gxwf-web, conversion errors reach the generic handler, which answers 500 with the message.

</details>

**`gxwf validate --connections` converts to native internally, so a bad frame now stops it with an uncaught error instead of passing.** Every existing conversion error behaves the same way, e.g. an unknown `contains_comments` label on `main`. Turning those into a report belongs with #220.

Not in this PR:
- `gxwf validate` doesn't change. Cross-references are lint's job; `validate` doesn't catch a dangling `outputSource` either.
- Integer or digit-string indices past the end of the step list still pass.
- Lint messages from a subworkflow keep the parent's JSON pointer, and best-practice rules check only the top level. That holds for every rule, matching gxformat2.
- No native `child_steps` lint, and no change to #171 (frame `color`).

## Risks

Risks are minimal. The new lint error fires on workflows Galaxy can't import, and `FrameIsEmpty` is a warning. The one API-visible change is that `toNative` now throws where it used to return `null` children. This is a two-way door.

## Context

Port of galaxyproject/gxformat2#293 (galaxyproject/gxformat2#292); fixtures are synced from that branch until it merges.

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Two structural cleanups, no behavior change.</summary>

- `format2CommentList` now takes the workflow, which drops three duplicated `.comments` casts.
- `convertWorkflow` was pulled out of `convert.ts`, so the error handling wraps one call and cache errors aren't reported as conversion failures.
- Left alone: small near-duplicate array helpers, and the separate `commentLabelMap` that keeps the non-frame `contains_comments` error.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy-tool-util-ts/branches/issue_225_frame_labels/thermo_nuclear_review/). Run via Claude Opus 5.5 at low effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>Fixed a regression: an unknown <code>contains_comments</code> label on a non-frame comment had lost its error.</summary>

- Restored the `main` error for an unknown `contains_comments` label on a non-frame comment, which the first commit had turned into `null` children. A test now covers it.
- Not changed: dict-form explicit `label` precedence is intentional, for Python parity. Subworkflow lint pointers are existing behavior shared by every nested message.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy-tool-util-ts/branches/issue_225_frame_labels/codex_review/). Run via gpt-6-sol at medium effort.

</details>
