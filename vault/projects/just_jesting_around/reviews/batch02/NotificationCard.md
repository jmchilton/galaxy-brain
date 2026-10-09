# NotificationCard — iteration 2

Improved `client/src/components/Notifications/NotificationCard.test.ts` in the existing `jest_readability_batch_01` worktree. No production, shared factory, or README changes.

## Changes

- Replaced random category selection with named `describe.each` cases for message and shared-item notifications. Both mark-read and delete behaviors run for both categories; 9 original cases become 11 deterministic scenarios.
- The mark-read scenario explicitly starts unread, installs one store-action mock, awaits the prop update, and checks the exact `{ seen: true }` request plus the expiration action. Removed an immediately overwritten mock and unused delete handling from that scenario.
- The delete scenario explicitly starts read, preserves the existing deletion mock, and checks the exact `{ deleted: true }` request and resulting card removal.
- Added `enableAutoUnmount(afterEach)` so real components and watchers are cleaned up between scenarios.
- Scoped and typed the mount helper to NotificationCard and its `UserNotification` input. Retained full mounting because these assertions inspect GCard slots and trigger real action buttons; shallow mounting would remove the tested UI.
- Replaced repeated per-tool indexing and text extraction with named detail strings. Preserved all markdown, sanitation, shared-item, tool-name/detail/shed-ID, per-tool separation, and workflow-link assertions.

## Reuse investigated

Read the full client unit-testing section, NotificationCard/GCard implementations, NotificationsList tests, Notifications/test-utils factories, notifications API types/store, Vitest setup/adapter, and shared test helpers.

Reused `enableAutoUnmount` from Vue Test Utils and `getLocalVue`, `withPlugins`, and `nth` from `@tests/vitest/helpers`, alongside all three existing notification factories. `withPlugins` replaces the helper's default Pinia with the testing Pinia using native global mount options. `nth` retains the suite's existing required-item behavior with a clearer missing-item failure. RouterLinkStub still exposes the workflow destination.

No new shared abstraction warranted: NotificationsList mounts seed store notifications, whereas NotificationCard mounts receive one notification prop and keep its real action UI. Their distinct setup is clearer in separate local helpers.

## Guidance

No new README guidance proposed. Existing factory, parameterized-case, and mount guidance covers the changes; routine principles would add no useful repository-specific information.

## Worthwhile deferred work

`Notifications/test-utils.ts` generates a seen timestamp with `new Date().toISOString() + 3`, producing a malformed timestamp when its random read-state branch is selected. Its random read-state/variant/ID/content defaults are consumed by NotificationCard and by NotificationsList through `generateNotificationsList(10)`. This iteration explicitly fixes action-relevant state locally and avoids altering shared factory semantics. A follow-up can make these factories deterministic and accept overrides, updating the concrete Card/List consumers together. This is a fixture cleanup opportunity, not evidence of a production timestamp bug or a reason to add general README advice.

## Checks

- Baseline recorded by the driver: all selected suites passed before edits.
- `NODE_OPTIONS=--no-webstorage pnpm exec vitest run src/components/Notifications/NotificationCard.test.ts`: 11/11 passed. Existing Vue compat compiler deprecation notices remain.
- `pnpm exec prettier --check src/components/Notifications/NotificationCard.test.ts`: passed.
- `pnpm exec eslint src/components/Notifications/NotificationCard.test.ts`: passed (existing Browserslist data notice only).
- Full client type-check and combined-suite checks are coordinated by the driver.
