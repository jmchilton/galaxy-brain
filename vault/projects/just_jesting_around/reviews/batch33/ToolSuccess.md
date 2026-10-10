# ToolSuccess (supporting)

Supporting test: `client/src/components/Tool/ToolSuccess.test.ts`. Baseline and final: **4 tests**. Adopts the shared user factories, which closes batch 32's follow-up. It is not a readability pass.

What changed:
- The anonymous row's `{ isAnonymous: true }` is now `getFakeAnonymousUser()`.
- Both registered rows are now `getFakeRegisteredUser({ id: "user-id", email: "user@example.org" })`, which keeps their original id and email.
- The `null` "unloaded" row stays.

Every row, flag and assertion is unchanged. The factories add filler fields (disk usage, username, quota, ...).

Validation: 4 tests pass shuffled (seed `330101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and `vue-tsc --noEmit` pass.

Follow-up: `ToolSuccess.vue` never reads the user. Its children are shallow-stubbed, and recommendations depend only on `enable_tool_recommendations` and `jobDef.tool_id`. So the anonymous, unloaded and registered rows exercise the same path, and only the config flag matters. The rows could collapse to the enabled/disabled config cases. That is a scenario change, so it is left for the driver.
