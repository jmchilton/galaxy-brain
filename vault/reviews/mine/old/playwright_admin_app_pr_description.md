Drops all 6 `@selenium_only("Not yet migrated to support Playwright backend")` decorators from `lib/galaxy_test/selenium/test_admin_app.py`, so the whole file runs under the Playwright backend.

Five of the six needed nothing — they already worked once pointed at a Playwright driver. The sixth, `test_admin_toolshed`, was genuinely broken, and not because of the backend.

### The toolshed test was broken on both backends

`test_admin_toolshed` waits on `admin.toolshed.search_results`, defined in `client/src/utils/navigation/navigation.yml` as `#shed-search-results`. That id is written in `Toolshed/SearchList/Repositories.vue`:

```vue
<GTable v-else id="shed-search-results" :items="repositories" :fields="fields">
```

But `GTable` declares `id` as a **prop** (`GTable.vue:29`), not an inherited attribute, and derives its own ids from it:

```vue
<div :id="`g-table-container-${props.id}`" ...>
    <div :id="`g-table-wrapper-${props.id}`" ...>
        <table :id="`g-table-${props.id}`" ...>
```

So after the BTable → GTable conversion there is no `#shed-search-results` element in the DOM at all — the results table renders as `#g-table-shed-search-results`. The same applies to `upgrade_notification: '#repository-table .badge'`, whose `#repository-table` is the `id` prop on the `GTable` in `Toolshed/InstalledList/Index.vue`.

The search itself always worked. A screenshot taken at the point of failure shows the repository row rendered and the toolshed reporting `10643 repositories available`; only the selector was stale.

This went unnoticed because `test_admin_toolshed` carries `@flakey`, and CI sets `GALAXY_TEST_SKIP_FLAKEY_TESTS_ON_ERROR` on the Selenium job — so the test has been silently error-skipped rather than passing. Most of the other `navigation.yml` entries were already migrated to the `g-table-` prefix during the GTable conversion (`unused_paths`, `dm_jobs_table`, `libraries_list`, the user object-store and file-source indexes); these two were missed.

The fix is two selector updates, following the convention the migrated entries already use:

```yaml
  toolshed:
    selectors:
      repo_search: '#toolshed-repo-search'
      search_results: '#g-table-shed-search-results'
      upgrade_notification: '#g-table-repository-table .badge'
```

### Verification

- `test_admin_app.py` under Playwright: **7 passed**, no failures, no skips.
- `test_admin_toolshed` under Selenium: **passed** — the selector change is shared code, so it was re-verified on the backend it also affects. It now exercises the full install → upgrade-notification → uninstall cycle against the live tool shed instead of being error-skipped.

Running the file locally against an externally launched Galaxy also needs the config the test driver builds for itself in CI (`framework_tool_and_types = True` in `lib/galaxy_test/selenium/framework.py`): the framework datatypes conf, which registers no display applications, plus the sample data manager conf and the test tool data tables that define `testbeta`. Without those, `test_admin_server_display` and `test_admin_data_manager` fail on a local `run.sh` instance on either backend. No repo change is needed for that — it is purely a local-invocation detail.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
