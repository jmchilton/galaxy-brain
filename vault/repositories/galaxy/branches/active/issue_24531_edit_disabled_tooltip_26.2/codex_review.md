# Codex review (re-harden)

Codex found one issue. I confirmed it and fixed it in a separate commit, with a vitest that fails before the fix and passes after.

- **P2 (CONFIRMED):** the switch button in `HistoryNavigation.vue` is also disabled while `changingCurrentHistory` is true. With the `tooltip` prop and no `disabled-title`, it showed "Switch to history" in that state. **Fix:** `disabled-title` now reads "Switching history..." for logged-in users and keeps the "Log in to" title for anonymous users. The new `HistoryNavigation.test.ts` case fails without the change and passes with it.

Codex coverage: it reviewed the full diff and the GButton/GTooltip/vGTooltip internals. It ran no browser tests.
