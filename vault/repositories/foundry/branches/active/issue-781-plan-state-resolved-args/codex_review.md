Run via gpt-6-sol at medium effort.

# Codex review: issue-781-plan-state-resolved-args

Reviewed `5b3f2b78` against `origin/main` `df991d0d` (Codex CLI 0.166.0, `codex exec -s read-only` with the findings schema). One finding; confirmed and fixed.

## Acted on

- **P2: `source_arg` can't tell apart assignments that share `key` + `selector`.** Confirmed. `ResolvedArg` in `packages/summarize-nextflow/src/resolver.ts` carries `config` and an optional `profile` (set for selected-profile assignments). `resolved_args` keeps every matching assignment, so a root-chain `withName:FOO` and a profile `withName:FOO`, or the same selector in two included configs, give two entries with the same `step`/`process`/`invoked_as`/`key`/`selector`. Their ledger records were identical, so the "join on `source_arg`" rule and the per-entry coverage checks couldn't see which entry a record covered. Fix in `content/research/open-requirements-ledger/index.md`: `source_arg` now copies the entry's `config`, and `profile` when present; both examples carry `config`; the override and tie rules name the winning or tied entries by `selector` and `config`, not by selector alone. Casts regenerated.

## Not acted on

- Nothing else raised. Codex didn't materialize the bamtofastq fixture or run checks, and treated casts as derivative.
- Not raised but noticed while fixing: the precedence rule doesn't say that a selected profile's assignment overrides the root chain's at the same selector. Today that case is a "tie" with an open entry, which is safe (it surfaces rather than guesses). Left for John; ranking profile over root is a small follow-up if wanted.

<details>
<summary>Full Codex review</summary>

Files reviewed: `content/meta/*` (glossary, architecture, code-architecture, content-model, build-and-validation, repository-layout, molds, harness-pipelines, casting, corpus), `README.md`, the three Molds' `index.md`/`eval.md`/`scenarios.md` (+ template `refinement.md`), `content/research/galaxy-workflow-draft-format/index.md`, `content/research/open-requirements-ledger/index.md`, `packages/summarize-nextflow/src/schema/summary-nextflow.schema.json`, `packages/summarize-nextflow/src/resolver.ts`, `packages/summarize-nextflow/test/resolver.test.ts`, `content/molds/summarize-nextflow/index.md`, `content/cli/gxwf/draft-{next-step,validate,extract}.md`.

Coverage notes: "Generated casts were treated as derivative and not reviewed individually. The pinned bamtofastq fixture was not materialized in this worktree. Checks were not run."

Finding (P2, correctness, certain) — `content/research/open-requirements-ledger/index.md:189` — **The ledger join key cannot identify repeated source assignments.**

> The protocol says to join records to the summary on `source_arg`, but that object omits the summary entry's `config`, `profile`, and `expression`. The resolver retains every matched assignment, including multiple assignments with the same `key` and `selector`. The tie rule on line 186 requires records for both, yet their `source_arg` values can be identical. The per-step coverage check can therefore treat one record as covering two distinct assignments.
>
> Failure scenario: A process has `withName:FOO` assignments of `ext.args = '--threads 4'` in one included config and `ext.args = '--threads 8'` in another. Both appear in `resolved_args`. Their ledger records have the same step, process, key, selector, and `--threads` flag, so a consumer cannot determine which assignment was carried or verify that both received dispositions. A state using the wrong thread value can pass the new record-presence check.

`expression` was not added to `source_arg`: `config` + `profile` already separate the assignments the resolver can emit, and copying a closure into every record duplicates the summary.

</details>
