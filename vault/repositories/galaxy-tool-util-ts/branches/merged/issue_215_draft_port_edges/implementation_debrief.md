# Implementation debrief

Paired with [the gxformat2 branch](../../../../gxformat2/branches/merged/issue_215_draft_port_edges/index.md), which owns the shared expectations and fixtures and has to land first.

## Is this a good idea?

Yes for the two core changes, checked against real data. The survey count is left out.

- **`consumed by`: yes, and it's the most useful part.** It fixes the mistake in foundry#668, where a brief called M13's port "unbound" while M12's work item was the only output in hand. The issue is right that Foundry's own proposal (flag a drafty source on the in port) can't work: a consumer isn't offered until its upstream TODO ports are gone, so that item is never printed on an acyclic draft. Of 303 first-offered next-step results across real drafts, 192 now show a `consumed by`, and none has an in port sourced from a `TODO_*` output. (Corrected in polish; this first read 193 of 302.)
- **`sourced from`: yes, modest.** It shows a port is already an edge. Once unwired ports are rejected it mostly confirms wiring, but it costs nothing and names the source.
- **Rejecting unwired ports: yes, safe.** 0 of 14,197 `TODO_*` in ports in 337 real draft files (223 distinct) are unwired or default-only, so nothing real breaks. (Corrected in polish; this first read 14,262 ports in 402 files, a count that took in more than real drafts.) The issue's escape hatch ("if a real template needs that form") doesn't apply. Foundry's format note already says the connection MUST be present.
- **Survey count: left out.** The issue says it "can" be added. Foundry's ask was a wired/unwired split, which rejection makes moot: on a draft that validates, every TODO in port is wired or defaulted. A bare count of drafty-sourced ports names no port and drives no decision. It would also touch `report-models.ts`, which #216 is changing. Easy to add if John wants it.

## What changed

- `nextDraftStep`: `TODO[in.*]` items report `sourced from`, `no source: default value` or `no source: unwired`; `TODO[out.*]` items add `consumed by`.
- `validateDraft`: a `TODO_*` in port with no source and no non-null default is a topology error.
- `OutputRefIndex` became a shared `PortRefIndex`. Docs and a changeset.

`no source: unwired` only appears on drafts that validation rejects; `draft-next-step` stays total on them.

## Verification

- Red first: 6 declarative tests failed on the unchanged code, green after.
- Python and TS `next_draft_step` output and topology errors are identical on 215 real and fixture drafts; the review's fuzzing found no divergence in the changed logic.
- The issue's two fixtures, through the built CLI, print the proposed text; `mixed.gxwf.yml` now fails `draft-validate` with exit 1.
- Local gate: lint, format, typecheck, knip, build, sync checks green. Tests green except 3 in `integration-tests` (`validate_legacy_encoding_skipped_2`, `validate_iwc_repeatmasking_stale_rejected`, disconnected-optional RuntimeValue), confirmed failing identically on `origin/main` `f5470fe5`. `make check` stops at `verify-test-format-schema` under Node 26 (pre-existing).

## Left out of the sync

`make sync-workflow-expectations` also pulls `test_extra_field_output_*` and `synthetic-extra-field-output.gxwf.yml`: gxformat2 main rejects unknown output keys in strict mode and TS doesn't yet. Unrelated gap, reverted here. Follow-up.

## Follow-ups (not done)

- `$link` edges and cycles in draft validation; see the [normal review](subagents/normal_review.md).
- TS parity for strict unknown output keys.
- Foundry: its format note and `draft-next-step` CLI page should describe the new text (foundry#668 correction 2c).

## Snapshot

```text
created .../galaxy-tool-util-ts/branches/merged/issue_215_draft_port_edges/differential-review/snapshots/20261106T211735Z-implementation-
  implementation @ d447be46e911 vs origin/main (merge-base f5470fe5ac3b)
  first snapshot: 2 commits, 10 files, 22 hunks
```
