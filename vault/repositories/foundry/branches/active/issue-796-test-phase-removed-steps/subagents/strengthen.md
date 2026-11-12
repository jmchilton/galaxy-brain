Run via Claude Opus 5.5 at high effort.

# Strengthen round (polish steps 2–3)

Reviewed `pr_description.md` against the branch at `60e722a7`. One round.

## Task list

1. **Enforce #796 part 2's "giving a reason".** `isStepDrop` ignored `because`, so a `kind: dropped` entry with no reason labelled a step and the description had to hedge. Applied in `147f383b`: a drop needs a non-empty `because`, a string or a list as `build-cli`'s `asProse` reads it. Blank strings, `[]`, `["", " "]` and `null` count as none. Presence only; citation stays unchecked, matching the ledger note ("a reason you cannot cite is still recorded"). stderr line now says "naming it with a because". `--json` shape and exit codes unchanged. CLI page, `run-workflow-test` step 6 + eval property, meta/program summary, changeset, casts and generated Index/Dashboard updated.
   - Red → green: "does not count a drop without a reason" failed before the change (`expected true to be false`).
   - Checked every committed `kind: dropped` fixture in `content/` (3): all carry `because`, none flip.
2. **List-form keying, id ≠ label.** Applied in `e5ba105e`: new pair `list-removal.{before,after}.gxwf.yml` (before = upstream `synthetic-diff-list-steps`) and its `gxwf diff --json` at gtu-ts `a5c6cd57`. The removed step `id: second, label: second cat` is keyed `second cat`. The test pins that the key labels it and `step: second` doesn't. CLI page says so. Green on arrival.
3. **Gate at final head.** See below.
4. **Description.** Opener and bold paragraph now claim the reason requirement. Evidence: 17 tests, six diffs, third red-to-green item. Publish moved to its own "After merge" section, worded as post-merge, not an undraft condition. Added a body sentence answering "won't repair's fold removals red every run?" (repair folds in the loop, before the first extract; verified against `advance-galaxy-draft-step` step 5, and no test-phase Mold or pipeline routes back to `repair-galaxy-draft-topology`).

## Misreadings checked

- "It validates the drop's justification." Answered by the bold "requires a reason but doesn't judge it" paragraph plus the fixture that still exits 0.
- "It adds the restoration pass / a new phase." Already answered by two bold sentences.
- "Repair's folds will red every green run." Now a bold body sentence, not just collapsed details.
- "Can undraft once gxwf-foundry publishes." Now a separate post-merge section.
- "Merge #796 closes the parity work." Context names #798, #784, #800.

## Questions for John

- Match a list-form step's `id` too? Today only the key (label) or a top-level label names it; a model that writes `step: second` gets a red. Widening would change the published contract, so left as is.
- The ledger note reopens a refuted drop "with its `because` struck". If "struck" means emptied rather than strikethrough, a reopened drop now stops labelling its step. Confirm strikethrough is meant, or clarify the note.

## Gate

`npm run packages-build`, then `make -k check` at `e5ba105e`: red only on `validate-roadmap` (GitHub API rate limit) and `check-vendored` (machine-only). 501 root tests, 122 `gxwf-foundry` tests pass; format and eslint clean. Built CLI on the example fixture: gap ledger exit 4, dropped ledger exit 0. Pushed `60e722a7..e5ba105e` to `jmchilton`.

Pre-existing, not this PR's: root `tsc --noEmit` reports `TS18046 'inner' is of type 'unknown'` at `tests/plan-state-transport.test.ts:141,171,172`, added by parent commit `ef1607a8` (#809); the file imports only `summarize-nextflow` and `@galaxy-tool-util/schema`, neither touched in `ef1607a8..HEAD`. `make check` doesn't run typecheck; CI's typecheck job will.
