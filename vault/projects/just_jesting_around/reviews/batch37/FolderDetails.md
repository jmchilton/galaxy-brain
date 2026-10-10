# FolderDetails

Selected originator: `client/src/components/Libraries/LibraryFolder/FolderDetails/FolderDetails.test.ts`. Baseline and final: **3 tests**.

The shared `let wrapper` mounted in `beforeEach` and the manual `afterEach` unmount are gone. Each test now registers its library handler, mounts, then acts, and `enableAutoUnmount(afterEach)` does the cleanup. Selectors are grouped in `SELECTORS`, and the modal helper takes the wrapper. The folder metadata is a typed `LibraryFolderMetadata`, which let the `FolderDetails as object` cast go. That meant adding the schema's required `full_path`, `can_add_library_item`, `can_modify_folder` and `total_rows`, none of which the component renders. The undeclared `isStatic: true` prop, which only fell through as an attribute, is dropped.

The handler moved from `http.untyped.get` on the exact URL `/api/libraries/lib_test_id` to the typed `/api/libraries/{id}` path. The typed path matches any id, which would silently lose the old exact-URL check that the component requests `metadata.parent_library_id`. So `serveLibrary` records the requested ids, and the success case asserts `[LIBRARY_ID]`. Both responses go through `response.untyped`: the fixture JSON's widened types don't satisfy `LibrarySummary` without a cast, and `HttpResponse.error()` is a network error.

Preserved: the button exists. Modal hidden before the click and shown after: `GModal.props("show")` became the native `<dialog>`'s `open`, which is what the user sees. Both tables contain their IDs. In the error case, the library table is absent, the folder table is present, and the alert text matches. Added: the library and folder names appear in their tables. `mount` stays, because the fetch only fires from the real GModal's `open` event, which a shallow stub never emits.

Reuse: `useServerMock`, `getLocalVue`, `enableAutoUnmount`. `response.test.json` is kept as is. No shared helper.

Validation: 3 tests pass, shuffled (seed `370101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and full client `vue-tsc --noEmit` pass.

Guidance: none.
