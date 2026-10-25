# Thermo-nuclear review — issue_202_fill_defaults

Reviewed `7acce6db` against `origin/main` `539c16c9`. Skipped findings already handled in `subagents/normal_review.md` and `codex_review.md`.

Acted on (pushed, one commit each):
- `d8507b0b` fill-defaults: moved the JSON-string guard and the `step[field] = filled` write-back into `fillStep`, so `fillNative` and `fillFormat2` no longer duplicate the tail.
- `e5f5a200` lint: collapsed the two 9-line native/format2 calls (each passing `undefined` positionally) into one `validateSteps` call, and dropped the single-use `checks` local.
- `0279da6a` expandToolStateDefaults: one `connected` set feeds both the walker's connections map and the leaf skip, instead of two optional reads.

Not acted on:
- Threading `checks` through ~12 functions in each of `validate-workflow.ts` and `validate-workflow-json-schema.ts`. This is the main structural cost of the branch, but it follows the existing `service` threading. Fixing it means a context object plus a shared dispatcher across both validators and the gxwf-web call sites, which is too big for #202. Written up in `thermo_followup_refactor_issue.md`.
- `findMissingConditionalTests` runs a second recursion (`collectTestParams`) next to the walker, and derives the parent path by slicing strings. Both are small and correct. Adding a container hook to the walker for this one use would add surface for no real gain.
- No file crosses 1k lines (validate-workflow.ts is 830). No security findings.

`make check` green. `make test` green: cli 422, schema 5169, core 167, gxwf-web 117, integration 50, plus the other packages.

<details><summary>Full review</summary>

Verdict: no structural blockers. The core design is sound: the check reuses `walkNativeState`, has a single sink (`completenessResult`) at every ok-return, and the walker change deletes a branch rather than adding one.

1. Structural, follow-up: `checks: StepStateChecks = {}` is added positionally to every validator function in two parallel files, and callers pass `undefined` for `service` to reach it. Missing abstraction: one `StepValidationContext`, plus shared step dispatch with a pluggable state validator (Effect/AJV).
2. Duplication: `fillNative`/`fillFormat2` repeat the same string-guard, fill, and assign tail. Push it into `fillStep`.
3. Spaghetti: lint.ts has two near-identical multi-line calls that differ only in function name. Pick the function, then call once.
4. Boundary: `expandToolStateDefaults` reads `options.connectedPaths` twice through optional chaining, as both a map and a set. Normalize once.
5. Minor: `collectTestParams` is a second tree walk; the parent path comes from string slicing. Acceptable.
6. File size: OK. Types: `as` casts in fill-defaults.ts sit on a raw-dict boundary, which is inherent to editing in place while preserving shape.

</details>
