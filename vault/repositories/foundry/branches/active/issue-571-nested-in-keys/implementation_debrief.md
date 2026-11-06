# Implementation debrief

Content-only fix for #571 on `issue-571-nested-in-keys` (base `origin/main` `7453431d`). Part of the skunkworks effort recorded in [#670](../../../issues/needs_decision/670/skunkworks_plan.md).

- `gxformat2-schema` (rev 5): `in:` keys for nested parameters (`|`-joined paths, `_N` for a repeat instance), and what a connection's step part names in list and map form.
- `implement-galaxy-tool-step` (rev 13): `[[gxformat2-schema]]` added as an on-demand reference. Its body already linked the note, but no reference carried it into the cast.
- Casts and Dashboard regenerated.

## Evidence

Ran on `gxwf` 1.15.0, then the same five drafts through `gxformat2` 0.28.0's `validate_draft`. The two agree:

| Draft | Reference | Result |
|---|---|---|
| List form, `id` and `label` present | by label | `draft valid` |
| List form, `id` and `label` present | by id | `references unknown step` |
| Map form, key, `id` and `label` all differ | by key | `draft valid` |
| Map form | by id | `references unknown step` |
| Map form | by label | `references unknown step` |

So this isn't an upstream disagreement, and the sentence stands. I checked validation only. Import into a live Galaxy wasn't run.

## Plan correction

The plan cited `ortho_method|input` from `Functional_annotation_of_sequences`. That key isn't in the workflow at IWC `main`. Its nested keys are `input_type|i`, `input_param_type|input_param` and `style_cond|type_cond|pick_from_0|value`, so the note uses `input_type|i`.

## Local gate

`make -k check` at `fd8662cc`: everything passes (496 tests) except `check-vendored`, which is the known machine-only failure, and `validate-roadmap`, which fails the same way on clean `origin/main` `7453431d`. It reads live GitHub labels (`roadmap/substep` on #670 and #678, and the `**Substeps**` marker on #318). CI hasn't run, since it starts when the PR opens.

## Collisions

`#678` later edits `implement`: frontmatter noise. `issue-669-repair-contract` adds repair's reference to the same note: recast only.
