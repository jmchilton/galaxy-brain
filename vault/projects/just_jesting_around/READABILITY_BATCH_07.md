# Readability batch 07

Ten existing uniterated originators selected with seed `848213636`. [Manifest](readability_batch_07.yml). This is iteration seven on the existing `jest_readability_batch_01` branch/worktree, following the requested rebase onto latest `origin/dev`.

## Rebase

Fresh upstream base: `cd6a53537e0bb28be183c4a6c134c1c0f5a4d6d1`; rebased six-iteration head: `8cd6910a856b15009722e296b69f21fbfaa42e8b`. All six previous iterations remain separate commits. Five replay identically; the only conflict keeps upstream direct numeric query parsing while preserving exact offset/limit observations in `collectionElementsStore.test.ts`. [Independent rebase review](reviews/batch07/rebase_review.md) found no concern; that suite passes its three cases and current lint. [Old/new commit mapping](../../repositories/galaxy/branches/active/jest_readability_batch_01/rebase_07.md).

The rebased head was published with an exact force-with-lease on its previous remote head. Ignored API-package artifacts were rebuilt for upstream's new xrootd schema. Only the small upstream lint toolchain was installed into ignored client dependencies; existing runtime dependencies and shared Tool Shed dependencies are retained. No new worktree or production/configuration edit was introduced.

## Originators

| Selected test | Result | Cases |
| --- | --- | ---: |
| Form/FormDisplay | Scoped FormData double and mount cleanup; retains parent/child editing and all repeat payload/order checks, adds the final third block. [Review](reviews/batch07/FormDisplay.md). | 7 → 7 |
| History/TargetObjectStoreSelector | Existing typed object-store factory, fresh mounts and visible permissions; exact fixture equivalence and sharable-store rendering. [Review](reviews/batch07/TargetObjectStoreSelector.md). | 2 → 2 |
| composables/confirmDialog | Real caller lifecycle, typed exposed-method double, explicit live→aborted signal and cancellation result. [Review](reviews/batch07/confirmDialog.md). | 1 → 1 |
| composables/useEntityMentions | Typed hoisted store doubles and exact ordered parse results; all mention/context cases retained. [Review](reviews/batch07/useEntityMentions.md). | 27 → 27 |
| stores/workflowEditorCommentStore | Existing Pinia setup and named data/type matrix; all twelve original validation combinations fail independently. [Review](reviews/batch07/workflowEditorCommentStore.md). | 7 → 18 |
| stores/historyStore | Existing history/Pinia/SSE helpers, inferred handlers with sparse untyped response bodies; effective unrelated-event setup and scoped watcher/listener cleanup. [Review](reviews/batch07/historyStore.md). | 26 → 26 |
| utils/redirect | All original security and path inputs preserved in descriptive independent rows. [Review](reviews/batch07/redirect.md). | 5 → 26 |
| utils/lastQueue | Scoped deterministic timers, precise execution timestamps and completion evidence; adds the actual nonrejecting skipped-promise contract. [Review](reviews/batch07/lastQueue.md). | 17 → 18 |
| Tool Shed MetadataInspector/MetadataJsonViewer | Typed third-party renderer double with real subject and automatic unmount; JSON inputs retained and forwarded options/depth strengthened. [Review](reviews/batch07/MetadataJsonViewer.md). | 12 → 12 |
| entry/analysis/modules/Register | Seven forwarded configuration/session values visible together; removes unused router arrangement and restores configuration. [Review](reviews/batch07/Register.md). | 1 → 1 |

## Reuse and follow-through

The earlier object-store factory now serves target-store selection as well as its existing consumers. A payload audit confirms exact original keys and values for both selected store fixtures. Existing history factories, Pinia setup, SSE event/visibility helpers, configuration mocks, `nth` and assertion helpers are reused. The form, confirmation and JSON renderer doubles consume different boundaries; combining them would obscure the scenario inputs or the subject being tested. No new abstraction or supporting-suite edit is needed in this iteration.

Only the ten selected originators gain iteration counters: 60 of 396 inventory paths are reviewed. The inventory's path list is unchanged; this random draw was restricted to paths still present on the rebased upstream. No worthwhile unresolved reuse item or missing guidance emerged; README and marginal advice remain unchanged.

## Validation and review

All 138 cases across ten physical suites pass: 126 client cases across nine files and twelve native Tool Shed cases. Baseline was 105 cases. Twelve existing comment-validation combinations become independent cases (+11), existing redirect combinations become independent cases (+21), and one real nonrejecting queue case is added (+1). All original scenarios and assertion checkpoints remain.

Full client and Tool Shed `vue-tsc --noEmit`, scoped ESLint with current upstream configurations and zero warnings/errors, Prettier and whitespace checks pass. Tests use `NODE_OPTIONS=--no-webstorage`. After review corrections, the three affected client suites pass all 45 cases in shuffled order with seed `70123`; the mention/queue/redirect group also passes shuffled order with seed `70117`.

[Independent normal review](reviews/batch07/normal_review.md) found a history listener cleanup gap: stopping polling and disposing Pinia did not remove document visibility callbacks. Tests now remove their exact callback/options registrations and restore the observation spy; real watcher behavior remains under test. The ignored-history SSE case now registers and checks the current history before sending an unrelated event. Typed dialog options and comment validation metadata follow their production contracts. [Fresh test challenge](reviews/batch07/test_challenges_debrief.md) found no remaining blocker or reason to change layers. [Scope evaluation](reviews/batch07/scope_evaluation.md) retains ten test files; [screenshot evaluation](reviews/batch07/screenshot_debrief.md) finds screenshots irrelevant to unchanged production UI.

Galaxy iteration07 commit: `7c2738f4644b7b0f6923d9a2e6654349210e81b8`. [Review only this iteration](https://github.com/jmchilton/galaxy/compare/8cd6910a856b15009722e296b69f21fbfaa42e8b...7c2738f4644b7b0f6923d9a2e6654349210e81b8). Source commit hooks passed.
