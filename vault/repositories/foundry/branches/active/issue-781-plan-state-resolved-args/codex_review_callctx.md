# Codex review: call context (`fada24fd..4c76da2e`)

Codex CLI ran as `gpt-6-sol`, read-only, with no prior findings in the brief. I checked each finding against `resolver.ts`.

1. **P1, CONFIRMED and fixed (next commit): alias lookup was pipeline-wide.**
   - `processCallPaths` resolved call names through the global `aliasToCanonical` map (`resolver.ts:403`). Later files overwrite earlier ones. Nextflow includes are file-scoped.
   - Case: `subworkflows/a.nf` has `include { P as X }`, and `b.nf` has `include { Q as X }`. Q took both `SUB_A:X` and `SUB_B:X`, along with their qualified args. P got no row.
   - Fix: each call name resolves through the calling file's `include`s first. Without one, a locally defined process name is kept. Otherwise it falls back to the global alias map, which covers parser misses. Subworkflow lookup uses the same target.
   - Test "resolves an alias two files bind to different processes by each file's includes" was red first (P's `effective_args` was undefined).
   - The real fixtures (bamtofastq, bacass, demo, rnaseq, sarek) give identical `resolved_args`, `effective_args` and `publish_dir_matches` before and after.
   - The Mold index and the eval say so.
   - Not fixed: `byName` and `parseWorkflows` still key workflows by bare name pipeline-wide. That was true before this branch.
2. **P2, REFUTED as a regression; it's a known limit: a process name inside a string counts as a call.**
   - `parseWorkflowCalls` masks comments but not strings. Every named workflow's `calls` went through it before this branch, and the entry block now reuses it.
   - The case is contrived (`println 'FOO()'` with no real call). Not fixed.
3. **P2, NEEDS-DECISION and already documented: untraced processes keep bare-name rows.**
   - The fallback is intentional. It also covers calls the parser misses (`ch | FOO`). The Mold documents it, and the new dead-workflow test pins it.
   - Codex is right that the eval property said every `call` is a traced path. That prose is fixed.
   - **Decide:** drop untraced processes' rows, or keep the fallback. Keeping it is recommended, because dropping it would silently lose args for parser misses.

Coverage: Codex read the resolver and test sections it judged relevant, not every line. It skipped casts and the generated TS schema, and ran no tests. It checked `ProcessDef` and `ConfigParserV1`.
