Run via Claude Opus 5.5 at high effort.

# Normal review: resolver ranking (`dbca2bc5..1087f204`)

Verdict: the shape is right. `id`, per-call `effective_args` rows, and Molds that no longer rank are a real simplification. Two precedence rules didn't match Nextflow's source, and I fixed both, red first.

Checked against Nextflow `master`:
- `ProcessConfigBuilder.applyConfig` and `ConfigSelectorResolver`: `withLabel`, then `withName` against base, simple (alias), then fully qualified name. Each pass applies every matching selector in config-map order, so the last match wins.
- `ProcessDef.cloneWithName`: the qualified name is `<scope>:<alias>`.
- `ConfigParserV1`: a selected profile goes into `overrides`, merged after the file.
- `ConfigDsl.ProfilesDsl.apply` (v2, default since 26.04): profiles are applied in place, at the `profiles { }` block.
- `docs/config.mdx` "Selector priority".

## Findings

1. **Bug, fixed (`36e85683`): qualified names for aliased calls.**
   - `selectorRank` built qualified candidates from both the alias and the process name. So `withName: '.*:FOO'` (or `SUB:FOO`, or the last-segment fallback) ranked 3 for call `FOO_B` and beat the alias's own `withName: FOO_B`.
   - In Nextflow the qualified name is `SUB:FOO_B`, so `.*:FOO` never reaches that call.
   - The rank-3 gate also required a `:` in the pattern. A colon-free regex such as `.*FOO_C` that matches the qualified name applies in the last pass, so it outranks `withName: FOO_C`.
   - Fix: qualified candidates are `<scope>:<call>` only, and any pattern is tested against them. New test "qualifies an aliased call by its alias, and ranks a colon-free regex on the qualified name": red on base (both alias rows took `.*:FOO`), green after.
   - `resolved_args` membership is unchanged, because the canonical-name pass still matches `.*:FOO`.
2. **Contract bug, fixed (next commit): profile beats root.**
   - True only under the legacy parser. Under the strict parser, a root `includeConfig 'conf/modules.config'` placed after `profiles { }` overrides the profile's same-selector assignment, and that is the nf-core template layout.
   - The summary doesn't know the parser and doesn't track position. A profile entry and a root entry at the same rank with different expressions are now a `tie`. With identical expressions there is still one id and no tie.
   - The `+1` profile score is gone.
   - Changed in the same commit: the profile test (renamed, nf-core layout, adds an identical-expression key and a three-way tie), the schema descriptions, Mold index/eval/changes rev 21, schema note rev 14, the generated schema, and the casts.
   - `stack_plan.md` is updated.
3. **Limitation, not fixed: the last-segment fallback is lenient.**
   - `'.*:OTHER_SUB:FOO'` still ranks 3 for `FOO` even if `OTHER_SUB` never calls it.
   - A guard on the preceding segment would break real selectors. `in_subworkflows` holds only immediate, unaliased definition names, and it excludes the primary workflow, so `SUB_X:FOO` (aliased subworkflow) and `RNASEQ:FOO` would be rejected.
   - A correct fix needs per-call scope chains with subworkflow aliases. That belongs in a follow-up if parity runs hit it.
4. **Conservative, accepted.**
   - Two *different* selectors at the same rank in one config (two matching `withLabel`s, `FOO` vs `FOO|BAR`) are deterministic in Nextflow by map-key insertion order. The summary marks them as a tie.
   - Negated `!` selectors predate this change and are unsupported.

## Other checks (no action)

- `id`: stable across line edits, and unique per process. Each (config, profile) walk contributes its own ordinal. Profile includes skip files the root already read.
- `effective_args`: the schema-validated tests exercise its shape. The identical-expression collapse and the per-call rows suit #784.
- Molds and the ledger hold no re-derived precedence. Only `summarize-nextflow` states the ladder.
- Typing and imports are fine.
- Tests: every new resolver test fails without the ranking code (each asserts exact `ids`).

## Gate

Commits `36e85683`, `fada24fd`, pushed to `jmchilton`. `make -k check` green apart from `validate-roadmap` and `check-vendored`.
