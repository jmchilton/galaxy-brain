# Codex review: resolver ranking (`dbca2bc5..fada24fd`)

Codex CLI ran as `gpt-6-sol` at medium effort, read-only. I checked each finding against `resolver.ts` and Nextflow's source. It raised three P1s. Each is a real case, and each is a known conservative limit, not a regression. I made no code change.

1. **Qualified suffix fallback matches an unrelated subworkflow.** Confirmed.
   - `selectorRank` returns rank 3 when `pattern.split(":").at(-1) === call`. So `SUB_B:FOO` applies to a FOO that only `SUB_A` calls.
   - Before this branch, the same fallback already put that entry in `resolved_args`. It now also wins in `effective_args`.
   - A simple guard would reject real selectors. `in_subworkflows` holds only immediate definition names, without subworkflow aliases, and it excludes the primary workflow, so `RNASEQ:FOO` would be rejected.
   - The right fix is per-call scope chains. **Decide:** follow-up issue, or accept.
   - It is already logged in [subagents/normal_review_resolver.md](subagents/normal_review_resolver.md) finding 3.
2. **Same call name from two subworkflows collapses into one tied row.** Confirmed, and intended.
   - Rows are keyed on `invoked_as`, so `SUB_A:FOO` (`-a`) and `SUB_B:FOO` (`-b`) produce `tie: true`. A test asserts this, and the debrief lists it as an accepted tie case.
   - Downstream, the tie stays an open gap rather than a guess.
   - Resolving it needs a call-context key, `invoked_as` plus its scope path, on `effective_args` and in `_plan_state`. That changes the contract the stack (#796, #784) builds on. **Decide:** add it now or later.
3. **Different selectors at the same rank in one config tie.** Confirmed, and intended.
   - Nextflow applies matching selectors in config map order. That order is the order in which each key was *first* inserted across the whole merged chain, not the order of declarations in one file. A key that another included config set earlier keeps its earlier position.
   - So declaration order inside one file isn't enough to settle `F.*` vs `FOO` unless no other config sets either key. The summary ties these cases.
   - **Decide:** keep the conservative tie, or model first-insertion order across the chain.

Coverage: Codex skipped the casts, the generated schema, and the full eval and scenario pages. It found no duplication or abstraction defect.
