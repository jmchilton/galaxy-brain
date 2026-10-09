Acted on the history visibility-listener cleanup finding: remove exact per-case callbacks/options and restore the observation spy. The focused suites pass all 45 cases shuffled after the correction. Final narrow mock/table/spy typing passes full client checking. No actionable issue remains; pre-existing renderer boundary and duplicate empty-input coverage need no scope expansion or advice addition.

## Details

# Iteration 07 independent normal review

Reviewed the ten selected test files against `8cd6910a856b15009722e296b69f21fbfaa42e8b`, after the six earlier iterations were rebased. This review covers the new loop only. Read the client testing guidance, `doc/source/dev/writing_tests.md`, and the vault's shared review focus and test challenge instructions. Compared the original inputs, assertions, intermediate checkpoints, and lifecycle setup with the final working tree and the relevant production contracts.

## Coverage comparison

| File | Independent assessment |
| --- | --- |
| `FormDisplay.test.js` | Retains validation-to-server error replacement, both parameter replacements, conditional off/on/sustain transitions, help text, and both repeated dataset event cases. The dataset double is now scoped to event forwarding rather than replacing FormData throughout the file. Adds the missing final assertion after the third repeat insertion. |
| `TargetObjectStoreSelector.test.ts` | Existing typed object store factory preserves privacy, IDs, labels, permissions, and all relevant defaults. Both warning scenarios remain; the public case now also proves its store label renders. Removing the unused configuration handler does not replace or suppress a required request. |
| `confirmDialog.test.ts` | Still mounts a real caller to trigger the composable's unmount lifecycle. The confirmation mock uses the exposed component method's exact function type, and the dialog double is checked as a `Pick` of that method; the remaining component-instance cast is narrow and explained. Both the signal transition and cancellation result are asserted. |
| `useEntityMentions.test.ts` | Preserves all trigger, parse, context, and resolution cases. Exact parsed arrays strengthen the original length/type/identifier checks with offsets. Hoisted doubles have explicit consumed shapes; resolution fixtures and the history lookup mock reset per case. |
| `workflowEditorCommentStore.test.ts` | All twelve original data/type acceptance combinations remain, now independently reported against fresh stores. Bounding geometry, input immutability, reset metadata, nested frame assignment, step membership, and every selection checkpoint remain intact. The store clones input comments, so the shared descriptive fixtures do not acquire mutations. |
| `historyStore.test.ts` | Retains all 26 original cases, including queue ordering before and after releasing blocked requests, cache/list concurrency, partial pagination, retry counts, and initialization rejection. Real store actions and HTTP interception remain. Sparse API bodies retain their deliberate shapes through `response.untyped`, replacing coercions. The ignored SSE case now registers and asserts an actual current history before delivering another history's event. |
| `redirect.test.ts` | Every original input and expected result remains, including double prefixing, protocols inside query parameters, off-origin URL variants, control characters, whitespace, and repeated-router-parameter arrays. Parameterization exposes failures independently without changing the validation contract. |
| `lastQueue.test.js` | Keeps all original scenarios and checkpoints. Scoped deterministic timers replace wall-clock sleeps. Exact timestamps strengthen the old permissive throttle assertions; exact running results strengthen the old alternative outcomes. The added three-action case actually supersedes a pending action and verifies its `undefined` resolution. Abort forwarding, rejection recovery, burst behavior, key isolation, and original internal cleanup checks remain. |
| `MetadataJsonViewer.test.ts` | The actual MetadataJsonViewer is mounted; only the third-party JSON renderer is doubled. Every original JSON value/array/nesting check remains. Adds direct assertions of child data, virtual mode, length display, default depth, and custom depth. The native Vue render double avoids reliance on template compilation and is unmounted after each case. |
| `Register.test.ts` | Retains all seven original session/configuration prop assertions as one partial prop comparison. The shallow child is the boundary being inspected. Removes unused router/configuration/Pinia arrangement and restores the shared configuration after the case. |

The increase from 105 to 138 executed cases is explained by splitting the original twelve workflow validation combinations into twelve independent cases (+11), splitting the original redirect combinations (+21), and adding one real nonrejecting queue skip case (+1). No original scenario was removed to obtain the result.

## Cleanup finding

The initial revised history watcher teardown stopped the store and disposed its Pinia scope, but `useResourceWatcher.stopWatchingResource()` does not remove its document visibility listener. The separate visibility patch restores only the property descriptor. This leaves the two polling cases able to restart an old watcher if a later case dispatches `visibilitychange`. The coordinator applied the requested focused test-only repair: a scoped typed spy captures registrations and teardown removes the exact visibility listener callback/options before restoring that spy. Independently inspected the repair; the real resource watcher and all original assertions remain intact.

Also inspected the final typing corrections: optional dialog options now match the exposed component method, and the workflow table's accepted types use the production comment-type union. The listener spy uses `MockInstance` from the declared `@vitest/spy` package because the local ambient Vitest module does not expose that type. The dialog mock retains its separate typed function reference for inspecting signal calls while the registered object exposes only the component's method contract. These corrections add no `any` or `unknown` coercion, broaden no assertion, and change no expected result. No blocking concerns remain.

## Reuse and guidance

Reusing `setupTestPinia`, `getFakeHistorySummary`, and `getFakeObjectStoreInstance` is appropriate. Mention parser doubles and dialog/renderer doubles represent different boundaries; combining them would obscure their consumed contracts. There is no concrete duplicated domain setup here that warrants another shared helper or supporting migration. Existing README guidance explains the useful improvements; no new best practice or marginal advice is warranted.

## Validation inspected

Independently inspected the coordinator's machine-readable final results: `/private/tmp/jest_readability_batch07_final_client.json` reports all 126 cases passing in nine physical files; `/private/tmp/jest_readability_batch07_final_toolshed.json` reports all 12 cases passing in one physical file. Vitest's suite totals include nested describe blocks; the affected physical suite count is ten. After the final cleanup and typing corrections, `/private/tmp/jest_readability_batch07_review_fix.json` reports all 45 cases passing across the three changed files; the coordinator ran these with shuffled order, seed 70123. Typecheck, lint, and formatting are coordinator checks, not checks independently rerun by this reviewer.
