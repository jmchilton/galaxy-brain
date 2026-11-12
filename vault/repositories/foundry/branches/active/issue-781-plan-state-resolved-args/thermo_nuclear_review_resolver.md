Run via Claude Opus 5.5 at high effort.

# Thermo-nuclear review: resolver (call context, ranking, profile merge)

Scope: the `summarize-nextflow` resolver work at `5c71a900` (`origin/main...`), after four rounds of fixes. The earlier [thermo_nuclear_review.md](thermo_nuclear_review.md) covered only the Markdown-era branch. Fix commit `76194bcf`.

## Acted

- **`effectiveArgs` condition chain collapsed (finding 1).** The four review rounds had piled up in one chain: `fromProfile` → `appended` → `merged` → `candidates`, plus a `rootSelectors` set threaded in from the caller.
  - "Appended after the root chain" is now `ScopedSelector.appended`, set once in `collectScopedSelectors`.
  - "Shadowed by a same-selector profile entry" is filtered once per process, before the per-call loop. It doesn't depend on the call, because one selector reaches the same calls at the same rank.
  - The per-call flow is now: highest rank → appended entries if any → `lastDeclarations` → one id or a tie.
  - The `rootSelectors` parameter is gone.
- **Matching computed once (finding 2).** `selectorRanks` gives each selector a `Map<call, rank>` once per process. Membership, `publish_dir_matches`, `resolved_args` and the effective rows all read that map. Before, the rank was recomputed for every assignment × call × key, recompiling the regex each time. A single `nameMatcher` serves both `withLabel` and `withName`. The deduplicated rank numbering is unchanged.
- **`attachConfigDirectives` split (finding 3).** A pure `configDirectives(process, calls, selectors)` returns `{publish_dir_matches, resolved_args, effective_args}`. The loop keeps only assignment, the template, and label removal.
- **One name/alias → workflow map (finding 4).** The new `workflowsByCallName` replaces three identical copies: `processCallPaths`, `selectPrimaryWorkflow` and `buildSubworkflowInvocations`.
- **Precedence model gets its own module (finding 5).** New `src/selector-precedence.ts` holds the `ResolvedArg` / `EffectiveArg` / `Selector` / `RankedArg` contract, `EXT_KEYS`, `selectorName`, `selectorRanks` and `effectiveArgs`. The ranking rules can now be read in one ~125-line file with no parsing in it. `resolver.ts`: 3815 → 3734 lines. `EXT_ASSIGNMENTS` is derived from `EXT_KEYS`.
- **`selectorName` shared (finding 6)** by `selectorsIn`, ids, the publish entries and the assignments.

## Not acted

- **Include re-parse in `processCallPaths` (finding 7).** The entrypoint isn't a `ParsedWorkflow`, so a per-file read stays either way. Putting bindings on `ParsedWorkflow` would also have to be stripped before emit. The local cache is the smaller change.
- **Global `aliasToCanonical` fallback in call resolution (finding 8).** It's reachable only when a local workflow's name equals another file's include alias, and then it gives a wrong answer. Removing it would simplify `visit`, but it changes behaviour, and a harden step must preserve it. Flagged for John alongside the untraced bare-name fallback, which is already his call.
- **Moving the rest of the config-selector code out of `resolver.ts`.** That covers `collectScopedSelectors`, `parseProcessSelectors` and `extractAssignments`. It's pre-existing code and depends on many shared helpers (`maskNamedBlocks`, `extractBlockAt`, `profileBlocks`, …). The move would bloat this PR's diff, and the file was already over 1k lines on base.
- **Test scaffolding helper (finding 9).** Each test's inline fixture text is the readable spec of its case, and the file's style is inline `write` calls. Tests unchanged; none weakened.

## Behaviour equivalence

Built `dist` and ran the CLI (`--no-with-nextflow`) before and after on bamtofastq, bacass, demo, rnaseq and sarek, each with no profile and with `--profile test`. All 10 full summaries are identical under `jq -S`, not just the three fields, and stderr is identical too.

| fixture | resolved_args | effective_args rows | publish_dir_matches | ties |
| --- | --- | --- | --- | --- |
| bamtofastq (none / test) | 25 / 25 | 25 / 25 | 16 / 16 | 0 / 0 |
| bacass | 46 / 46 | 47 / 47 | 33 / 33 | 0 / 0 |
| demo | 2 / 2 | 2 / 2 | 4 / 4 | 0 / 0 |
| rnaseq | 130 / 134 | 175 / 176 | 121 / 121 | 10 / 10 |
| sarek | 263 / 266 | 354 / 354 | 195 / 195 | 1 / 1 |

summarize-nextflow tests: 135 pass, unchanged.

## Result

Commit `76194bcf`, pushed to `jmchilton`. Gate: `make -k check` passes 496 tests; the only reds are `validate-roadmap` (live roadmap drift) and `check-vendored` (this machine only). Prettier and eslint are clean.

<details>
<summary>Full review (pre-change)</summary>

Scope: `origin/main...5c71a900`, `packages/summarize-nextflow/src/resolver.ts` (+252/-?) and `test/resolver.test.ts` (+721). `resolver.ts` was already 3.5k lines on base, so the 1k rule isn't a presumptive blocker, but the branch adds a new concept (selector precedence) to it with no home of its own.

1. **`effectiveArgs` holds the four rounds of fixes as one condition chain (structural).** `fromProfile` → `appended` → `merged` → `candidates` → `latest` → tie check is a single 30-line closure, and needs a `rootSelectors` set threaded in from the caller. Two facts make most of it disappear. First, "appended after the root chain" is a property of a profile selector (the root never declares its `kind:pattern`), not of a call. Second, "shadowed" is a property of a root entry (a profile entry sets the same selector and key). Neither depends on the call, because the same selector reaches the same calls at the same rank. With both computed up front, the per-call flow is: highest rank → appended ones if any → last per declaration → one id or a tie.
2. **Selector matching runs twice and per key (duplication).** `selectorRank` runs once in the `matched` filter and again for every assignment × call × key inside `effectiveArgs`, recompiling the regex each time. The `withLabel` and `withName` branches also repeat the literal-vs-regex matching. Compute each selector's ranks per call once per process (`Map<call, rank>`), and use one name matcher for labels and names.
3. **`attachConfigDirectives` accretes (busy function).** Membership, `publishDir`, assignments, `rootSelectors`, effective rows, the template, and label deletion all sit in one loop body. Pull the pure part out: `(process, calls, selectors) → {publish_dir_matches, resolved_args, effective_args}`.
4. **Third copy of the name-or-alias → workflow map (missed reuse).** `processCallPaths` rebuilds the map that `selectPrimaryWorkflow` and `buildSubworkflowInvocations` each build already. Extract it once.
5. **The precedence model has no home (decomposition).** `selectorRank`, `effectiveArgs`, the matcher, and the `ResolvedArg` / `EffectiveArg` contract form one cohesive unit with no parsing in it. Move it to its own module so the ranking rules can be read in one place.
6. **`selectorName` built in four places (nit).** The `${kind}:${pattern}` string is written in `selectorsIn`, the publish entries, the assignments, and `rootSelectors`.
7. **`processCallPaths` re-reads includes (minor).** It re-parses include items that `parseWorkflows` already parsed. Moving the bindings onto `ParsedWorkflow` would still leave the entrypoint file (not a `ParsedWorkflow`) needing its own read, so the cache remains either way.
8. **`aliasToCanonical` fallback in call resolution (behavioural).** Once a call misses the file's own includes, it can only be a global process name or a local workflow. So the global alias fallback is reached only when a local workflow's name equals some other file's alias, where it gives a wrong answer. Removing it would simplify the code, but it changes behaviour, which is out of scope for this harden step.
9. **Tests.** The new tests repeat the manifest / `modules.config` / `FOO` module / `main.nf` scaffolding. A helper would trim them, but the existing file style is inline `write` calls, and each test's fixture text is the readable spec of the case. Coverage is strong: ladder, profile vs root, merge position, ties, call chains, aliased subworkflows, per-file includes, and schema validation.

</details>
