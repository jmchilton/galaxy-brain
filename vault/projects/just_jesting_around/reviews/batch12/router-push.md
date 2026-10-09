# router-push: accepted

Originator: `client/src/entry/analysis/router-push.test.js`. Cases: **7 → 9**, all passing, no skips.

Named table rows separate titled/untitled navigation with an inactive window manager and no-title/explicit-opt-out navigation with an active manager. Each retains its exact path and options and verifies that no manager window opens. The event-bus listener now unregisters in a `finally` block, including assertion or navigation failures. The forced object-route case additionally asserts the positive normalized destination path.

All original behavior remains: inactive manager navigates to `/test/other` and `/test/something`; active manager opens the titled `/test/tryagain` route, returns undefined, and leaves `/test/start` current; active manager navigates normally to untitled and opted-out routes without adding a frame; both initial and duplicate navigation emit `router-push`; forced string navigation preserves its path and creates `__vkey__`; forced object navigation avoids `/galaxy` in the full path, includes the generated key, and retains `advanced=false`; a query embedded in an object path preserves the collection path, `advanced=true`, and the key. Duplicate navigation remains a dependent two-action sequence. The extra cases only separate original option variations.

Reuse: the existing local router constructor describes this patch's three concrete routes. Login-route tests need the production route graph, so sharing these constructors would couple distinct scenarios. The local Galaxy mock describes only the window-manager boundary. No supporting edits or new advice proposed; existing descriptive table and cleanup guidance applies.

Validation: baseline 7 passing in `/private/tmp/jest_readability_batch12_baseline.json`; final 9 passing in `/private/tmp/jest_readability_batch12_composables_final.json` (all five assigned suites 74 passing, shuffled seed `120059`, no skips). Scoped current ESLint and Prettier pass. No production changes.
