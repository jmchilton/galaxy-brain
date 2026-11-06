# Skunkworks plan review: `repair-galaxy-draft-topology`

Review of [skunkworks_plan.md](skunkworks_plan.md) against Foundry `origin/main` `7453431d`, before building it. The plan now carries these corrections. No branch was dropped.

## The serious one: the drop path repeated the failure it was meant to allow for

The plan's guard against repair dropping implementable steps was "a cited `because`", with `ledger:170`'s reopen rule behind it. The source runs show that guard doesn't hold as written. In `nf2g-demo-loop-repair-2026-10-20`, the entry that led to removing `explode_and_label_input_reads` says "the supplied shared cache has no confirmed stock pin", and the `because` written for that drop reads:

> Cited blocking entry open-requirements-ledger:nf-core-demo-mixed-sample-sheet-expansion-unimplementable: no confirmed stock Apply-Rules pin/configuration...

So the claim came from an empty local cache, and the citation points at the entry being closed. `nf2g-demo-rerun-7-10` later implemented that step. Under the plan's text, this run would still pass: it has a `because`, and it cites something. `ledger:83` also tolerates uncited drops as "a debt", so the plan's wording left a way through.

Three sentences close it, each from that observed failure:

- `repair` trigger: "A tool version missing from a local cache is not absence."
- `repair` claims: a removal's `because` quotes the primary artifact. "Naming the blocking entry is not a citation."
- `repair` ledger: with no citation for the removal, leave the entry `open`.

`eval.md`'s narrowing property checks for the circular citation, and it would catch the 10-20 run's output.

## Other corrections

| # | Plan said | Problem | Change |
|---|---|---|---|
| 1 | `advance` step 5: "one that step 2 or [[implement-galaxy-tool-step]] appended" (#686's wording) | Step 2 appends nothing on `main`. Only #686's branch adds that. The phrase would dangle. | "one that [[implement-galaxy-tool-step]] appended, or one an earlier call or Mold raised". |
| 2 | Same step 5 scope, no change to step 1 | Step 5 sits after steps 2-4. In real runs the entry arrives from an earlier call (`loop-repair` iteration 006 raised it and returned, 007 repaired). Read literally, the next call redoes discovery and authoring for a step whose entry already rules out a wrapper, which contradicts repair's "Don't search again". | Step 1 goes to step 5 when an open blocking entry against the step already records why no wrapper can serve it, or why its wired inputs can't supply it. An entry without that evidence still goes through steps 2-4, so a template-raised guess isn't dropped untested. |
| 3 | Step 5: on `draft: false`, run [[draft-extract]] before returning, "because a `while draft` harness never invokes the skill again" | That extracts without the `--concrete --strict-state` validation step 6 runs first, and it adds a second extract path. DOMAIN_REVIEW §3 also flags the self-defending clause. | "continue at step 6", which validates and then extracts. |
| 4 | "Replace the budget clause with 'each repair must leave fewer...'" | Read literally, this deletes the cap and surrender text from `advance`. | Only the "strictly reduce" half changes. Cap and surrender stay. |
| 5 | `advance` intro (`:153`) unchanged | It says the call that "concretizes the last drafty step" extracts, which step 5 now contradicts. | "the call that leaves no drafty step". |
| 6 | Gate: compare each repair with the count it started from | Correct for sequential repairs, and `[0, 0]` no longer trips. But the old gate also stopped a chain: repair inserts P1, implementing P1 raises an entry, repair inserts P2. Each link now passes, so only the cap of 5 would stop it. | `ledger` adds that answering an entry against a step an earlier repair inserted by inserting another producer also trips the gate. Removing or narrowing that step is still allowed. `eval.md`'s convergence property covers it. |
| 7 | Gate "trips" | `ledger:212` never says what tripping does, and the plan's stricter per-repair check makes it fire more. | "ending escalation as the cap does". |
| 8 | Ledger: "A consumer that truly needs the removed output is the one case to leave `open`" | It isn't the one case. An entry against a realized step isn't removable under this rule, and it's never picked, so it also stays open (`loop-repair`'s `fastqc-zip-output-unavailable` did). Correction above adds a third case. | Lists the three. |
| 9 | Repair eval: "(`llm-judged` until `draft-validate` warns)" | Text that goes stale (DOMAIN_REVIEW §4). | Plain `check: llm-judged`. |
| 10 | Fixture `sample-sheet-restore-last-drafty` says "the blocking entry" | Its input ledger has two open blocking entries (`...metadata-carry-forward` and `...fastqc-zip-output-unavailable`). | Scenario names the entry, and expects the count to fall from 2 to 1. |

## Checked and held

- Every `repair`, `advance`, `ledger`, format-note and glossary line citation, at `7453431d`.
- `_verify.json` for `repair` and `advance` has `entries: []`, so `make check-fixtures` doesn't reach these fixtures. The research was wrong and the plan's `command:` lines are the right answer.
- All three real drafts fail `gxwf draft-validate` 1.15.0 on `fields:`, and the output of `rerun-7-10` iteration 004 picks `fastqc_archive_per_read` next.
- `loop-repair` iteration 007's output reports `draft: false` with no `galaxy-workflow.gxwf.yml`, and iteration 008 has one. That's the F5 red.
- `implement:161` and the template Molds' "computability gap" purposes stay true: they describe one way a blocking entry arises, and none claims it's the only one.
- The change-set kinds exist at `apply:80-81` and `interview:65`.
- `open_history` is only rendered in `packages/build-cli` (`run-ledgers.ts`, `run-dashboard-html.ts`), and a shape change would break it. The plan doesn't change the shape.
- Branch 3: `gxformat2` 0.28.0's `validate_draft` agrees with `gxwf` on all five reference forms (list by label ok, list by id fails, map by key ok, map by id or label fails), so the sentence stands. `implement` links `[[gxformat2-schema]]` in its body but has no reference to it, so adding one is real work.
- Branch 2: `__FILTER_NULL__`, `keep_first` and `type_source="inputs_0|input"` on `release_26.1`. Galaxy has its own mapped test, `lib/galaxy_test/workflow/pick_value_first_non_null_mapped.gxwf.yml`.
- U1: `validate_draft.yml` asserts `warnings` counts in `galaxy-tool-util-ts`.

## Accepted, not changed

- Dead end and interface shrink defaults. With the corrections above, removal needs real evidence, so I don't think either default is too loose.
- No test-phase routing, no layout split, and no `--connections`.
- Prose-only dead-structure check until U1 lands upstream. DOMAIN_REVIEW §6.3 would want a CLI check, and the plan's issue text is the right route, since a Foundry check would duplicate `validate_draft`.
- Hand-built fixtures, labelled synthetic in their READMEs. §6.7 flags synthetic-only evidence, and these sit beside two real pairs.
- At the cap, or once the gate trips, a step can stay drafty. That's #686's "How a call ends".

## Found while building

- **Branch 3's example.** The note uses `input_type|i`. This entry first said `ortho_method|input` isn't in `Functional_annotation_of_sequences`, which was wrong: the branch review found it as a subworkflow `input_connections` key at IWC `980fc00`. Both keys exist.
- **Branch 3's map-key sentence.** The Branch 3 line under "Checked and held" and the plan's connection-key text were also wrong: conversion rejects a key reference for a map-form step that has a `label`. The branch review cut that case; see #754.
- **Branch 2's test design.** Planemo can't read a null element and skips `element_count: 0`. The workflow gained filter and witness steps so the null claims are really checked.
- **Branch 2's lint command.** `planemo lint` exits 2 with no output on any workflow here, because it lints tools. `planemo workflow_lint` is the real check. `verification/README.md` has the same stale command, which I left alone.
- **Branch 1's fixture.** My dupRadar scenario missed that `annotation` also loses its only consumer. The branch-cast trial found it by walking the draft, and the scenario now says so.
- **Branch 1's wording.** A trial had to guess whether a promoted literal leaves `state`, so the Mold now says it does.

## Still weak

- The evidence for all of this is one shared seed plus two synthetic fixtures.
- Correction 6's chain rule has no observed failure behind it. It keeps a property the old gate had, and it's one sentence, so I kept it. If a reviewer wants it out, nothing else depends on it.
- The new removal guard can leave a drafty step `open` where the old run would have dropped it. That can end a run early, and it's the safer of the two failures.
