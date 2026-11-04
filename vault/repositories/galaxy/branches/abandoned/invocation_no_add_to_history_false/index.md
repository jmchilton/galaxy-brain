# invocation_no_add_to_history_false

Status: `abandoned` — John, 2026-11-02: no one answered the [decision gist](https://gist.github.com/jmchilton/c68c645a8fa6d8da58af9a5e70f060c1) on the backend channel, so the smaller server-only [26.1 branch](../../merged/invocation_no_add_to_history_false_26.1/index.md) goes ahead; its PR links here as the path not taken. Fork branch kept at `33be985c49e`; clean, pushed worktree removed. Base was `release_26.2`.

Fixes workflow invocations built to the published request types:
- honor `no_add_to_history: false`/`null`;
- accept a `null`/`{}` `ds_map` next to `inputs`;
- correct the `no_add_to_history` schema description;
- make generated client types stop requiring defaulted fields of request-only schemas (the root cause that pushed typed callers into both server bugs).

Independent extraction from [issue_20900_invocation_validation](../../active/issue_20900_invocation_validation/index.md).

**[PR description](pr_description.md) · [Title options](pr_titles.md) · [Polish debrief](polish_debrief.md) · [Checklist evaluation](checklist_evaluation.md) · [Scope evaluation](scope_evaluation.md) · [Test challenges](test_challenges_debrief.md)**

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md)

## Decisions (John, 2026-10-15)

- Widen scope: fix the schema description and the client-type root cause here, not on `dev`.
- Fix `ds_map` here too.
- Shared request/response schemas: a documented partial fix, with no input/output split.
- One PR.
- Backport the server fixes to 26.1 separately: [invocation_no_add_to_history_false_26.1](../../merged/invocation_no_add_to_history_false_26.1/index.md).

## State

Head `33be985c49e`, four commits: `9e160f5cbde` (no_add_to_history), `261b0266427` (schema description), `40d5f0eeaa1` (generator), `33be985c49e` (ds_map).

Local results on the current base:
- 8/8 API cases and 3/3 generator vitest cases pass;
- client vue-tsc and Tool Shed typecheck give 0 errors;
- `make update-client-api-schema` gives zero drift.

Fork CI on `33be985c49e` was pending at handoff. CI on the original `dev` head was green apart from an unrelated package-test mypy error in `galaxy/security/ssh_util.py`.
