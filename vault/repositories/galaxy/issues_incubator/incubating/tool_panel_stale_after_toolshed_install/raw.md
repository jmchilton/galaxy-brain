# Tool panel doesn't show tools installed from the Tool Shed until a page reload

Found in the 26.2 GTN FAQ loop (`topics/admin/faqs/install_tool.md`, snippeted by the admin cvmfs, pulsar and
reference-genomes tutorials), on `release_26.2` + `galaxy_ui_driver`. Fix + tests on `jmchilton/galaxy_ui_driver`:
commit "Refresh the tool panel after Tool Shed installs".

## Repro
1. As an admin, search the tool panel for `bwa` (no results).
2. Admin > Install and Uninstall > search `bwa` > devteam `bwa` > Install (newest) > Target Section "Mapping" > Ok;
   wait for Installed.
3. Open Tools and search `bwa` again, or a never-searched query like `BWA-MEM`: no results. The Mapping section
   doesn't show either. `/api/tools?q=bwa` returns both tools. A page reload shows them.

The GTN FAQ does steps 1 and 2 in that order, then the tutorials go on to use the tool.

## Cause
`client/src/stores/toolStore.ts` caches `toolsById` (all tools, fetched once), `toolResults` (per query) and
`toolSections` (per panel view) for the page session, and nothing invalidates them. A fresh query fetches new ids from
the server, but `getToolsById` filters them through the stale `toolsById`, so new tools never show. Install/uninstall in
`client/src/components/Toolshed/RepositoryDetails/Index.vue` never touches the store. Same in release_25.0 (not a
regression).

## Fix (on the branch)
- `toolStore.invalidate()` clears tools, searches, panel sections and the tags flag; the panel refetches on next mount.
- `RepositoryDetails/Index.vue` calls it when a watched revision reaches Installed or Uninstalled, then refetches the
  default sections for the install modal's section list.
- vitest `toolStore.test.ts` "refetches tools and searches after invalidate" (red without `invalidate`).
- `test_admin_toolshed` (selenium) rewritten on new `admin_toolshed_install`/`admin_toolshed_uninstall` helpers and
  navigation.yml `admin.toolshed.*` components; after installing it opens the tool from the panel with no reload. Red
  without the component change (times out on the tool link), green on Selenium and Playwright.

Target: dev.
