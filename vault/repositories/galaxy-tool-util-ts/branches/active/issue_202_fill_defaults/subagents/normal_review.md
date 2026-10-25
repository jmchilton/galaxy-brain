# Normal review — issue_202_fill_defaults

I acted on every finding:
- P2-1: json-schema mode now shares `completenessResult`.
- P2-2: lint and draft-validate pass the checks through the shared step-validation functions. gxwf-web validate takes no `strict_state`, so the API is unchanged and there is no OpenAPI regen.
- P3-3: embedded GalaxyUserTool steps now get filled through `resolveEmbeddedTool`, instead of only getting a warning. Non-inline subworkflows (URL `run:`, or native `type: subworkflow` without an inline body) now warn.
- P3-4: `in:` is parsed with `normalizeStepIn` + `nativeConnectionsFromFormat2In`.
- P3-5: the filled count now compares before and after.
- P3-6: added tests for a connected test param, a subworkflow, native fill, the already-complete count, and the JSON-string/non-inline warnings.
- Trimmed the `findMissingConditionalTests` docstring.

Not acted on:
- I did not port `/` separators for `in:` keys. The shared helpers (and validate) don't translate them either, so reusing them keeps fill-defaults consistent with validate. Supporting `/` belongs in the shared helper if needed.
- fill-defaults still doesn't use validate's expanded walk with `expansionOpts`. It edits the raw dict in place to keep the file's shape; it now warns on non-inline subworkflows instead of fetching them.
- P3-3/4/5 landed in one commit. All three were interleaved in the same `fill-defaults.ts` rewrite.
- P3-7 (CLI test covers only a top-level conditional): accepted as-is. The schema tests cover nesting, and the new subworkflow test adds a nested CLI case.

<details><summary>Full review</summary>

Verdict: core is sound — walker reuse correct (walkNativeState + selectWhichWhen follows default when for absent conditionals; expandToolStateDefaults+connectedPaths reuse). One real consistency bug: new --strict-state check only wired into effect mode. Several smaller gaps.

P2:
1. `--mode json-schema --strict-state` silently skips the conditional check.
2. Strict-state sibling paths not updated (lint.ts:264, draft-validate.ts:205, possibly gxwf-web).

P3:
3. fill-defaults re-walks steps by hand; embedded GalaxyUserTool silently skipped, no expansionOpts, native embedded tools ignored.
4. rawInKeys assumes `|`-joined in keys; reuse nativeConnectionsFromFormat2In.
5. Counts every resolved step as filled.
6. Test gaps: connected test param, subworkflow, native fill-defaults, tool_state JSON-string warning.
7. CLI test only covers top-level conditional (acceptable).

Docstring slightly long. No security findings.

</details>
