# Implementation debrief

Content fix for #571 on `issue-571-nested-in-keys` (base `origin/main` `7453431d`). Part of the skunkworks effort recorded in [#670](../../../issues/wip/670/skunkworks_plan.md).

- `gxformat2-schema` (rev 5): `in:` keys for nested parameters (`|`-joined paths, `_N` for a repeat instance, with its entry in `state`), and what a connection's step part names in list form and for a map-form step with no `label`.
- `implement-galaxy-tool-step` (rev 13): `[[gxformat2-schema]]` added as an on-demand reference. Its body already linked the note, but no reference carried it into the cast. Step 3 states the nested key rule, and `eval.md` gains a repeat-entry property.
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

Those are two validators sharing one rule. Review found that `python_to_workflow`, which Galaxy's import calls, resolves the map-form step above by label, so this is an upstream disagreement. The note now covers only what both accept, and the rest is in the [draft gxformat2 issue](upstream_issue_gxformat2.md). Import into a live Galaxy wasn't run. See the [review debrief](subagents/review_debrief.md).

## Size

About 4,000 of the diff's lines are the note and its vendored `gxformat2.schema.json`, copied into a third bundle because companions travel with their note. The plan estimated a small recast.

## Example choice

The note uses `input_type|i` from `Functional_annotation_of_sequences`. The plan's `ortho_method|input` is also in that workflow, in a subworkflow; `input_type|i` is at the top level.

## Local gate

`make -k check` at `a0c22945`: everything passes (496 tests) except `check-vendored`, which is the known machine-only failure, and `validate-roadmap`, which fails the same way on clean `origin/main` `7453431d`. It reads live GitHub labels (`roadmap/substep` on #670 and #678, and the `**Substeps**` marker on #318). CI hasn't run, since it starts when the PR opens.

## Collisions

`#678` later edits `implement`: frontmatter noise. `issue-669-repair-contract` adds repair's reference to the same note: recast only.
