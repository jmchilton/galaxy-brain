# Polish debrief

No branch changes. Head still `e953ff7344a` on `release_26.1`; description, titles and tags written.

## CI

Fork CI on `e953ff7344a` still queued at polish time (no results, no reds to diagnose). Earlier run on a pre-rewrite head (`6bb6d2cab4d`): client lint, client unit, toolshed green; the rest cancelled by the push.

## Checklist (GENERAL + WORKFLOW_RELATED)

All items pass; the human-read item stays unchecked. Behavior change called out per the checklist: workflows with `${X}` only in non-rename post-job actions stop prompting for `X` on the run form.

## Strengthening round

No branch tasks. Description edits applied:
- After-screenshot alt text no longer claims `replaceme` is connected to `cat` (rename-only extract adds no connection).
- Tool-state row "filled at run time" is now "run form only, not API runs".
- Added highlighted "Runtime substitution is unchanged" and "why `release_26.1`" sentences.
- Attributes → Parameters list effect moved to its own line (it's inside the editor and also drops input-backed rename names).

Left over:
- Optional: re-capture/crop the after screenshot; with `auto_layout=False` `input1` hides behind `replaceme`, so the `input1 → first_cat` edge looks like it comes from `replaceme`.
- Question for John: file a follow-up issue for the still-colliding extracts (rename `${data_input_label}`, tool-state `${X}` with an existing `X` input) and link it from the PR?
- Claim "`add_tags` with `${X}` was always stored literally" rests on code reading, not a test.
