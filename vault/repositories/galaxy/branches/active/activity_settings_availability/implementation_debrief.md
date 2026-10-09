# activity_settings_availability — implementation debrief

Branch `activity_settings_availability` at `6c0307b4b35`, stacked on `shared_activity_availability` (`ca0ac853585`). Pushed to `jmchilton/galaxy`. Worktree: `~/projects/worktrees/galaxy/branch/activity_settings_availability`.

## Bug
`ActivitySettings.vue` filtered with `(a.optional && a.id !== "user-defined-tools") || canUseUnprivilegedTools.value` (since `82e700dab1a`):
- with the custom-tools permission it listed all 16 built-in activities, including the non-optional Upload and Tools
- it never hid Interactive Tools or GalaxyAI on an instance without them, while the bar and palette do

## Fix
Settings lists `a.optional && isActivityAvailable(a.id, { canUseUnprivilegedTools, config })`, reusing the parent branch's helper and `useConfig()`.

## Tests (red → green)
- `ActivitySettings.test.js` now mocks `@/composables/config` like `ActivityBar.test.js`; existing tests run with both config flags on, so the built-in count assertion is unchanged.
- New: permitted user sees Custom Tools but not Upload/Tools; instance without interactive tools or an LLM hides both. Both failed before the fix on the bug's own assertions (`to not include 'Upload'`, `'Interactive Tools'`).
- `src/components/ActivityBar` + `activitySetup.test.ts`: 20/20; `vue-tsc`, eslint, prettier clean.

## Open
- Not polished; needs fork CI, then polish after its parent.
- PR should go after `shared_activity_availability` merges (or be stacked on it).
