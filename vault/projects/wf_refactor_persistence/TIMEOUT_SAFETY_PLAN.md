# Fix: Async serialization timeout safety

## Problem

`saveViaRefactor` (Index.vue:1177-1192) waits up to 5s for async serializations to complete via `Promise.race`. If the timeout fires while `asyncSerializationsInFlight > 0`, the code proceeds to `flushPendingActions()` — but the timed-out action was never serialized, so it's not in `pendingActions`. Meanwhile `allActionsSerialized` may still be `true` (only set `false` on rejection, not on "still pending").

**Consequence**: partial refactor-save that silently drops the timed-out action's changes. If other serialized actions exist, they'd be sent without the layout — user thinks save succeeded but layout is lost.

Secondary issues found in the same review:
- Orphaned `watch` callback when timeout wins the race (watcher never cleaned up until counter eventually hits 0).
- Store `redo()` calls `action.redo()` then immediately `trySerialize()` — no async detection. Safe today (AutoLayout overrides redo synchronously) but latent bug for future async actions.

---

## Fix A: Timeout forces fallback (Index.vue)

Restructure the wait block to hoist `unwatch` and detect timeout.

**File: `client/src/components/Workflow/Editor/Index.vue` (~line 1175-1192)**

```javascript
async saveViaRefactor() {
    // Wait for async serializations (e.g. AutoLayout ELK computation)
    if (this.undoRedoStore.asyncSerializationsInFlight > 0) {
        let unwatch;
        await Promise.race([
            new Promise((resolve) => {
                unwatch = watch(
                    () => this.undoRedoStore.asyncSerializationsInFlight,
                    (val) => {
                        if (val === 0) {
                            resolve(undefined);
                        }
                    },
                );
            }),
            new Promise((resolve) => setTimeout(resolve, 5000)),
        ]);
        unwatch?.();

        // Timeout fired but async still in-flight — force raw-save fallback
        if (this.undoRedoStore.asyncSerializationsInFlight > 0) {
            this.undoRedoStore.allActionsSerialized = false;
        }
    }

    const { pending, allSerialized } = this.undoRedoStore.flushPendingActions();
    // ... rest unchanged
```

**What changed:**
1. Hoist `unwatch` — always call it after the race, preventing orphaned watcher.
2. After race, check `asyncSerializationsInFlight > 0` — if true, set `allActionsSerialized = false` so the existing fallback branch triggers raw PUT save.
3. Removed `unwatch()` from inside the watch callback (outer cleanup handles it).

### Why safe

- `allActionsSerialized` is a plain `ref<boolean>` on the store — already publicly settable. Writing to it from Index.vue is consistent with how it's used elsewhere.
- The existing fallback logic at line 1196 already handles `!allSerialized` correctly: it does a full raw save. No new code paths needed.
- If the async action resolves *after* the timeout but *before* `flushPendingActions()` executes (unlikely but possible microtask ordering), `asyncSerializationsInFlight` would be 0 by the time we check — so the flag isn't forced and the action's serialization lands in `pendingActions`. Correct behavior.

---

## Fix B: Async-aware `redo()` (undoRedoStore/index.ts)

**File: `client/src/stores/undoRedoStore/index.ts` (~line 82-89)**

```typescript
function redo() {
    const action = redoActionStack.value.pop();

    if (action !== undefined) {
        const result = action.redo();
        undoActionStack.value.push(action);

        if (result instanceof Promise) {
            asyncSerializationsInFlight.value++;
            result
                .then(() => {
                    if (undoActionStack.value.includes(action)) {
                        trySerialize(action);
                    }
                })
                .catch(() => {
                    allActionsSerialized.value = false;
                })
                .finally(() => {
                    asyncSerializationsInFlight.value--;
                });
        } else {
            trySerialize(action);
        }
    }
}
```

Also update `UndoRedoAction.redo()` return type:

**File: `client/src/stores/undoRedoStore/undoRedoAction.ts`**
```typescript
redo(): void | Promise<void> {
    return this.run();
}
```

**Why**: Base `redo()` calls `this.run()`, which returns `void | Promise<void>`. Without the return type + async detection, any future action with async `run()` that doesn't override `redo()` would serialize before the async work completes — same bug we just fixed in `applyAction`.

---

## Tests

**File: `client/src/stores/undoRedoStore/undoRedoStore.test.ts`**

1. `test_redo_defers_serialization_for_async_action`: apply async action, undo, redo — verify serialization deferred until resolve, counter tracks correctly.

No new Index.vue tests — the timeout safety is a one-line guard that feeds into already-tested fallback logic.

---

## Files Modified

| File | Change |
|------|--------|
| `client/src/components/Workflow/Editor/Index.vue` | Restructure wait block, add timeout fallback |
| `client/src/stores/undoRedoStore/index.ts` | Async-aware `redo()` |
| `client/src/stores/undoRedoStore/undoRedoAction.ts` | `redo()` return type |
| `client/src/stores/undoRedoStore/undoRedoStore.test.ts` | 1 new test |

## Commits

1. Single commit: timeout safety + async-aware redo + test
