# ToolEntryPoints

Reviewed `client/src/components/ToolEntryPoints/ToolEntryPoints.test.js`: 3 cases before and after, all passing with shuffle seed 120043; scoped ESLint and Prettier pass.

A local mount helper replaces three copies of testing Pinia/router setup, explicitly installs both through `withPlugins`, and auto-unmounts each wrapper. Fresh entry-point objects reuse the existing InteractiveTools JSON response already used by the selected store test. Only the active flag and job grouping differ between scenarios; the two-session job and unrelated single-session job stay explicit. Repeated URL/timestamp/name literals disappear from the test.

Preserved two disabled real BUTTON elements and their aria-disabled values, two active links with exact corresponding target URLs, and the single matching link opening in a new tab. Full mounting remains necessary for the original GButton/GCard link output. No production UI or navigation changes were made.

Reusing the existing JSON fixture across this test and `entryPointStore.test.js` solves the concrete duplication without a new factory or supporting-suite migration. No README or marginal advice is needed.
