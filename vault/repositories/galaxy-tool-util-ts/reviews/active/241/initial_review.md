# Initial review — galaxy-tool-util-ts#241

- Profile: `default`
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `28e93b564fc6fd132ee5fb6bcae621c09db568df` (merge-base `61d5e632`)

## Verdict

Right fix in the right place. `ConversionContext.stepId` no longer falls back to `parseInt` → `NaN`, lint's `outputSource` check now matches Python gxformat2 (`known_labels` is `label or id` plus input ids), and the slash-label false positive is gone. The new tests pass (schema 9, connection-validation 1). One real regression: the edge-annotation callers of `buildWorkflowGraph` don't catch the new throw. The other findings are about sibling consistency (draft-validate, the frame check) and consolidating the resolution logic.

## Findings

### P2 1 — Edge-annotation paths now crash on an unresolved source

`validateConnectionsReport` catches `UnresolvedSourceError`, but the other `buildWorkflowGraph` callers don't:

- `packages/cli/src/commands/annotate-connections.ts` (`resolveEdgeAnnotationsWithCache`, `resolveEdgeAnnotationsAndSpecsWithCache`), which backs `gxwf mermaid|cytoscapejs --annotate-connections`;
- `packages/gxwf-web/src/workflows.ts` `operateEdgeAnnotations`, which goes through the router's catch-all and returns a 500;
- `packages/gxwf-ui/src/composables/useClientEdgeAnnotations.ts`, which catches the throw but drops every annotation for the workflow;
- `validateConnections` in `connection-validator.ts`.

Before this PR these paths got one `skip` edge. Now they throw. Reproduced on the shared fixture `packages/schema/test/fixtures/workflows/format2/synthetic-labeled-step-id-ref.gxwf.yml`, which gxformat2's `mermaid.yml` / `cytoscape.yml` expectations render with the edge (`test_labeled_step_id_ref_edge`):

```console
$ gxwf mermaid synthetic-labeled-step-id-ref.gxwf.yml --annotate-connections
UnresolvedSourceError: Cannot resolve 'meme/out': step 'meme' has the label 'MEME', ...
    (uncaught, Node stack trace, exit 1)
```

Plain `gxwf mermaid` on the same file renders fine. Visualizers deliberately accept the id, per #152.

Suggested fix: make the graph builder the single tolerant point, or catch `UnresolvedSourceError` in the annotate helpers and return empty annotations, maybe with a warning. Either way, add a test on the shared fixture through `resolveEdgeAnnotationsWithCache`.

### P2 2 — draft-validate and conversion now accept disjoint references in map form

This is question 1 from the brief. `draft-checks.ts` keys map-form steps by dict key (`iterateSteps` → `Object.entries(steps)`) and list-form steps by `label ?? id` (`listStepKey`). Conversion and lint, after this PR, key every step by `label ?? id`. Verified with the CLI, using the #229 repro in map form:

| source | `draft-validate` (class Draft) | `lint` / `convert` (this PR) |
|---|---|---|
| `first/out_file1` (key) | resolves | error |
| `First concatenation/out_file1` (label) | `references unknown step "First concatenation"` | resolves |

List form agrees across both. In map form no reference passes both, which is foundry#754's table. The new error tells the author to "Reference it as 'First concatenation/out_file1'", and draft-validate then rejects exactly that. That's the Foundry draft → convert loop. The divergence predates the PR, but the PR makes the conversion side fail loudly and gives advice that the sibling command rejects. The PR body doesn't mention draft-validate.

Suggested fix: key map-form draft steps by `rawStepRenderIdentity(step, key)`, which is already in `labels.ts` and used by `resolveDraftOverlay`. Alternatively, at minimum, open a follow-up issue and note it in the PR body. A key-only reference in draft-validate could reuse the same "has the label" hint (`format2ShadowedStepIds`) instead of its current port error.

### P3 1 — One resolution rule, now implemented three times

This is question 2. Conversion, lint and frames now share `format2StepLabelIndices` + `resolveSourceReference` (good: one label set, one parser). They agree on every edge case I probed: labels with `/`, numeric refs, `1abc`, subworkflow-local labels, `$link`, multi-source lists, slashless refs, outputSource. But each hand-rolls the "known label or all digits" predicate:

- `toNative.ts` `stepId`: `labels.has(key)` / `/^\d+$/`;
- `lint.ts` `unresolvedRef`: `known.has(ref) || /^\d+$/`;
- `comments.ts` `unresolvedFrameReferences`: `!stepLabels.has(ref) && !/^\d+$/`.

`format2ShadowedStepIds` is also built separately from the index map in both lint and toNative. Connection-validation consumes `toNative` output, so it isn't a fourth copy. The visualizers (`mermaid.ts`, `cytoscape.ts`) intentionally use a wider set (ids too) and draft-checks uses its own (P2 2).

Suggested fix: one helper in `labels.ts`, e.g. `resolveFormat2Source(source, index) → {ref, output, orderIndex} | {unresolved, ref, labelOfId}`, or a small `Format2LabelIndex` holding both maps. `ConversionContext`, `validateSources` and `unresolvedFrameReferences` would all use it. That leaves the reusable abstraction behind instead of a third copy.

### P3 2 — Label-shadows-id belongs in the shared declarative fixtures; lint parity with Python

This is question 3. The fixture already exists and is synced: `synthetic-labeled-step-id-ref.gxwf.yml`, used today only by the mermaid and cytoscape expectations. Python `gxformat2/lint.py` `_validate_output_sources` already rejects an id-named `outputSource`, since `known_labels` is `s.label or s.id`. It doesn't check step `in:` sources at all, so TS lint is now stricter than Python on `lint_format2`.

Suggested fix: a gxformat2 counterpart PR that adds the `in:` source check to Python lint, plus `lint_format2.yml` (and, if wanted, an ensure_native/to_native error) expectations on that fixture. Then sync. The TS-only `.test.ts` cases can stay for the error-message detail. The PR body offers the gxformat2 change; this argues for doing it.

### P3 3 — The `runtime_value` shortcut shadows a real label

This is question 5. `stepOutput` returns `NaN` for `RUNTIME_VALUE_SOURCE` before the label lookup, and lint skips it the same way. A workflow input or step that is actually labelled `runtime_value` now converts to `{"id": null}`; on base it resolved to its index. Verified:

```
inputs: {runtime_value: data}; steps: {s: {in: {input1: runtime_value}}}
→ input_connections {"input1":[{"id":null,"output_name":"output"}]}
```

It's unlikely, but it's a silent regression in the exact bug class this PR closes. Suggested fix: `if (value === RUNTIME_VALUE_SOURCE && !this.labels.has(value))`, and the same guard in lint's skip.

### P3 4 — The synthetic connection-report entry bends the report model

This is question 5. `unresolvedSourceReport` returns a `ConnectionStepResult` whose `step` is a source string (`"first/out_file1"`). Everywhere else `step` is a step index. It also invents `step_type: "unresolved_source"` and counts `summary.invalid: 1` with zero connections. The CLI prints `step first/out_file1`. Only the first unresolved source is reported, because toNative throws on the first, while lint reports all of them. `ConnectionValidationReport` mirrors the Python and gxwf-web report model, so this is a shared contract.

The catch is also class-specific: a frame-reference failure (#227, a plain `Error` from `_buildNativeComments`) still escapes `validateConnectionsReport` uncaught. Consider routing conversion failures to a top-level error field (#220's proposal) instead of a fake step result. If the shim stays, document it in `report-models.ts` and give frame errors the same treatment.

### P3 5 (nit) — Two messages for the same unresolved-ref condition

An unshadowed bad `outputSource` keeps the old "references step '…' via outputSource '…', but no step or input with that label exists" text. A bad `in:` source and a shadowed `outputSource` use `unresolvedSourceMessage` ("Cannot resolve '…': no step or input has the label '…'"). Neither form is pinned by a synced `lint_format2.yml` expectation, so both could use `unresolvedSourceMessage`. Optional.

## Notes (not findings)

- Question 4, callers of `toNative`. `gxwf convert` and `convert-tree` print a clean `Conversion failed:` / per-file `ERROR`. gxwf-web's convert operations go through the router's 500 catch-all, the same as for the #227 frame throw. galaxy-workflows-vscode calls `toNativeStateful` only on explicit convert (wrapped in try/catch); its diagrams don't call `toNative`. So the precedent holds, except for the annotation paths in P2 1.
- Pre-existing, not from this PR: `convert-tree` prints `Summary: 2 workflows converted` when one of the two errored.
- `gxwf validate` without `--connections` still reports OK for the bad file, because structural validation doesn't run conversion. That's expected, but worth knowing given the PR's "before planemo test" framing.
