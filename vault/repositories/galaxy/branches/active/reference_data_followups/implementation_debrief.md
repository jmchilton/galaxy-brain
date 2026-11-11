# Implementation debrief

**STATUS: READY.** Follow-up to merged #24798 carrying John's remaining round 0 review findings onto `dev`, re-scoped once to add a fixture-wide `to_internal()` drift guard and the text-default bug it caught. Head `a4637890126` (pushed), base `dev`, +344/−50 across 16 files (about +69/−36 production).

```
created .../reference_data_followups/differential-review/snapshots/20261111T170345Z-hardening-a46378901264.json
  hardening @ a46378901264 vs origin/dev (merge-base a73355ea2e5c)
  since 20261111T165827Z-hardening-05f155c5e78d:
    commits: 4 same, 3 rebased, 1 changed, 1 new, 0 dropped
    hunks:   34 carried, 1 changed, 1 new, 1 dropped
```

Added after hardening (advisor check): a Baseline test that reference_data nested in a section and a conditional `when` loads through tool creation and the parameter models — guards the subclass dispatch in `_canonical_input_source()`, which no fixture exercised. Passes on dev and at head.

## Commits

1. `f65ce85596a` Baseline tests: reference_data fixtures through the #23888 user tool contract harness (review P2 1).
2. `11fd2719823` Baseline tests: closed-table tests assert which check fires (P2 2).
3. `35b5cbf55d4` Baseline tests: admin `GalaxyTool` reads a closed table via the API (P3 4).
4. `b02887560b1` Baseline tests: reference_data parsed model equals `to_internal()` across tool class × dump.
5. `a610accbfa8` Baseline tests: reference_data nested in sections and conditional whens.
6. `eb161062b99` Share runtime dumping (`reference_data_runtime_json`) and the table access rule (`ToolDataTable.readable_by(*, trusted)`) (P3 3). Behavior-preserving.
7. `0b481f9d687` Reject reference_data unless GalaxyTool/GalaxyUserTool YAML (`InputSource.parse_reference_data()`); closes the XML `<options>` bypass and the factory accepting XML/class-less reference_data (P3 1).
8. `f1ff2f8d6e9` Load reference_data through its authoring model (P2 3): `CanonicalYamlReferenceDataInputSource` validates once and exposes coerced values; factory returns `to_internal()`. Disk tools now reject what the API rejects, and `multiple: "false"` no longer diverges between form and model (Codex).
9. `a4637890126` Fix YAML text defaults dropped by `to_internal()` (re-scope): parity test over all functional YAML fixtures × tool class × full/`exclude_unset` dumps.

## Choices

- Dropped P3 2 and the filter halves of P2 3 / P3 4: upstream removed `filter`.
- reference_data is now the only YAML type strictly model-validated on disk (unreleased type; nothing real breaks). Worth a line in the PR body.
- Parity test excludes `exclude_none`: it erases explicit `value: null` by design; see follow-ups.
- Kept upstream `test_run_with_reference_data` (now a subset of the contract harness); dropping it is John's call.

## Scope

First evaluation: expand modestly (done; original scope kept as `reference_data_followups_alt_original_scope`, [alts/original_scope.md](alts/original_scope.md)). Second: [no further change](scope_evaluation.md). Possible decompositions there, e.g. text fix as its own PR.

## Verification

Unit 412 passed (reference_data, yaml_parameters, user_tool_source_fixtures, evaluation, parsing, parameter spec). API: `test_user_tool_contract.py` 78 and `test_unprivileged_tools.py` 29 passed at re-scope; reference subsets re-run green after later changes. Red checks against dev lib confirmed for every non-baseline test. Format clean; mypy identical to dev. No CI yet.

## Reviews

[Normal 1](subagents/normal_review_1.md), [normal 2](subagents/normal_review_2.md), [test challenges](test_challenges_debrief.md), [Codex](codex_review.md) (first pass found the flag divergence), [thermo](thermo_nuclear_review.md), [baseline refactor](baseline_refactor.md). First hardening pass in `earlier_drafts/1/`.

## Follow-ups (not on this branch)

- `exclude_none` in `lib/galaxy/agents/custom_tool.py:758` turns an optional boolean with no default into default `False` when the editor saves; `lint.py:349` lints a different dump than storage. Also on `release_26.1`; two-line fix + round-trip test as its own PR.
- `ToolSourceBaseModel` silently drops unknown kwargs (root cause of the text bug); `extra="forbid"` or mypy `init_forbid_extra` is codebase-wide.
- Latent factory vs `to_internal()` mismatches (required text no value, text `area`, optional select `no_options`) — #23888.
