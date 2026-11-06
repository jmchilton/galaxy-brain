Fix 🎯 #204 - `validate --connections` reports false `invalid` edges downstream of `__APPLY_RULES__` and other steps whose input type is unknown.

Three changes:

1. **Type `__APPLY_RULES__` outputs from their rules.** Galaxy's editor (via `get_all_outputs`) and the Python validator compute a `type_from_rules` output's collection type from the step's rules mapping; the TS port never did, so every apply-rules edge was `skip`. This ports Galaxy's rule builder DSL (`RuleSet`) to `@galaxy-tool-util/workflow-graph`, checked against Galaxy's `rules_dsl_spec.yml` (synced, like `connection_type_cases.yml`), and uses it in the graph builder.
2. **Make the rules DSL importable by Galaxy's rule builder.** `workflow-graph` is the package Galaxy's client is meant to depend on, so it also gets the pure part of the client's `RuleBuilder/rule-definitions.js`: `applyRules` (column tracking, `rule.error`/`warn`) and `colHeadersFor`, on the same rule implementations. Regexes go through `pyre-to-regexp`, as in Galaxy's client; it's the package's first runtime dependency.
3. **Treat map-over as unknown downstream of a skip.** When an edge still `skip`s (an output with no rules mapping, an unresolvable output or input), the step's outputs become unknown, so downstream edges `skip` rather than fail against a guessed dataset type. Known edges are still checked against each other, so incompatible map-over errors still surface.

With a `list:paired` regroup feeding fastp:

```
# main (1.14.0)
Connections: INVALID — 1 ok, 1 invalid, 1 skip
  step 3 (__FLATTEN__)
    invalid: 2/report_json -> input
      Incompatible types: output is dataset, input expects collection (any type)

# this branch
Connections: OK — 3 ok, 0 invalid, 0 skip
```

The issue's own repro maps two `list_identifiers` columns, which builds `list:list`; this branch now reports that as a real error against fastp's `paired` input (`output is collection<list:list>, input expects collection<paired>`).

The issue reports 22 `invalid` edges on a 125-step nf-core/sarek conversion, all downstream of an unknown edge. I didn't re-run sarek on this branch.

<details><summary>Tests</summary>

- `packages/workflow-graph/test/rules-dsl.test.ts`: every `rules_dsl_spec.yml` case, using the Python harness semantics (error-only cases check `hasErrors`), plus `collectionType` for each mapping shape and Python regex translation (`(?P<name>)`, `\g<name>`, `\1`). The spec also runs through `applyRules` (like the client's `RuleDefinitions.test.ts`, but failing when an error case sets no `rule.error`), with tests for column tracking, error/skip warnings and headers. Mutating unmatched-regex handling, sort order, unknown-rule rejection, column tracking, skip warnings, replacements or header width each fails a test.
- `packages/connection-validation/test/rules-collection-type.test.ts`: `list:paired` mapping validates through a paired consumer (`map_over: list`); `list:list` is `invalid`; no mapping still `skip`s. The first two fail before the graph-builder change.
- Native `.ga` path: real `real-sars-cov2-variant-calling.ga` `__APPLY_RULES__` steps resolve to `list:paired` and `list` (Galaxy mappings with extra keys).
- `packages/connection-validation/test/unknown-map-over.test.ts`: direct, transitive, mixed, conflict and subworkflow cases for the skip fallback. The conflict test guards behaviour this branch keeps.

The connection tests are TS-only: the `connection_workflows` corpus is synced from Galaxy and `check-sync` rejects local additions.

</details>

## Risks

This is a two-way door: no persisted state or API shape change. The tradeoff is that **validation goes quiet downstream of every remaining skip**, including skips caused by a stale input name.

<details><summary>Risk Details</summary>

- **Quiet downstream of any skip.** Every skip cause counts: an untyped source, an unresolvable source output, or an unresolvable target input. Narrowing the trigger to untyped sources only is a possible follow-up.
- **More lenient than the editor for untyped sources into collection inputs.** The editor accepts an untyped output into a collection input without mapping, so its outputs become datasets; this branch marks them unknown. With rules typing in place this is mostly outputs Galaxy can't type either, but TS still skips where Galaxy wouldn't, e.g. a step whose tool isn't in the cache.
- **Regex dialect.** Python `re` patterns go through `pyre-to-regexp`, as in Galaxy's client: named groups and `\1`/`\g<…>` replacements translate; backreferences (`(?P=name)`) and other dialect differences don't, and a replacement naming a missing group yields a literal `$n` where Python raises. Collection typing reads the mapping alone.
- **`applyRules` differs from the current client code in a few deliberate places**: non-numeric compare/sort cells are errors rather than `NaN`; `remove_columns`/`split_columns` drop header markers (the client's `removeColumns` compares string indices and never removes any); unknown rule types are errors rather than crashes. Listed in `docs/packages/workflow-graph.md`.
- **Python parity.** The skip fallback is mirrored on Galaxy's `wf_tool_state` branch (`8bf22007fcd`); rules typing was already there.

</details>

## Context

`@galaxy-tool-util/workflow-graph` minor (new `RuleSet`, `applyRules`, `colHeadersFor` exports; adds `pyre-to-regexp` dependency) and `@galaxy-tool-util/connection-validation` patch. New sync group: `make sync-rules-dsl-spec`.

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Small, correct skip fallback; folded the unknown-output marking into one helper and one branch.</summary>

Run before the rules DSL port. Acted on one finding: the `mapOverUnknown` flag was checked twice and the marking loop was inline, so it now lives in `_markOutputsUnknown`, with no behaviour change.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings on the skip fallback; typecheck and the package's tests passed.</summary>

An independent Codex review of the skip-fallback diff returned an empty findings list. The rules DSL port and `applyRules` have not had a separate review.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
