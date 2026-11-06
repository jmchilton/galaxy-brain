# Filtered findings — gxformat2#277

- Inline subworkflow `run` fallback (`schema/v19_09/workflow.yml` types `run` as `GalaxyWorkflow | str | dict[str, Any] | None`; an inline subworkflow failing strict `GalaxyWorkflow` falls through to `dict[str, Any]`, so `output_source` typos and unknown keys nested in `run:` pass `gxformat2_strict`) — pre-existing code not touched by the PR. Possible follow-up issue: most direct sibling of #276.
- String-shorthand outputs (`{o: "cat/out_file1"}` passes strict, but converter and `_normalize_outputs` drop the string, yielding 0 `workflow_outputs`) — pre-existing code not touched by the PR. Possible follow-up: give the shorthand `outputSource` meaning or reject it.
- TypeScript `gxformat2.effect.ts` still has the `outputs` record fallback (default review note) — not actionable in this PR; sync TS schema sources and fixtures/expectations after merge so the new strict expectation passes under `--strict-structure`.
- Risk note: keep `pydantic:type` override on future regenerations — not actionable; the override lives in `Process.yml`, the regen source.
