# shared_activity_availability — polish debrief

Polished at `ca0ac853585` on `jmchilton/shared_activity_availability`, base `dev`.

## CI
- Fork CI on `8c55ba248af` was all queued when polishing started, with no reds. History was rewritten (squash) and a test commit added, so CI needs checking on `ca0ac853585`.

## Checklist (GENERAL)
- Everything passed. The human-read item is left for John.
- Verified no behaviour change: `Boolean(config?.x)` matches the old `!config?.x` / `!ctx.config.x`; getter and setter now mirror each other by construction; `PaletteContext` fits `ActivityAvailability` structurally.
- Cleanups applied: dropped the palette comment that repeated the helper's docstring, renamed the palette wrapper `activityAvailable` → `isActivityOffered` (too close to `isActivityAvailable`), trimmed a filler phrase, and squashed the docstring-only commit into the main one.

## Strengthening round (applied)
- Added an `ActivityBar.test.js` case: reorder the visible activities while `interactivetools` is hidden and check the store still holds it. The hand-negated setter was the fragile copy and had no test. Confirmed red by making the setter drop hidden activities.
- Description: fixed the diff visual's "already import it" note (the bar imports `convertDropData` from the module, not `defaultActivities`), bold-italicised why the duplication matters, and added a highlighted line on why `ActivitySettings.vue` isn't touched.
- The 3 changed test files pass locally under node 22.20.0 (24 tests); eslint and prettier clean.

## Left over / for John
- **`ActivitySettings.vue:30-33` bug (pre-existing, since `82e700dab1a`).** `(a.optional && a.id !== "user-defined-tools") || canUseUnprivilegedTools.value` is grouped wrongly: with the permission on, it lists the non-optional `upload`/`tools` in settings, and it never hides `interactivetools`/`galaxyai` when disabled. `a.optional && isActivityAvailable(a.id, …)` fixes both. It changes behaviour, so it isn't on this branch. John chose a separate branch: fixed in `activity_settings_availability` (`6c0307b4b35`), stacked on this one.
- Palette scopes/actions gate on the same config flags (`scopes.ts:49`, `actions.ts:216`). Those aren't activities, so they stay separate.
