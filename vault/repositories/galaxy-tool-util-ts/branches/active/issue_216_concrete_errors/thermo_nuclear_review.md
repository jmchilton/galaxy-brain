Run via claude-opus-5-5 at high effort.

The branch's one structural problem was how labels reached nested steps, and I fixed it: walkers now qualify a subworkflow's results as they come back, so the three-state `parentLabel` parameter is gone from all four signatures. I also fixed three small type and duplication findings and added the missing deep-nesting test. Reports don't change. Nothing here blocks the branch; what I left is either pre-existing structure or John's call on the contract.

Not acted on:

- **Three lists of the same six checks** (`isConcreteOk`, `concreteErrorCount`, `collectConcreteErrors`). Deriving `ok` from `collectConcreteErrors` would make "`ok: false` always has an entry" true by construction, but it rewrites how an existing field is computed. Follow-up, below.
- **The four walkers.** Each `withStepLabel` call is repeated per walker because the walkers are copies. Merging them is the large refactor this branch shouldn't take on.
- **`stepLabel` holds a position, not a label.** It's a pre-existing name on 83 lines across the two walker files, and it reads badly beside the new `label`. Renaming it now would bury the branch's diff.
- **`report-models.ts` size.** It was already past the limit at 1127 lines and is 1198 now, so the branch didn't cross it. The issue names this file as the place for the change.
- **A `/` inside a label makes the path ambiguous.** The issue fixes the `outer/inner` format, so this is John's call.
- **Unlabelled-step entries can't be told apart, and `failures[]` in `validate-tree --json` has no label.** Both are carried over from the earlier reviews and remain open for John.
- **`docs/guide/workflow-operations.md` shows an outdated `gxwf validate --json` shape** (`step_id`, `failed`, a `steps` array). That predates this branch, and adding `label` to a wrong example wouldn't help.

<details><summary>Full review</summary>

## Acted on

### 1. Structural: a three-state parameter threaded through four recursive walkers (`c64d798d`)

`parentLabel?: string | null` was added to all four walkers, with `undefined` meaning top level, `null` meaning under an unlabelled step, and a string otherwise. A reader of the walker couldn't see that distinction without opening `stepLabelPath`, and the parameter sat after an optional `service?` in two of the walkers.

The walkers already recurse and collect the results, so the label can be qualified there:

```ts
results.push(...withParentLabel(subResults, label));
```

`withParentLabel` joins `outer/inner` when both exist and otherwise drops the label. "Any unlabelled level clears the whole path" now follows from there being nothing to join, and it needs no state of its own. `stepLabelPath` is deleted, the walker signatures match `origin/main` again, and the native walkers no longer need a `label` local.

Behavior is the same: the label is still the slash-joined path when every level has a non-empty label, and absent otherwise. The field also lands in the same key position.

I considered and rejected a post-pass that walks the workflow and joins labels to results by step number. It would leave the walkers untouched, but it adds a fifth copy of the numbering rules and a join on a string key.

### 2. Boundary: `nativeStepLabel` promised `undefined` it never returns (`0f2bf001`)

The return type was `string | null | undefined`, though every path returns a string or null. It was harmless while internal, but this branch exports the function publicly. Narrowed to `string | null`.

### 3. Duplication: two definitions of "skipped" (`0f2bf001`)

`draft-validate.ts` built `strict_state_errors` from `status !== "ok" && status !== "fail"`, while `collectConcreteErrors` builds its `strict_state` entries from `SKIP_STATUSES`. The two sets are equal today, but a new status could make the array and its entries disagree. `draft-validate.ts` now uses `SKIP_STATUSES`.

### 4. Boundary: ad-hoc step shape in `collectConcreteErrors` (`0f2bf001`)

`forStep` took an inline `{ label?: string | null; tool_id: string | null }`. It now takes `Pick<ConnectionStepResult, "label" | "tool_id">`, which `ValidationStepResult` also satisfies.

### 5. Tests: duplicated parsing and no deep-nesting case (`88d5a66c`, `c64d798d`)

`concrete-errors.test.ts` added two more copies of a JSON-parsing block that `user-defined-tool-step.test.ts` already had as a local helper. It's now `jsonOutput` in `helpers/cli-test-context.ts`, used by both files. `validate-workflow-connections.test.ts` and `validate-workflow-connection-keys.test.ts` still have their own copies, which I left alone.

Nothing tested three levels, which matters more now that labels are composed on the way up. I added `labelled/mid/inner_cat`, plus an unlabelled middle level, in both validation modes.

To check the coverage I ran five mutations against `concrete-errors.test.ts`, and the tests caught all of them:

- `withParentLabel` keeping the inner label under an unlabelled parent: 3 failures.
- Each of the four walkers skipping `withParentLabel`: 1 to 4 failures, including the walker's own mode and format.

## Not acted on

### Three lists of the same six checks

`isConcreteOk` in the CLI, and `concreteErrorCount` and `collectConcreteErrors` in schema, each enumerate the checks. The issue requires the count and the array to differ, so those two stay separate, but `ok` could be defined as "`collectConcreteErrors` found nothing". That would make the issue's goal structural instead of something tests have to confirm.

I read every place that builds a result, and the invariant holds today: all skip results carry errors, all `fail` results carry errors, and `invalid` connections always carry errors. The one theoretical gap is `formatAjvErrors` returning `[]` when `validate.errors` is unset, which Ajv doesn't do on a failed validation.

I left this because it changes how an existing field is computed and the branch's contract is that those fields keep their meaning.

### The four walkers

The walkers differ only in how they iterate (`Object.entries` versus an index), how they read the label, and which step validator they call. One generic walker with those three injected would remove the repeated `withStepLabel` and `withParentLabel` calls along with the existing duplication. This branch adds about four lines per walker and doesn't make that materially worse.

### Reviewed with no finding

- **`collectConcreteErrors`.** It's direct and reads in report order, and it belongs next to `buildSingleDraftValidationReport`, as the issue says.
- **`withStepLabel`.** It earns its place: results are built at about 30 sites, so setting the label at each one would be much worse.
- **Contract.** Existing fields, `summary` and exit codes are unchanged. `check` values and the `label` semantics match the issue. A run of the issue's example workflow, without its `outputs` block, through the built CLI gives `ok: false`, `1 error`, exit 1 and one `tool_state` entry labelled `cat`.
- **File size.** No file crossed 1000 lines because of this branch.
- **`label: ""` in `graph-builder.ts`.** The one-line change is the right layer. `edge-annotations.ts` falls back to the step id through `??`, so it now treats an empty label as absent too.

No security concerns.

</details>
