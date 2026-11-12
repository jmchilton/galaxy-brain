Run via Claude Opus 5.5 at high effort.

# Normal review: call context and profile win (`fada24fd..9727baa6`)

Checked against Nextflow `master` (fetched with `gh api`):

- `BindableDef.invoke_a`: `fqName = prefix ? prefix + ':' + name : name`, where `prefix` is the running workflow's name. With no prefix (the anonymous entry) the def is cloned without renaming.
- `ProcessDef.cloneWithName`: `processName = fqName`, `simpleName = stripScope(fqName)`. `createTaskProcessor(session, owner, processName, ...)` names the processor `processName`, which is `task.process`. `applyConfig(configProcessScope, baseName, simpleName, processName)`.
- `WorkflowDef.cloneWithName` / `run`: a called workflow pushes itself with its qualified name, so the path nests.
- `BaseScript.run0`: `-entry X` sets `entryFlow = meta.getWorkflow(X)` and calls `entryFlow.run()` directly, so its processes are `X:...`. That is the real analogue of "uncalled named workflow is a root". `WorkflowEntryHandler` is only `nextflow module run` with exactly one named workflow; the debrief now says so.
- `ConfigParserV1`: profile blocks go to `overrides`, then `config.merge(overrides)`. `ConfigObject.merge` merges an existing key in place and appends a new key.

The call path implementation matches: anonymous entry adds no segment, subworkflow aliases are segments, and ranking over `unique([base, simple, fq])` with whole-name matching follows `ProcessConfigBuilder.applyConfig` (the fq pass only re-applies when it equals simple, so dedup is right).

## Findings

1. **Bug, fixed (`4c76da2e`): profile win could pick a wrong winner instead of a tie.**
   - `effectiveArgs` narrowed the whole top rank to profile entries. Under V1, a profile selector the root also declares is merged into the root's key *at the root's position*. Another root selector at the same rank inserted later still applies after it.
   - Example: root `withName:'FOO' {args='-r'}` then `withName:'FOO|BAR' {args='-rb'}`, profile `withName:'FOO' {args='-p'}`. Nextflow: `-rb`. Head: the profile id alone, no tie. Without the profile the summary would have tied `-r`/`-rb` (P1 #3), so adding a profile turned a conservative tie into a confident wrong answer.
   - Fix: profile entries win outright only when the root chain never declares their selector (counting declarations that set only `publishDir`, since those still create the key). Otherwise a profile entry replaces only root entries with the same selector, and what's left at the rank ties if expressions differ. Two profiles still tie, root still loses to a profile on the same selector.
   - Test "ties a profile selector the root chain also declares with another root selector": three configs (root declares FOO with args → tie; root declares FOO with publishDir only → tie; root lacks FOO → profile wins). Red on head (first case returned the profile id alone), green after.
   - Prose updated: schema `EffectiveArg` description, Mold index/eval/changes rev 21, schema note rev 14. Casts regenerated.
2. **Pinned, not changed: process only an uncalled named workflow calls.** With an anonymous entry, `workflow DEAD { BAR() }` is untraced, so BAR falls back to bare-name rows (`call: "BAR"`) and `DEAD:BAR` doesn't match. Bare rows won't match a trace, but the fallback also covers parser misses, so it stays. New test pins it.
3. **Reuse, fixed:** `entryWorkflowCalls` rebuilt the same known-name set as `parseWorkflows`; both now use `callableNames`.
4. **Limit, noted.** Fallback is per process, not per alias: if alias `FOO_A` is traced but `FOO_B` is reached only through a parser miss (`ch | FOO_B`), `withName: FOO_B` entries drop out of `resolved_args`. Known-limits bullet in the debrief covers parser misses; the real-fixture diff shows 0 dropped entries.
5. **Apostrophe fix.** The `//` skip sits only outside quotes, matching `maskNextflowComments`. Block comments are already masked before `extractWorkflowBlocks` calls it. It now applies to all ~10 `extractBlockAt` callers (config included); the four-fixture diff (demo, bacass identical; rnaseq, sarek only additions) covers them. No committed golden encodes rnaseq's primary workflow, so the `PREPARE_GENOME` → `NFCORE_RNASEQ` change breaks nothing.
6. **`_plan_state.calls` / `source_arg` coherent.** Template, eval, scenarios (new two-subworkflow case uses `.*:SUB_A:FOO` and `PIPE:SUB_A:FOO`, consistent with resolver behaviour), ledger and draft-format note all say `calls` holds `effective_args[].call` values; `source_arg` stays `{step, arg, flags?}`.

## Test changes audit

| Change | Verdict |
|---|---|
| `SUB_A:FOO`/`SUB_B:FOO` tie test → two rows; root `PIPE` → anonymous entry | Follows from (b). Under a named root, `SUB_A:FOO` genuinely doesn't match (whole-name), and the chain test covers that negative. **Strengthened** here with `validateSummary` and `resolved_args` id assertions. |
| Ladder: `SUB:FOO_B` → `PIPE:SUB:FOO_B`, bare `SUB:FOO_B` kept | Strengthening. The real fq name under root `PIPE` is used, and the bare selector is asserted absent from `resolved_args`. Every ladder rung (label < process < alias < fq) still decides a row. |
| Directives test `SUB:BAZ` fixture | The old expectation encoded the removed fallback bug (BAZ called only by `PIPE`). Restructured so `SUB` really calls BAZ, selector unchanged. The negative (qualified selector not reaching another subworkflow's call) is asserted by "matches qualified selectors only along a call chain" (`SUB_B:FOO`, `PIPE:BAR` vs `NFCORE_PIPE:PIPE:BAR`). `.*:BAR` now matches via the real path `PIPE:BAR`. Fine. |
| bamtofastq fixture rebuilt in nf-core layout | Realism. Alias selectors rank the same under either layout; ids unchanged; only the key and paths changed. |
| Profile test flipped (profile wins) | Follows from (a). The identical-expression collapse it no longer exercises is still covered by `prefix: 'same'` in the two-config tie test. Two-profile tie kept. |

No change weakens or accommodates. Net: three tests strengthened or added.

## Gate

`4c76da2e` pushed to `jmchilton`. `make -k check`: 496 root tests pass; only `validate-roadmap` (same 6 live-state errors: #803, #805, #783) and `check-vendored` fail. summarize-nextflow 134 tests pass (dist rebuilt). Format, lint, typecheck clean.
