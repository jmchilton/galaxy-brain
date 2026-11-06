Replaces `repair-galaxy-draft-topology`'s contract. The Mold assumed one trigger (missing evidence) and one answer (add a producer, or narrow), yet 4 of the 7 repairs in our runs removed a step.

Closes #669. Part of #670, #660, #661, #654.

## What changed

**`repair-galaxy-draft-topology`**

- It runs on any open blocking entry a structural edit can close, and names its edits with the change-set vocabulary.
- A removal now has its own rules. The artifacts its `because` quotes must carry the removal alone. Naming the blocking entry doesn't count, a tool search says nothing about stock tools, and a cache miss isn't absence. A realized step isn't removed.
- If a removal doesn't follow from what it can quote, the entry stays `open` with a note saying what's unproven.
- After an edit it removes dead inputs and steps, and stale mentions, then validates last. It validates with `--concrete --strict-state` when the edit touched a realized step.
- It won't state a claim about an unresolved wrapper as fact.

**`advance-galaxy-draft-step`**

- It extracts when a repair removes the last drafty step, which a real run showed it didn't.
- An entry that already rules out a wrapper goes straight to repair. Tool Shed misses and cache misses still go through wrapper resolution.
- Once no drafty step is left, any open blocking entry goes to repair before extract, including one on a realized step or with no `step`. The plan didn't call for this. Without it those entries were counted and never routed.
- An earlier-step defect a structural edit closes can now escalate.

**`open-requirements-ledger`, the draft-format note and the glossary**

- `blocking` is widened to match.
- The convergence gate compares a repair with the count it started from, so two sequential single-entry repairs no longer trip it. A trip sets `escalations` to `cap`, so later calls can see it.

**Change-set vocabulary:** adds `remove-output` to `interview`, `apply` and `repair`.

**Evals and scenarios**

- `repair`'s eval no longer contradicts the Mold, and its scenarios use two real and three synthetic fixtures.
- `advance` gains routing and budget properties.

## Decisions taken by default, for John to confirm

- **Dead end:** repair may remove a step that can't be closed, with `kind: dropped` and a cited `because`.
- **Interface shrink:** allowed on a narrowing.
- **Late structural fixes:** in-loop yes, test-phase no. Test-phase routing leaves a stale extract after a direct-only repair, so it needs the harness to call `advance` again, plus `harness_notes` in every pipeline and the debug Mold. Repair's trigger doesn't rule out a post-loop call, so nothing is foreclosed.
- **Layout split (F8):** out of scope. Repair allows `add-step` plus `rewire`, and no recipe is added.

## Rejected requests from #670

- **Non-blocking output promotion in repair (D2):** out of contract, since nothing was broken.
- **"MUST NOT carry `hide: true`" and a `draft-validate` check (D3):** 54 promoted IWC outputs carry `hide`, and 4 are asserted by IWC tests. Our 11 final workflows promote 0 of 199 hidden ports, so the mistake doesn't arise without a rule.
- **Test plan and test data as repair's artifacts (D9):** tests come after the loop in every pipeline, and a plain entry covers a post-loop edit.

## Evidence

No gate runs a Mold. These are **single runs of a stochastic agent**, judged by the agent that made the change. They show behaviour can differ, not how often.

Trials on the final contract (the sample-sheet and cache-miss runs predate the last wording commit, which only touches the wrapper-output sentence):

| Fixture | Result |
|---|---|
| `sample-sheet-restore-last-drafty` (real), one `advance` call | Went through wrapper resolution rather than straight to repair. Removed the step quoting the Apply Rules ports and `SAMPLE_SHEET_MAPPING`, recorded the metadata as unverified, also closed the entry on a realized step, and extracted in the same call. |
| `dupradar-cache-miss-only` (synthetic), `repair` | Left the entry open, removed nothing. |
| `fastqc-zip-no-port` (real), `repair` | The first run left the entry open, reading the exhausted-branch sentence as ruling out repair. After a wording fix, a second run added a draft-tier step and moved the output and MultiQC's edge onto it, as the real run did. |

Earlier trials on the pre-review contract, each compared with the base cast:

| Fixture | Base cast | Branch cast |
|---|---|---|
| `dupradar-wrapper-absent` (synthetic) | Reran searches, left dead inputs and 4 mentions | No search, nothing dead, 0 mentions |
| `star-sa-index-input` (synthetic) | Declined the promotion and added `TODO` steps | Promoted the value, `--concrete --strict-state --connections` clean |

From the records, no agent involved:

- `nf2g-demo-loop-repair` iteration 007 ended `draft: false` with no `galaxy-workflow.gxwf.yml`, and iteration 008 wrote it.
- The real repair in `fastqc-zip-no-port/repaired.gxwf.yml` fails the old scenario.

**Didn't run**

- No live Galaxy run of any repaired draft.
- No CI yet.
- The `advance` budget and third-bucket properties have no agent run, and neither does `star-sa-index-input` on the final contract.
- No case covers a consumer that truly needs a removed output, or a realized step whose only remedy is removal. No fixture has a `rename` or `change_datatype`, a copied step, `replace-tool` or `expose-output`.
- `make check-fixtures` doesn't reach these fixtures, because `repair`'s `_verify.json` has no entries. I ran `gxwf draft-validate` 1.15.0 on them by hand.

**`make -k check`:** everything passes (496 tests, casts, verify, pipelines, fixtures) except two known failures. `check-vendored` fails on this machine only. `validate-roadmap` reads live GitHub labels, and fails the same way on clean `main`.

## Collisions and dependencies

- **#686 and `fix/advance-draft-needs-tool`** conflict as text at `repair` and `advance` step 5. I dropped their "step 2" phrase from step 5, because only their branch makes step 2 append. Whichever lands second should restore it.
- **Depends on #686 for one stop:** when an entry stays open on a drafty step, nothing in Foundry bounds `while draft`, so the run can spin with no extract. The citation rule makes that state more likely, and #686's "How a call ends" is the planned answer. It's the safer failure, compared with dropping a step a later run could implement.
- **`star-sa-index-input` is Mold-only** until test-phase routing exists.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
