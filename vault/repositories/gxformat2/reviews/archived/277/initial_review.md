# gxformat2#277 initial review

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Opus 5.5
- Effort: medium
- Reviewed commit: `177a083` (PR head, includes a merge of origin/main)

## Verdict

Approve. It's a small, correct schema fix. `Process.yml` drops the `dict[str, Any]` fallback on `outputs`, and the four generated models match a regen: `build_schema.sh` dry-run drift check exits 0. The fixture, the catalog entry, the lax/strict expectations and the `SchemaStrictExtraField` negative reuse the existing declarative fixture machinery, the same way `synthetic-extra-field.gxwf.yml` does. The full suite passes: `uv run pytest tests` gives 943 passed and 8 skipped.

Verified behavior at head:

| outputs value | lax | strict |
|---|---|---|
| `{o: {outputSource: cat/out_file1}}` | ok | ok |
| `{o: {output_source: ...}}` (dict form, typo) | ok | rejected (fixed) |
| `[{id: o, output_source: ...}]` (list form, typo) | ok | rejected (already was) |
| `{o: "cat/out_file1"}` | ok | ok |
| `{o: {}}` | ok | ok |
| `{o: null}` | **rejected** (was accepted) | rejected |

## Findings

### P3 1: `_normalize_outputs` annotation still carries the dropped fallback

`gxformat2/normalized/_format2.py:425` still declares `outputs: ... | dict[str, Any]`, so it no longer matches `GalaxyWorkflow.outputs`. The type is now just the schema's, so it can be trimmed to match:

```diff
 def _normalize_outputs(
-    outputs: list[WorkflowOutputParameter] | dict[str, WorkflowOutputParameter | str] | dict[str, Any],
+    outputs: list[WorkflowOutputParameter] | dict[str, WorkflowOutputParameter | str],
 ) -> list[WorkflowOutputParameter]:
```

It's cheap to fix and not blocking.

## Notes (not findings)

- **Lax isn't strictly unchanged.** `outputs: {o: null}` now fails lax validation; before, the `dict[str, Any]` arm accepted it. The converter turned a null value into `{"type": None}`, an output with no source, so this never produced a working output. Rejecting it fits the "reject never-working input" preference. The PR description says "Lax validation is unchanged", which is close but not exactly true. It may be worth a HISTORY line.
- **TypeScript side has the same fallback.** In galaxy-tool-util-ts, `packages/schema/src/workflow/raw/gxformat2.effect.ts` (and `-draft`) on `origin/main` still has `Schema.Record({ key: Schema.String, value: Schema.Unknown })` on `outputs`. It's generated from the synced `Process.yml` (`make sync-schema-sources`). After this merges, sync the schema sources and the workflow fixtures/expectations in the same TS commit. Otherwise the new `test_extra_field_output_rejected_format2_strict` expectation will fail under TS `--strict-structure`.

## Same fallback elsewhere (pre-existing, outside the diff)

These come from the coordinator's question about sibling paths. None of them is touched by this PR, so they're follow-up material, not merge blockers.

- **Inline subworkflow `run`.** `schema/v19_09/workflow.yml:599` types `run` as `GalaxyWorkflow | str | dict[str, Any] | None`. When an inline subworkflow fails strict `GalaxyWorkflow`, it falls through to `dict[str, Any]`. I verified this: a nested `run:` with `outputs: {o: {output_source: ...}}`, or with an unknown top-level key, passes `gxformat2_strict`. So the #276 bug still happens one level down, and strict validation doesn't really reach inline subworkflows at all. This is the most direct sibling of #276, and probably deserves its own issue.
- **String-shorthand outputs.** `dict[str, WorkflowOutputParameter | str]` accepts `{o: "cat/out_file1"}` under strict. Both the converter (`_convert_dict_to_id_list_if_needed` gives `{"type": "cat/out_file1"}`) and `_normalize_outputs` (`WorkflowOutputParameter(id=key)`) throw the string away. I verified that the workflow converts with 0 `workflow_outputs`. That's the same symptom as #276 by a different path. Either give the shorthand a meaning (`outputSource`) or reject it.
- **`inputs` fallback.** It's kept on purpose; the issue explains why (29 tests depend on the untyped shapes). Not re-litigated here.
- **Other `dict[str, Any]` uses** (`state`, `tool_state`, `post_job_actions`, `set_columns`, `in`) are open by design for tool state and aren't record fallbacks.
