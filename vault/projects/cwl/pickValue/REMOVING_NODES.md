# Pick Value Module: Compact-on-Disconnect

## Context

The pick_value module has N input terminals that grow when you connect to the last empty one. But disconnecting does nothing — terminals stay, leaving gaps (e.g., `input_0` connected, `input_1` empty, `input_2` connected). We need: on disconnect, compact remaining connections (renumber sequentially) and always leave one extra empty terminal at the end.

## Approach

Two coordinated changes:

1. **Terminal.disconnect()** — detect pick_value steps, compute+apply compaction as part of the undo/redo action
2. **FormPickValue watcher** — detect when connected count changed, emit `onChange` to trigger `build_module` and re-render terminals

Compaction is a **pure rename** of connections in the stores. The watcher handles the `num_inputs` state change and `build_module` trigger. This separation keeps compaction logic testable and the watcher simple.

## Prerequisite: Fix `stepStore.removeConnection` empty array residue

`stepStore.removeConnection` (line 370-377 of `workflowStepStore.ts`) filters an array connection
but leaves an empty `[]` at the key instead of deleting it. After compaction, this causes stale
empty-array keys like `input_2: []` to remain in `input_connections`, which breaks the watcher's
connected count logic (`[] != null` is true).

**Fix:** After filtering, if the result is empty, delete the key:

```typescript
if (Array.isArray(inputConnections)) {
    const filtered = inputConnections.filter(
        (outputLink) =>
            !(outputLink.id === connection.output.stepId &&
              outputLink.output_name === connection.output.name),
    );
    if (filtered.length === 0) {
        del(inputStep.input_connections, connection.input.name);
    } else {
        inputStep.input_connections[connection.input.name] = filtered;
    }
}
```

## Files to Modify

| File | Change |
|------|--------|
| `client/src/stores/workflowStepStore.ts` | Fix empty array residue in `removeConnection` |
| `client/src/components/Workflow/Editor/modules/pickValueCompact.ts` | **NEW** — pure compaction functions |
| `client/src/components/Workflow/Editor/modules/terminals.ts` | Modify `disconnect()` for pick_value compaction |
| `client/src/components/Workflow/Editor/Forms/FormPickValue.vue` | Add shrink detection to watcher |
| `client/src/components/Workflow/Editor/Forms/FormPickValue.test.ts` | Add shrink test cases |
| `client/src/components/Workflow/Editor/modules/pickValueCompact.test.ts` | **NEW** — unit tests for compaction logic |

## Step 1: Create `pickValueCompact.ts`

Three exports:

### `computePickValueCompaction(inputConnections, disconnectedName) → { renames }`
Pure function. Collects connected `input_N` keys (excluding `disconnectedName`), sorts by N, computes renames where sequential index differs from current N.

Example: disconnect `input_1` from `{input_0, input_1, input_2}` → `renames: [{ from: "input_2", to: "input_1" }]`

### `applyCompaction(stepId, renames, connectionStore)`
For each rename (low to high order):
- Remove all connections for the old input by passing `InputTerminal { stepId, name: from, connectorType: "input" }` to `connectionStore.removeConnection` (removes all at once)
- Re-add each connection with new input name `to` via `connectionStore.addConnection`

### `reverseCompaction(stepId, renames, connectionStore)`
Same but reversed order, swapping `from`/`to`.

**Note:** `getConnectionsForTerminal` returns a potentially stale reference after mutations rebuild
the lookup maps. Snapshot the connections array (`[...conns]`) before starting removes.

## Step 2: Modify `Terminal.disconnect()` in `terminals.ts`

```typescript
disconnect(other: Terminal | Connection) {
    const connection = this.buildConnection(other);
    const step = this.stores.stepStore.getStep(connection.input.stepId);

    if (step?.type === "pick_value") {
        const compaction = computePickValueCompaction(
            step.input_connections,
            connection.input.name,
        );
        this.stores.undoRedoStore
            .action()
            .onRun(() => {
                this.dropConnection(other);
                if (compaction.renames.length > 0) {
                    applyCompaction(step.id, compaction.renames, this.stores.connectionStore);
                }
            })
            .onUndo(() => {
                if (compaction.renames.length > 0) {
                    reverseCompaction(step.id, compaction.renames, this.stores.connectionStore);
                }
                this.makeConnection(other);
            })
            .setName("disconnect steps")
            .apply();
    } else {
        // existing behavior
        this.stores.undoRedoStore
            .action()
            .onRun(() => this.dropConnection(other))
            .onUndo(() => this.makeConnection(other))
            .setName("disconnect steps")
            .apply();
    }
}
```

Key: compaction snapshot is computed **before** the action runs, captured in closure.

## Step 3: Update FormPickValue watcher

Replace grow-only logic with bidirectional:

```typescript
watch(
    () => props.step.input_connections,
    (connections) => {
        const state = cleanToolState();

        // Grow: last terminal got connected
        const lastTerminalName = `input_${state.num_inputs}`;
        if (connections && connections[lastTerminalName]) {
            state.num_inputs = state.num_inputs + 1;
            emit("onChange", state);
            return;
        }

        // Shrink or undo-of-shrink: sync num_inputs with actual connections
        if (connections) {
            const connectedCount = Object.keys(connections)
                .filter((k) => k.startsWith("input_") && connections[k] != null
                    && (!Array.isArray(connections[k]) || (connections[k] as unknown[]).length > 0))
                .length;
            const desired = Math.max(2, connectedCount);
            if (desired !== state.num_inputs) {
                state.num_inputs = desired;
                emit("onChange", state);
            }
        }
    },
    { deep: true },
);
```

The `desired !== state.num_inputs` handles both shrink (`desired < current`) and undo-of-shrink (`desired > current`).

The empty-array guard (`length > 0`) is a defense-in-depth check — the prerequisite fix to
`stepStore.removeConnection` should prevent empty arrays from appearing, but the watcher
shouldn't count them regardless.

## Step 4: Tests (red-to-green)

### `pickValueCompact.test.ts`
1. Disconnect last of 3 → no renames needed
2. Disconnect middle of 3 → one rename (`input_2` → `input_1`)
3. Disconnect first of 4 → three renames
4. Disconnect only connection → no renames, result is empty
5. No connections → no renames

### `FormPickValue.test.ts` additions
1. Shrink: start with `num_inputs: 3`, remove `input_1` from connections → emits `num_inputs: 2`
2. Shrink floor: disconnect all → emits `num_inputs: 2` (minimum)
3. Undo-of-shrink: start with `num_inputs: 2`, add `input_0` and `input_1` connections → emits `num_inputs: 3` (via `desired > current` path)

### E2E test (manual or Playwright)
1. Create pick_value with 3 connected inputs
2. Disconnect middle input
3. Verify remaining connections renumbered, one empty terminal at end
4. Undo → verify original 3 connections restored

## Edge Cases

| Scenario | Expected |
|----------|----------|
| Disconnect only connection (`input_0`) | No renames; `num_inputs` stays 2 (minimum) |
| Disconnect last of many (`input_2` from 3) | No renames; `num_inputs` drops |
| Disconnect middle (`input_1` from 3) | `input_2` → `input_1`; `num_inputs` drops |
| Disconnect first (`input_0` from 3) | `input_1` → `input_0`, `input_2` → `input_1` |
| Rapid disconnects | Each is a separate undo action with its own compaction snapshot |
| Undo after compact | `reverseCompaction` restores sparse names, `makeConnection` re-adds original |

## Undo Behavior

Disconnect creates 1 undo action (drop + compact). The subsequent `build_module` response creates a 2nd `UpdateStepAction` on the undo stack. So Ctrl+Z requires 2 presses — same as grow-on-connect. This is existing behavior, not a regression.

## Review Notes

Reviewed for correctness. Key findings:
- **Vue batches watchers** — all synchronous mutations in `onRun` (drop + compaction renames) complete before the watcher fires. No intermediate state problems.
- **Undo ordering verified** — `reverseCompaction` restores sparse names, then `makeConnection` re-adds original. Final state matches pre-disconnect.
- **No infinite loops** — `build_module` response updates `inputs`/`outputs`/`tool_state` but not `input_connections`, so the watcher doesn't re-fire.
- **Terminal ID format confirmed** — `node-${stepId}-input-${name}` matches `getTerminalId()` in connectionStore.

## Unresolved Questions

1. Should we add an E2E Playwright test for disconnect compaction, or is manual verification + unit tests enough for now?
