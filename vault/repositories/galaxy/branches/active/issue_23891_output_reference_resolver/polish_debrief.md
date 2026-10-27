# issue_23891_output_reference_resolver — polish debrief (2026-10-27)

Re-polished at `b28aa18d1b5` (base `dev`). No branch commits this round. Previous polish: [earlier_drafts/4/polish_debrief.md](earlier_drafts/4/polish_debrief.md).

## CI
Fork CI on `b28aa18d1b5` was queued or pending at the start, and nothing had failed. It still needs to finish before this branch can open.

## Checklist (GENERAL + WORKFLOW_RELATED)
Every item passed on the code. Code, XSD, warnings and tests use 27.0 consistently, and all imports are at the top of their files. The only failure was the stale `pr_description.md`, which still said 26.2, said `metadata_source` isn't linted, and left out the shadowed-alias error.

## Description
- Rewritten to the current `GX_PR_DESCRIPTIONS.md` structure: Human Review placeholder, Agentic Checks, Context with the alt and the Factory link, and the checklist in a details block.
- Content updated for the 27.0 gate, `metadata_source` linting and the shadowed-alias load error.
- The #23902 line no longer names a version, because that branch's record still says 26.2.

## Strengthening round (one round)
Applied:
- Re-verified the "red with load-time resolution disabled" claim on the unit file at this head: 6 red, 1 green (the declared control). The framework and API parts of that claim were not re-run.
- The sweep is labeled as measured before the 27.0 gate. The numbers weren't re-measured.
- Removed the duplicate workflow-editor bullet from Side effects.

Left over:
- An end-to-end `metadata_source` test (framework or API). Coverage is still unit and lint level only.
- No re-sweep of the 555/94/22 numbers.

## Galaxy check
`make format` made no changes. mypy (`mypy.ini`, changed `lib` files) reports no errors in the changed files.

## Titles and tags
- In the title that named a profile, 26.2 → 27.0.
- Tags unchanged: `kind/bug`, `area/tool-framework`.

## Snapshot
```
created .../differential-review/snapshots/20261027T193528Z-polishing-b28aa18d1b5e.json
  polishing @ b28aa18d1b5e vs origin/dev (merge-base a9a68082414f)
  since 20261027T192012Z-revision-b28aa18d1b5e:
    commits: 11 same, 0 rebased, 0 changed, 0 new, 0 dropped
    hunks:   32 carried, 0 changed, 0 new, 0 dropped
```

## Questions for John
- Is 27.0 settled as the gate profile? Should the pitch say why?
- Add an end-to-end `metadata_source` test before opening?
- Should `issue_23902_qualified_output_references` move from 26.2 to 27.0 too?
- `human_review.md` predates this round; refresh it during final review.
