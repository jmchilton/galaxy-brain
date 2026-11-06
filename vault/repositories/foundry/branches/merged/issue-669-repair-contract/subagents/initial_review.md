# Review: `issue-669-repair-contract`

Profile: `_shared/reviewers/default.md`. Model: Claude Opus 5.5 (`claude-opus-5-5`). Effort: not exposed to this agent. Reviewed commit: `6f5be153`, diff `origin/main...HEAD` (merge base `7453431d`).

No security findings.

## Findings

### P1 1: Step 1's shortcut skips the author branch, and the sample-sheet scenario rewards the result

`advance` step 1 now jumps to step 5 when an `open` blocking entry "already records why no wrapper can serve it". Nothing asks that authoring was considered. The step 1 condition is weaker than repair's own trigger, which needs "no stock, shed or authored wrapper", or a wrapper confirmed absent. Today a deferred step reaches `author-galaxy-tool-wrapper` through step 2's "if no acceptable shed candidate emerges, fall through". An entry holding only Tool Shed misses and a cache miss now goes around that. Repair can't author and is told "Don't search again", so its only moves are a removal or leaving the entry open, which trips the gate.

The branch's one real removal fixture is this case. `sample-sheet-restore-last-drafty`'s entry records `gxwf tool-search` misses plus "The shared cache has no confirmed stock Apply-Rules pin", and its note says "no acceptable Tool Shed wrapper or cached stock pin". It records no authoring attempt. `scenarios.md` still requires the step to be gone and accepts a `because` that quotes "the searches".

Three later runs realized this exact step with an authored `GalaxyUserTool`:

- `nf2g-demo-close-enough-7-2026-10-22`, iteration 008
- `nf2g-demo-author-7-2026-10-22`, iteration 012
- `nf2g-demo-collision-7-2026-10-22`, iteration 012

So the searches don't show nothing can close the entry. `tool-search` also can't speak to a stock tool such as `__APPLY_RULES__`. This is the failure the plan review called "the serious one", moved one step along. The debrief's trial wrote "stock Apply Rules is unproven, not absent" and removed the step anyway. The debrief asks John about partial citation, but it doesn't mention the later authored runs, and the fixture README mentions only `explode_and_label_input_reads`.

The removal may still be right on other grounds. `nf2g-demo-rerun-7-10` removed the step citing `SAMPLE_SHEET_MAPPING`, though the entry's `missing` claims the opposite about column propagation. That citation can stand. A citation of the searches can't.

Suggested fix:

- Narrow step 1 to the repair trigger's condition: the entry records the author branch as ruled out, or the wrapper as confirmed absent, or why the wired inputs can't supply the step. Anything else goes through steps 2-4.
- In `scenarios.md`, accept only the semantics rule as the removal's citation, and accept realizing the step by authoring as a pass.
- Add a case for the guard: this entry reduced to Tool Shed and cache evidence must not produce a removal. No scenario exercises "no citation, leave it open" today.
- Reconcile `ledger:83`'s "A reason you cannot cite is still recorded... It is a debt". The note is loaded verbatim into repair, and the trial's "uncited debt" wording follows it. It reads as permission for what repair now forbids.

### P2 1: A tripped gate leaves no state, and `advance` doesn't say what to do

The ledger now says a repair that doesn't lower the count "trips the gate immediately, ending escalation as the cap does". Three things are missing:

- **No record of the trip.** The old gate could be read from `open_history` (`[2, 2]` meant tripped). The new one can't, because the note itself says the post-repair count can legitimately rise or repeat, and the pre-repair count isn't stored. A later fresh call can't tell a trip from two sound repairs.
- **No orchestrator instruction.** `advance` step 5 only says "surrender rather than retry once the cap is reached". The ledger's "Maintain the escalation budget" paragraph (`:182`) surrenders only at `cap`.
- **The mandated path trips it.** "No citation, leave it open" lowers nothing. With the step 1 shortcut, the next call returns to repair on the same entry. Followed literally, that repeats up to `cap`. If the orchestrator does surrender at the trip, step 1 no longer matches, and steps 2-4 rerun the search repair was told not to repeat.

The stay-drafty stop is #686's, but this ambiguity is new here. Suggested fix: store the outcome (a `tripped: true` header field, or `found` beside each count), tell `advance` step 5 to surrender on a trip, and extend `:182` to match. A header shape change must keep `open_history` working for `run-ledgers.ts`.

### P2 2: The chain rule can't be evaluated from any artifact

Ledger `:212` and repair's eval both turn on "a step an earlier repair inserted". Nothing records that. The draft carries no marker, `raised_by` describes entries rather than steps, and repair's `resolved` note must name "the kinds you applied", not the step ids. A fresh iteration can't tell a repair-inserted step from a template one, so the eval's `no new producer answers...` clause and the gate clause can't be applied. The plan review says this rule has no observed failure and that nothing depends on it. Suggested fix: drop it from the ledger and eval. If it stays, require the `resolved` note to name steps added by `add-step`.

### P2 3: The dead-input walk misses `${label}` consumers

Repair's check 2 says to compute dead structure "by walking every step's `in:` and the workflow outputs". A parameter input can also be consumed by a `${label}` in an `out:` `rename`, as `[[gxformat2-schema]]` says at `:58`, and the plan's own upstream issue text lists it as a consumer. A walk as written removes that input. The rename then becomes an untyped parameter, which leaves `${name}` literal on API and Planemo runs. `draft-validate` doesn't catch it: I added `rename: 'Report ${run_title}'` with no such input to the dupRadar fixture, and it reports `draft valid`, exit 0. Suggested fix: add "and `${label}` in `out:` `rename`" to check 2.

### P2 4: The wider blocking grade has no route when the entry isn't on the picked step

The ledger and glossary now grade "a value that must vary per run" and similar cases as blocking, and the glossary says the loop reaches repair "on an open blocking entry". Step 5 only looks for an entry "against this step", and step 1 extracts on `draft: false` without looking at the ledger. An entry with no `step:`, or one against an already-realized step, never reaches repair unless another repair happens to sweep it. It is still counted by the gate and ships open.

Two places in the branch show this:

- `star-sa-index-input`, the #670 case. Its entry has no `step:`, it's raised by `implement-galaxy-workflow-test`, and its draft reports `draft: false`. `advance` would extract without calling repair, so the case passes only by invoking the Mold directly.
- The debrief's `trim_reads_seqtk` entry, which ships open for the same reason.

The test-phase default explains the first's raiser, not the in-loop gap. A template Mold following the new `blocking` text can raise the same stepless entry. Suggested fix: in step 1, on `draft: false`, escalate open blocking entries that a structural edit can close before extracting. Otherwise, narrow the glossary and ledger sentences to entries attached to a picked step, and say that the rest go to the terminal.

### P3 1: Stale contract text left in cast frontmatter and step text

These reach the runtime agent through `SKILL.md` and contradict the rewritten bodies:

- `advance/index.md:134`: "for a newly appended blocking entry", where step 5 now also covers earlier calls.
- `advance/index.md:135`: "strictly reduces the open count".
- `repair/index.md:35`, `:42`, `:67`: "re-wires", "re-wired steps", "Re-wire the affected region".
- `repair/index.md:100`, `:108`: "repair sub-path" triggers, which still read as the old shape.
- `advance` step 6: "this invocation concretized the last drafty step", now also reached by a removal.
- `advance` step 5's title and "[[draft-validate]] cannot catch this", which describe only the computability case while the step now covers every blocking entry.

### P3 2: The ledger sentence on leaving entries open reads as covering any realized step

Repair's "Leave an entry `open`... when the step is already realized" sits in the "nothing can close" path, but it stands as its own sentence. `star-sa-index-input` requires resolving an entry on fully realized steps, and the third failure bucket escalates defects on earlier realized steps. Reword it to "when removing the step is the only remedy and it is already realized".

### P3 3: A scenario-accepted outcome has no change-set kind to name

The `fastqc-zip-no-port` scenario accepts removing a public output, and repair's `resolved` note must name change-set kinds, under a `deterministic` eval property. The list in repair and `interview:65` has no `remove-output`. The debrief left this as is, but on that path the eval property can't be met as written. Add `remove-output` to repair's list, since `apply`'s eval already says "add/remove input/output", or exempt narrowings in the eval.

## Checked and fine

- `npm run cast -- <mold> --target=claude --check` is clean for `repair-galaxy-draft-topology` and `advance-galaxy-draft-step`.
- All four fixture drafts and `repaired.gxwf.yml` pass `gxwf draft-validate` 1.15.0. `draft-next-step` gives the expected picks: `fastqc_archive_per_read` on the repaired draft, and `draft: false` on STAR.
- Bare `draft-validate` does flag a dangling edge and a dangling `outputSource` after a step removal, so the new reference's purpose is accurate without `--connections`.
- The dupRadar searches in the synthetic ledger still return nothing (`tool-search dupradar`, `repo-search dupradar`).
- `rerun-7-10` and `stock-version` both removed `restore_trimmed_sample_sheet_metadata`, so removal is an observed outcome, just not the only one.
- No other hand-written source still states the old "strictly decreasing" gate. The template Molds' "computability gap" purposes stay true, as the plan review found.
