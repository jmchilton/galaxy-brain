# Batch 59: Tool Shed ManagePushAccess

Originator: `lib/tool_shed/webapp/frontend/src/components/ManagePushAccess.test.ts`.

Preserved the original non-owner-manager scenario and all five assertions unchanged: repository owner text, no owner removal control, collaborator text, collaborator removal control, and viewer username absent. The original permission flags, usernames, repository id, SelectUser stub, and real component mounting remain.

The single scenario now visibly owns its real Pinia and resolves both typed store references against that instance. Native global plugins supply the same instance to the component. Automatic unmount owns the mounted tree, and on-test-finished disposal owns store effects. This removes the separate beforeEach global activation without introducing a fixture helper or casts; the existing typed repository-store `$patch` still checks the focused partial fixture.

Own Tool Shed frontend Vitest 3.2.7, Node 22.20.0, shuffled seed 590101: pristine and final runs pass one case. V8 provider reports across `src/**`: 89 files, 151 covered statement/function/branch-arm locations both before and after, zero lost or added. Coverage directories are `/private/tmp/readability59-pushaccess-before` and `/private/tmp/readability59-pushaccess-after`.

No production, supporting-test, dependency, or README changes. Existing native mount/store teardown guidance fits this case; no evidence-backed guidance gap or shared helper consumer was found.

Full Tool Shed frontend vue-tsc, own ESLint/Prettier, and explicit pre-commit gates all passed.

Supplemental shared-UI coverage: the actual installed raw-source GButton resolves inside Tool Shed's canonical `node_modules/.pnpm` tree, which Vitest 3's V8 collector unconditionally filters out before include/exclude processing. A temporary config aliased an identical byte copy of the installed UI source outside node_modules, using the installed package's same dependency links. Pristine/final runs both pass; the actual GButton source contributes exactly 74 covered locations (64 statement, 3 function, 7 branch-arm counters), with zero lost or added. This is separate supplemental evidence; the normal frontend runs retain the 89-file/151-location source comparison above. Supplemental reports: `/private/tmp/readability59-pushaccess-before-ui-actual` and `/private/tmp/readability59-pushaccess-after-ui-actual`. Worker test restoration and temporary-config removal ran in finally; tracked worker status is clean. Empty direct-node_modules attempts are not counted as coverage evidence.
