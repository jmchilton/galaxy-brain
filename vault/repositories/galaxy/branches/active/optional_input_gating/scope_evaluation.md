# optional_input_gating — scope evaluation (2026-10-27)

**Recommendation: expand modestly.** Generalize the orphaned-connection fix. Whenever a step's `when` changes, drop every input-side connection that no longer has a terminal under the new `when`, and decide that with the same predicate `findStepExtraInputs` uses. Run the removal through the terminal path (`dropConnection` → `resetMappingIfNeeded`) so map-over stays correct. This makes custom → none/presence and presence(probe) → none/boolean/other-input safe, along with today's boolean → anything. Clearing a custom or probe gate already strands links on dev and 26.2; the branch adds the probe → boolean and probe → other-input transitions. Keep everything else as implemented: twin dispatch, the inverse-gate evaluator, the `presenceGateAssumed` flag and the separate `UpdateStepConnectionsAction` subclass. The `unknown` policy is John's call (scope 8).

Evaluated at `0bd89181eb3` (4 commits on `origin/dev` `a9a68082414`). The diff is +2368/−112 across 26 files: about 1,050 lines of non-test client code and YAML specs, 920 lines of client tests, 140 of Selenium, 207 of framework fixtures and 142 of docs.

## Possible Decompositions

This section lays out ways to split the work for John to choose from. It doesn't recommend one. Line counts are rough, include tests, and overlap where pieces share files.

Constraints that hold in every option:

- **The evaluator comes before or with twin dispatch.** `gatedThroughSharedSource` calls `expressionGuardsInputPresence`.
- **Validity without the evaluator is looser.** Acceptance falls back to "the gate references the input", per `implementation_debrief.md`. A PR without the evaluator therefore accepts inverse gates on consumed inputs, and the inverse-gate negative-control tests (`canAccept` "only when the gate guards that input", the twin refusals) move to the evaluator PR.
- **The orphan fix and the baseline framework tests have no dependencies.** Either can land first, in either order. The dev path of the orphan fix (uncheck the boolean, leaving `when` linked) is also reachable on `release_26.2`. #23816 and #24107 are there (#24107 was retargeted at Marius's request), so the fix is a plausible 26.2 bug fix.

### Option A — the four commits as four PRs

1. `208b8ffae50` helper extraction: about 70 lines, refactor only.
2. `ad56e6175c8` orphaned `when` connection fix: 121 lines. A candidate for `release_26.2`, and the place the recommended expansion would land.
3. `1806356a0ef` baseline framework-workflow tests: 207 lines of fixtures that pass on dev.
4. `0bd89181eb3` the feature: +2014/−94.

Commits 1–3 are small and easy to review. Commit 4 is still large.

### Option B — fixes first, then the feature in three layers

1. **Orphan fix**, expanded as recommended, plus the helper refactor. Targets `release_26.2` or `dev`.
2. **Baseline framework tests.** Can fold into 1 or 3.
3. **Core authoring.** `FormConditional` modes (none/boolean/presence/custom), drop-to-gate (`assessDrop`, `connectWithPresenceGate`, NodeInput confirm), `presenceGate.ts` minus `gatedThroughSharedSource`, and terminal validity using reference-based acceptance. Also the two main Selenium tests and the docs, minus the twin section. About 1,100 lines with tests.
4. **Inverse-gate evaluator.** `classifyWhenInputIsNull`/`PresenceEvaluator` (about 300 lines in `whenExpression.ts`), the `null_behavior`/`guards_presence` spec rows, and the stricter `stepGatesInputPresence`. Inverse-gate negative controls move here. About 550 lines.
5. **Data probes and twin dispatch.** `gatePortTerminalSource`, `refreshGatePortsReadingSource`/`gatePortSourceShapeChanged` in the store, `gatedThroughSharedSource`, the synthesized-port and twin tests, `test_editor_twin_dispatch_connections_valid`, the `twin_probe` fixture and the docs twin section. About 450 lines.

### Option C — validity first, then authoring

1. Orphan fix and helpers, as in B1.
2. **Validity only, no UI.** `presenceGate.ts` (`stepGatesInputPresence`, `gatedThroughSharedSource`), the `isPresenceGated` hooks in `terminals.ts`, the evaluator and spec, probe typing in the store, terminal and store tests, all framework fixtures and the twin Selenium test. Imported workflows that are valid at runtime stop being flagged invalid. This is arguably a bug fix and a `release_26.2` candidate. About 1,100 lines.
3. **Authoring UI.** The `FormConditional` mode selector, drop-to-gate (`canAcceptWithPresenceGate`, `presenceGateAssumed`, `assessDrop`, `connectWithPresenceGate`), NodeInput and FormConditional tests, the gate and drop Selenium tests, screenshots and docs. About 1,000 lines on `dev`.

### Option D — two PRs

1. Helpers, the orphan fix (expanded) and the baseline tests: about 400 lines.
2. Everything else, as one feature PR.

Option D keeps the feature reviewable as a whole while getting the dev-reachable bug fix out early.

## Scopes considered

### 1. As implemented

The editor can author boolean and presence gates through a mode selector. Dropping an optional output on a required input previews as accepted and creates the connection and gate as one undoable action. Imported presence-gated and twin-dispatch workflows validate, and an evaluator rejects inverse gates. Leaving boolean mode drops the stale `when` connection.

| Pros | Cons |
| --- | --- |
| Complete authoring and validation story for a runtime contract that already works; docs included. | Leaves orphan paths open. Custom → none/presence and presence(`probe`) → anything strand connections with no terminal, and the presence(`probe`) paths are new in this branch. |
| Already split into four logical commits, with red→green coverage on the fix. | Connections removed by `UpdateStepConnectionsAction` skip `resetMappingIfNeeded`. |
| Heavily reviewed: Codex, thermo-nuclear, test challenges, E2E polish. | Large (about 2,000 lines in one feature commit). |

### 2. Expand: generalize orphaned-connection removal (recommended)

When `when` changes, `UpdateStepConnectionsAction` (or `useStepActions.updateStep`) computes which extra-port connections lose their terminal under the new step. It uses the same rule as `findStepExtraInputs`: a connection whose name isn't a tool input and isn't referenced by the new `when` loses its port. Those connections are removed through the terminal path, so map-over gets reset. `withoutBooleanGateConnection` then becomes unnecessary.

| Pros | Cons |
| --- | --- |
| Closes a bug that is partly pre-existing (unchecking a probe or custom gate on dev/26.2 already strands the link) and partly widened by this branch (probe → boolean, probe → other input). The twin fixture's `when_present` step loads in presence mode on `probe` (`resolveConnectionNameToInputPath("probe")` → `["probe"]`, so `canGateOnInput` offers it). Switching to "Always run", boolean, or `input1` leaves the `probe` link persisted with no port. | Moves logic from the form into the action or store. Needs new red→green tests for the custom and probe transitions. |
| Also fixes custom → none/presence, which Codex flagged as out of scope and which is also reachable on dev or 26.2 via uncheck. | Going through terminals from an action needs terminal construction, or a store-level `resetMappingIfNeeded` equivalent. |
| One predicate shared with port synthesis, so ports and connections can't drift. That's the reuse reviewers ask for. | Slightly larger fix commit, which is the one most likely to go to 26.2. |
| Fixes stale map-over in the same removal path. | |

<details>
<summary>Details</summary>

- **Current coverage.** `withoutBooleanGateConnection()` only fires when `mode.value === "boolean"`, so these transitions keep a connection that no longer has a port:
  - presence(`probe`) → none, boolean, or presence(`input1`) via `onPresenceInput`
  - custom → none or presence
- **Why the connection is stranded.** `findStepExtraInputs` returns `[]` when `when` is undefined, and otherwise only synthesizes ports for names the new `when` references. Once the port is gone, nothing in the UI can disconnect the link.
- **Other callers.** The `UpdateStepAction` calls in `NodeOutput.vue` and in `SetDataAction` don't change `when`. Only the form does, through `useStepActions.updateStep`. So folding the subclass into `UpdateStepAction` isn't required for this expansion: the dispatch can key on `"when" in toPartial || "input_connections" in toPartial`.
- **Map-over.** `RemoveStepAction` on dev uses the same raw `connectionStore.removeConnection` without a map-over reset. That code is pre-existing and outside the touched code, so it isn't part of this scope.
- **Placement.** This belongs in commit 2 (the fix), extended by the feature commit for the presence/custom modes, or as one general fix in commit 2 if the predicate lives in the store.

</details>

### 3. Expand: fold `UpdateStepConnectionsAction` into `UpdateStepAction`

`UpdateStepAction` itself would drop connections that the new partial no longer supports, removing the subclass and the `"input_connections" in toPartial` dispatch.

| Pros | Cons |
| --- | --- |
| One action type, and no dispatch branch in `useStepActions.updateStep`. | Changes the constructor for every caller (`SetDataAction`, `NodeOutput.vue`, `useStepActions`) to thread `connectionStore`. |
| A natural home for scope 2's predicate. | None of those callers change `when` or `input_connections` today, so it fixes no bug. |

Considered and not recommended. The subclass is the narrower change, and scope 2 works without it.

### 4. Expand: remove the `presenceGateAssumed` flag

Thread an "assume gated" argument through `canAccept` → `attachable` (5 overrides) → `_producesAcceptableDatatypeAndOptionalness` and `InputParameterTerminal.attachable`, replacing the try/finally mode flag.

| Pros | Cons |
| --- | --- |
| No mutable mode state on terminals. | Widens dev's terminal API for one caller, and fixes no bug. |
| | The try/finally plus the "leaves the terminal ungated afterwards" test already contain the risk. |

Considered and not recommended. The bias toward expansion applies to related bugs, and this is refactor debt.

### 5. Contract: drop data probes and twin dispatch

Remove `gatePortTerminalSource` and the store refresh logic, `gatedThroughSharedSource`, the twin tests, fixture, Selenium test and docs section. Synthesized ports stay boolean-shaped, as on dev.

| Pros | Cons |
| --- | --- |
| Removes about 450 lines, plus the `gatePortSourceShapeChanged` reference-identity fragility. | Twin-dispatch workflows that run correctly would still show invalid connections in the editor, which is the same class of bug the PR fixes for single gates. |
| The presence(`probe`) orphan path largely disappears. | The docs present twin dispatch as the way to run a tool in two shapes. Without editor support, it's a documented pattern the editor rejects. |

<details>
<summary>Details</summary>

Contracting here goes against the process's preference for general over specific fixes. Twin dispatch is the general form of presence gating once a step's tool state can't vary. It works better as a separate PR (Decomposition B5) than as a drop.

</details>

### 6. Contract: drop the inverse-gate evaluator

Remove `classifyWhenInputIsNull`/`PresenceEvaluator` (about 300 lines) and the `null_behavior`/`guards_presence` spec rows. Validity falls back to "the `when` references the input".

| Pros | Cons |
| --- | --- |
| Removes the largest single new abstraction, a mini JS-expression evaluator in the client. | Accepts `$(inputs.x === null)` on a consumed required input, which is wrong. |
| Runtime is authoritative anyway. | Twin dispatch can't tell `when_present` from `when_absent` on consumed inputs, so twin dispatch would also go. |
| | Loses the spec-driven classification that other tools could reuse. |

Considered and not recommended as a drop. As a split, see Decomposition B4.

### 7. Contract: the dangling-gate lint

It already merged as #24107 (`dangling_when_lint`, on `release_26.2`). Nothing is left to contract. The feature's generated conditions are covered by that lint.

| Pros | Cons |
| --- | --- |
| Already landed separately, and the branch diff no longer carries it. | — |

### 8. Behavior option: the `unknown` classification policy in `expressionGuardsInputPresence` (awaiting John)

Today an expression the evaluator classifies as `unknown`, such as `$(inputs.input1 !== null || inputs.force)`, counts as guarding presence. The alternative is to accept only `false-when-null`.

| Keep permissive (as implemented) | Switch to strict |
| --- | --- |
| Hand-written gates the evaluator can't parse still validate; the runtime decides. | Rejects `unknown` expressions, so `\|\| inputs.force`-style gates that can run with the input absent are flagged. |
| Matches the docstring and the `when_expression_spec.yml` rows. | Rejects valid but unparseable hand-written gates, a regression for imported workflows that hits exactly the users the PR serves. |
| A false accept shows up as a runtime required-input failure, which is the status quo on dev. | Changes about 1 spec row plus a policy line, so the change itself is small. |

No recommendation. This is John's call. Either choice fits any decomposition above. It lands with the evaluator.

### 9. Release target

Everything is currently based on `dev`.

| Keep on `dev` | Move the fix (or C2 validity) to `release_26.2` |
| --- | --- |
| The new authoring UI is a feature. | The orphaned-connection bug is reachable on 26.2. |
| | Imported runtime-valid workflows flagged invalid is a bug. |
| | The parent lint was retargeted to 26.2 at a reviewer's request. |

No recommendation beyond noting that it fits Decompositions A2, B1 and C2.
