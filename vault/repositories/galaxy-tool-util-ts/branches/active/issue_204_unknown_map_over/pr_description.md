Fix 🎯 #204 - `validate --connections` reports false `invalid` edges downstream of a step whose input type is unknown.

When an edge `skip`s because its source type can't be determined (typically an `__APPLY_RULES__` regroup), the validator treated the step as **not mapped**, typed its outputs as plain datasets, and failed every collection consumer downstream. Here is the issue's repro, run against `main`'s CLI and then this branch's:

```
# main (1.14.0)
Connections: INVALID — 1 ok, 1 invalid, 1 skip
  step 3 (__FLATTEN__)
    invalid: 2/report_json -> input
      Incompatible types: output is dataset, input expects collection (any type)

# this branch
Connections: OK — 1 ok, 0 invalid, 2 skip
  step 3 (__FLATTEN__)
    skip: 2/report_json -> input
      Cannot determine output type for 'report_json' on step 2
```

The issue reports a 125-step nf-core/sarek conversion with 22 `invalid` edges, all downstream of an unknown edge: 8 directly and 14 transitively. That workflow runs cleanly in Galaxy, but real wiring errors in that output couldn't be told apart from the false ones. (I didn't re-run sarek on this branch; the tests below cover the direct and transitive shapes.)

**The fix:** if any edge into a step is `skip`, the step's map-over is unknown. Its reported `map_over` stays `null`, and all of its outputs, subworkflow outputs included, become unknown, so downstream edges `skip` rather than fail. Known edges are still checked against each other, so incompatible map-over errors still surface.

**This does not infer `__APPLY_RULES__` output types; those edges still `skip`. It also means every edge downstream of a skip goes unchecked, by design.**

<details><summary>Tests</summary>

`packages/connection-validation/test/unknown-map-over.test.ts`. The first four tests fail on `main` and pass here. The conflict test passes on both; it guards behaviour this branch keeps.

- direct: untyped collection → paired consumer (`skip`) → list consumer (was `invalid`, now `skip`)
- transitive: the unknown state carries through a step whose own edge validates
- mixed: a known `list` mapping next to a skipped edge still leaves `map_over` unknown
- conflict: two incompatible known mappings beside a skipped edge still report `Incompatible map-over types`
- subworkflow: outputs of a subworkflow with a skipped input edge are unknown, not unresolvable

These tests are TS-only. The `connection_workflows` corpus is synced from Galaxy, and `check-sync` rejects local additions. The synced corpus still passes unchanged.

</details>

## Risks

This is a two-way door: it only changes which edges the validator reports, with no persisted state or API shape change. The real tradeoff is that **validation goes quiet downstream of every skip**, including skips caused by a stale input name, not just unknown types.

<details><summary>Risk Details</summary>

- **Validation goes quiet downstream of any skip.** Every skip cause counts: an unknown source type, an unresolvable source output, or an unresolvable target input (for example, a stale input name). Real wiring errors downstream of such a step are now reported as `skip` instead of being checked against a guessed type. That guess was wrong in the reported cases, and narrowing the trigger to unknown sources only is a possible follow-up.
- **Python parity.** The Python twin (`connection_validation.py`) exists only on Galaxy's unmerged `wf_tool_state` branch and still has the old behaviour. It needs the same change when it lands.

</details>

## Context

Only touches `@galaxy-tool-util/connection-validation`, with a patch changeset.

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Small, correct fix; folded the unknown-output marking into one helper and one branch.</summary>

Acted on one finding: the `mapOverUnknown` flag was checked twice and the marking loop was inline, so it now lives in `_markOutputsUnknown`, with no behaviour change. Kept `_resolveStepMapOver` running on known edges so real map-over conflicts still error. Kept the tests TS-only because of the corpus sync check.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings; typecheck and the package's tests passed.</summary>

An independent Codex review of the full diff returned an empty findings list.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
