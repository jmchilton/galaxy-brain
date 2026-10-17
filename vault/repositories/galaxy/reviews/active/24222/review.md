# Technical review: Galaxy PR #24222

Reviewed commit: `afd897e4d4a93e2a0f1eefcf9a8dcf009d8adb1c` on 2026-10-17. Delivery: **unposted**. Technical/correctness review only; scope and target branch accepted as requested.

## Finding

### [P2] Preserve plain search text before enabling the new tag picker

Location: `client/src/components/ToolsList/ToolsList.vue:295-297` (new `canUseFilterPickers` guard); tag selection at lines 494-502 calls `applyFilter`.

Start with the ordinary search `fastqc`, open **Search tags/categories**, and select **Quality Control**. The new picker is enabled, but selecting the tag replaces the search with `tag:"Quality Control"`. Its backend query becomes only `(tool_tags:("quality control"))`, so unrelated tools with that tag are eligible instead of narrowing the keyword results. Starting with `#favorites` also loses the favorites restriction and turns the Favorites button off.

The guard only rejects explicit Boolean expressions and *already mixed* structured/free-text searches. For a plain raw search, both tests are false. `applyFilter` then calls `Filtering.setFilterValue`, which reconstructs the text from recognized filter keys and drops bare words because this `Filtering` instance has no `autoFilterKey`. Recognized filters such as `owner:devteam` survive the same tag action (covered by the existing passing suite), which makes loss of an ordinary keyword particularly surprising.

Either preserve and combine the raw condition when applying a tag, or disable the new picker for every nonempty search that cannot round-trip through the structured editor. Add coverage starting with plain keyword text and the favorites query. The older ontology selector already has analogous behavior; this finding concerns the newly introduced tag-selection interaction and its new preservation guard.

## Validation

- Locked offline pnpm installation completed in the PR worktree; tests use this checkout's workspace UI package.
- Focused suites: **81 passed** across `ToolsList`, `ToolsListTagFilter`, `ToolFilterChip`, `GDropdown`, and `toolStore`.
- Existing affected-consumer suites: **66 passed** across `ToolsListCard`, `MyToolsLanding`, `ToolBoxSearch`, and panel utilities.
- Supplemental mounted-component probe: **2 failed as expected**, one each for `fastqc` and `#favorites`. Both expected the original condition to remain; both received only `tag:"Quality Control"`. Probe patch: [regression-test.patch](regression-test.patch). Apply to a clean reviewed checkout and run the `ToolsList` test file with `-t 'review repro'`.
- All Vitest runs use `NODE_OPTIONS=--no-experimental-webstorage` to let happy-dom supply browser storage. An initial run without it failed in setup with `window.localStorage.getItem is not a function`; this was a local Node environment issue.
- `git diff --check origin/dev...HEAD` passed. Temporary probe source removed after validation; no product changes made.
- Coordinator inspected the Tool Shed CI artifact: 78 passed, 478 errors, 1 failed. Inspected setup errors and the sole failed test both report `FileExistsError` for `database/model_cache`, consistent with a setup race unrelated to this frontend change.

Commands, from `client/`:

```sh
NODE_OPTIONS=--no-experimental-webstorage pnpm exec vitest run src/components/ToolsList/ToolsList.test.ts src/components/ToolsList/ToolsListTagFilter.test.ts src/components/ToolsList/ToolFilterChip.test.ts src/components/BaseComponents/GDropdown.test.ts src/stores/toolStore.test.ts --maxWorkers=2
NODE_OPTIONS=--no-experimental-webstorage pnpm exec vitest run src/components/ToolsList/ToolsListCard.test.ts src/components/Panels/MyToolsLanding.test.ts src/components/Panels/ToolBoxSearch.test.ts src/components/Panels/utilities.test.ts --maxWorkers=2
```

No additional new correctness findings substantiated in tag-mapping caching/decoration, favorite actions, ontology chips, or dropdown focus handling. Full browser interaction and a full application build were not run.

## Risks

Risks are minimal in terms of irreversible choices: this is a two-way UI/store change without schema migrations or API contract changes. The principal functional risks are silently changing search conditions and regressions in the shared dropdown or tag-store consumers; the first is demonstrated above and the latter have focused regression coverage.
