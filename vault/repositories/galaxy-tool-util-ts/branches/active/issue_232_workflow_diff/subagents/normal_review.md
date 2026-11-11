Run via Claude Opus 5.5 at high effort.

Reviewed `bb20f750` against gxformat2 `diff.py` at `4440404` and its contract. Acted on two parity bugs found by Python-vs-TS probes, both red-to-green, plus a reuse refactor and typing. Fixes are in `54c68efb`, pushed to `origin`. The local gate is green: `make check`, `pnpm lint:unused:ci`, `pnpm build`, `pnpm test`.

- **Fixed: untyped steps with a `run` reported `type: tool`.** Python's normalizer infers `subworkflow`; the TS normalizer doesn't infer a type. This hit every Format2 subworkflow step that omits `type`, not only drafts. The new `inferredStepType` in `normalized/format2.ts` replaces identical copies in `mermaid.ts` and `cytoscape.ts`.
- **Fixed: duplicate self-loop edge.** `StepSummary.connections` listed a self-sourcing edge twice. Python takes the set union.
- **Refactor:** output action names now derive from `NormalizedFormat2StepOutputSchema.fields` minus `id`, not a hand list. Undeclared `out` keys stay out, pinned by a test.
- **Typing:** `plan_fields*` is now `Partial<Record<PlanField, string>>`, matching `draft-checks`.
- The contract section of the TS debrief is updated: the integer-key wording is corrected, and the Python `out`-extras divergence is added.

## Not acted on

- **Integer-like key order:** accepted and documented. JSON object order isn't semantic, it only affects mixed labeled/unlabeled list-form steps, and those already warn.
- **Lenient normalization, null-filled nested model shape, `1` vs `1.0`, non-ASCII text escaping:** accepted as the debrief lists them. None is fixable cheaply. galaxyproject/foundry#796 wants removed steps (matched to the ledger `step` field) and unwired inputs, and none of these divergences touches those.
- **User-tool precedence in `inferredStepType`:** a `GalaxyUserTool` run is always `tool`, whereas Python honors an explicit `type:` first. This only matters for invalid input; it's recorded as a divergence in the debrief.
- **Shared Python-truthiness helper with `toNative._isTruthy`:** there's no natural shared module, and it's 5 lines.
- **Normalizer alias fix:** correct, and Python also gives `data`. The cross-language pin belongs in the synced `normalized_format2.yml` (Python side). The diff-level test covers it until then.
- **Library native check (`a_galaxy_workflow === "true"`) narrower than the CLI's `detectFormat`:** matches Python exactly, so left as is.
- **Duplicate list-form labels:** only affects invalid Format2, which lint catches.
- **`isRecord` copies:** a pre-existing pattern.

## For the Python side (gxformat2#296), not edited here

1. `_out_actions` dumps the `extra="allow"` `WorkflowStepOutput`, so an extra key such as `_plan_note` on an `out` entry counts as an action change. Restrict it to the declared fields (`model_fields` minus `id`).
2. Add `diff.yml` cases for:
   - an untyped inline/linked subworkflow step (expects `type: subworkflow`);
   - a removed self-looping step (`connections` lists the edge once).
3. Add `[inputs, 0, type_] → data` to `test_list_form_inputs_outputs_steps_normalized` in `normalized_format2.yml`.
4. The contract's integer-key bullet understates the issue: keys are hoisted ahead of string keys, not just reordered among themselves.

<details><summary>Full review</summary>

**Scope.** 35 files, about 2,000 lines, mostly synced fixtures. Real code:
- `workflow-diff.ts` (699 lines)
- `cli/commands/diff.ts`
- the harness change
- the normalizer list-form alias fix
- `draft-checks` exports

**Parity read.** Compared `workflow-diff.ts` with `diff.py` function by function. These match:
- loading and rejection
- step identity (`iterateSteps`)
- the source resolver (raw inner id plays the role of Python's normalized `step.id`)
- the input field set and absent defaults
- state flattening
- run reference
- `in_defaults`
- membership rules
- ordering of lists
- `has_changes`
- warnings
- unwired inputs
- the text renderer

**Probes.** Each probe diffed TS dist against the gxformat2 `.venv` Python.

| Probe | Result before fix | Result at `54c68efb` |
|---|---|---|
| A: removed self-looping step | TS duplicated the edge in `connections` | equal |
| B: mixed labeled/unlabeled list form | TS key order `2, a, c`, Python `a, 2, c` | unchanged (documented) |
| C: draft with untyped inline draft subworkflow | TS `type: tool`, Python `subworkflow` | equal |
| D: `out` entry with `_plan_note` | Python reports an out_actions change, TS none | unchanged (TS is right per contract) |

At `54c68efb`, a deep-equal JSON rerun over all 19 distinct `diff.yml` fixture pairs matched Python.

**Divergence verdicts.**
1. Integer keys: acceptable, with corrected wording.
2. Lenient normalization: acceptable. It's a general TS normalizer trait.
3. Nested-model nulls: acceptable for membership. Value shape differs; Foundry shouldn't depend on null-filled keys.
4. Numbers: unavoidable.
5. Text: not contract.
6. (New) `out` extras: Python should change.

**Harness.** `fixture_after` is optional on `TestCase`. The runner skips the case if either fixture is missing and spreads both into the operation, on both the error and success paths. That's correct and minimal. Other `loadExpectations` users (tool-xml, integration-tests) read different directories, so they're unaffected.

**CLI.** Matches the `draft-*` siblings:
- `readWorkflowFile`
- `resolveFormat` native rejection
- exit 2 on read, native and `$graph`
- `--json` as `JSON.stringify(…, null, 2)`
- the spec entry and handler registration

`--exit-code` mirrors `git diff`. Python raises (traceback) where TS exits 2; that's fine.

**Reuse.** Good reuse of `normalizedFormat2`, `resolveSourceReference`, `iterateSteps` and `presentPlanFields`, with the two inline `PLAN_FIELDS` filters consolidated. Result types are plain interfaces, like sibling report models in `report-models.ts`.

</details>
