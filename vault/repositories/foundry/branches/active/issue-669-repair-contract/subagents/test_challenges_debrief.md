# Test challenges debrief: `issue-669-repair-contract`

Reviewed `6f5be153`. Read-only: every change below is a recommendation. Findings are in [test_challenges_review.md](test_challenges_review.md).

## Challenge outcome

No unit test, mock or `SimpleNamespace` is in the diff, so the process's mock questions don't apply. Applied to the oracle material instead:

| Item | Verdict |
|---|---|
| `eval.md` properties | Keep. Fix the stale property's reach (P2 6), the validator (P2 5) and the `check:` labels (P3 1). |
| Case: wrapper has no port | Rewrite: contradicts its golden (P1 1). |
| Case: repaired draft re-enters the loop | Keep as a pin check; it doesn't test the Mold (P3 3). |
| Case: repair removes the last drafty step | Rewrite: pins an open question and misses a false `doc` (P2 2, P2 6). |
| Case: confirmed-absent wrapper | Keep; fix the fixture's state (P2 4). |
| Case: value must vary per run | Keep; label it direct-only and name the stronger validator (P2 4, P2 5). |

## What the oracles caught

Mutations of the fixtures, on scratch copies, with `gxwf` 1.15.0.

| Mutation | Command | Result |
|---|---|---|
| dupRadar: step removed, MultiQC edge left | `draft-validate` | exit 1, names the unknown step |
| dupRadar: step and edge removed, dead inputs, port, mentions and frame left | `draft-validate` | exit 0 (known; `llm-judged`) |
| dupRadar: added step with an invented concrete `tool_id` | `draft-validate` | exit 0 |
| Sample-sheet: step removed, `trimmed_reads` left dangling | `draft-validate` | exit 1, names the unknown step |
| Same | `draft-next-step` | `draft: false`, so that report alone doesn't show a sound repair |
| STAR: the expected repair | `draft-validate --concrete --strict-state --connections` | exit 0, 6 connections |
| STAR: one twin not edited | same | exit 0 |
| STAR: literal left in `state` on one step | same | exit 0 |
| STAR: wrong key, `genomeSAindexNbases` | plain `draft-validate` | exit 0 |
| STAR: wrong key | `--concrete --strict-state --connections` | exit 1, `No parameter definition matching connection key` |

## Confirmed sound

- All five fixture drafts exit 0 from `draft-validate`.
- `draft-next-step` on `repaired.gxwf.yml` gives `["fastqc_archive_per_read"]`, as the case says.
- The sample-sheet ledger has the 2 open blocking entries the case starts from, and `restore_trimmed_sample_sheet_metadata` is the only step `draft-next-step` reports.
- The STAR input fixture passes `--concrete --strict-state`, and its expected repair is achievable.
- The repair `SKILL.md` carries the last Mold edit ("remove the literal from `state`"). Casts weren't otherwise reviewed.

## Test plan

1. Correct the `fastqc-zip-no-port` expectation, then run that case once with an agent against the branch cast (P1 1, P2 7).
2. Add negative cases from ledger-only variants of `dupradar-wrapper-absent`: cache-only `missing`, and no citation. Add one on a realized step. Each expects the entry `open` with a note, the step present, and no `kind: dropped` (P2 1).
3. Get John's answer on the partial citation and write it into the sample-sheet case (P2 2).
4. Add `advance` budget and routing properties, and an `advance` scenario on `sample-sheet-restore-last-drafty` asserting `escalations: 2`, a new `open_history` count, no gate trip from `[0]`, and the extract in the same call (P2 3).
5. Realize `M18_markdup` in the dupRadar fixture and run it through `advance`, asserting no wrapper search on the call that picks `M19_dupradar` (P2 3, P2 4).
6. Mark STAR direct-only, or add a drafty step (P2 4).
7. Name `--concrete --strict-state` in the eval property and the STAR case (P2 5).
8. Extend the stale property to promises in `doc`, and assert `trimmed_reads`'s `doc` no longer claims metadata (P2 6).
9. Add a `rename` to a synthetic fixture (P3 2). Relabel the `check:` values (P3 1).

## Out of scope, noted

`make check-fixtures` not reaching these fixtures is known, so it isn't a finding. The `when:` without `skip_trim` in the sample-sheet draft is already in the implementation debrief. No security findings.
