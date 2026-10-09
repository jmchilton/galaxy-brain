# ToolPanel review

Selected originator: `client/src/components/Panels/ToolPanel.test.ts`.

Replaced six positional mount arguments with named scenario options. Failed view IDs now define the response errors directly, and request capture callbacks appear next to the scenario that needs them. Error cases register only the failed views and default fallback; successful navigation registers known view IDs rather than a catch-all successful response. Removed imported JSON mutation, the redundant local view interface, and the double cast of panel JSON; the backend fixture keeps its original name while the rendered default heading is asserted as `Tools`.

The original navigation loop becomes a menu-opening case and ten named, independently mounted view cases. All fixture view IDs remain covered, including nine non-default descriptions, selected-item icons, ordinary header icons, the absent My Tools header icon, and the default header. Saved non-default initialization, fallback, double failure, default/My Tools counts, backend-default My Tools with zero/one favorite, loading both panels, and avoiding tag loading retain their original inputs and contracts.

The workflow transition previously checked an unrelated selector after changing the prop. Both assertions now target the rendered discover-tools button, making disappearance meaningful. Count expectations are the independently audited fixture value `Discover 5 Tools`, instead of invoking the production counting helper to calculate the expected result. The fixture has five unique panel IDs/five tool-list entries; the extra version makes six list entries. Both original wrong-count exclusions remain. Audit: `/private/tmp/batch08_toolpanel_fixture_audit.json`.

Reuse: existing API fixtures, `getFakeRegisteredUser`, local Vue configuration, and server mocking. Full mounting remains necessary for the real menu/header/toolbox interaction contracts. Automatic unmount is added. No new shared helper or supporting consumer change is warranted.

Cases: 11 baseline → 21 after splitting navigation. Shuffled final client run passes all 25 cases across this file, ToRemoteFile, and accessibleHover (seed 80143). Current scoped ESLint and Prettier pass. Root performs the full client typecheck and independent review.

Guidance: the existing scenario, cleanup, reuse, and selective mounting rules cover these changes. No new README or unresolved marginal advice proposed.
