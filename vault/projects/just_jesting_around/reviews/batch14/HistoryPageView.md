# HistoryPageView review — iteration 14

The mounting helper installs the suite's fresh testing Pinia through `withPlugins`, creates LocalVue per mount, awaits lifecycle promises, and registers automatic unmounting. Individual scenarios no longer repeat the same lifecycle flush. The router mock's original module is inferred through an explicit module type rather than cast.

The list and current-page fixtures use existing `getFakePageSummary` and `getFakePageDetails` factories. Typed list setup and complete page details remove all `any` casts. Original scenario-specific IDs, titles, content, blank timestamps in the list-prop case, and the display-page update timestamp remain explicit. Empty usernames preserve the original fixtures' absent-owner behavior: edit navigation bypasses the owner-copy branch rather than acquiring the factory's default owner. The redundant `hasCurrentPage` getter spy is removed; the real computed value follows the loaded page. The display-child test is named after PageDisplayOnly rather than implying real Markdown rendering.

All 23 cases and assertions remain: loading; list and display errors; editor-owned errors without unmounting the editor; list presence and pages; editor delegation and both ID props; both display-only child checks; markdown configuration; edit navigation; list with displayOnly; no editor reset or clear on display unmount; list edit, create, and view events; the active Window Manager flag and navigation title; loadPages, loadPageById delegation for all original modes; and reset on editable unmount. Child emissions are still used for the deliberately shallow component boundary. The create event retains its own `flushPromises()` after emission.

Validation: 23 passing cases, 0 skips, shuffled seed 140047. Scoped ESLint with zero warnings, Prettier, and diff whitespace checks pass.

Guidance: existing documentation addresses typed fixtures, shallow delegation, setup helpers, async lifecycle work, and cleanup. Reuse is already available in the page factories; no new best practice or abstraction is needed.
