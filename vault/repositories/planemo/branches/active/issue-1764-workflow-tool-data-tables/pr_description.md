Implement 🎯 #1764 - document `tool_data_table_conf.xml.test` discovery for workflow tests and print which data table config Planemo loaded.

Workflow tests whose steps select from data tables (AMRFinderPlus, MMseqs2 databases, reference genomes) need test `.loc` data. Planemo already finds a `tool_data_table_conf.xml.test` next to a workflow or in its `test-data/`, but the docs only describe it for tools and the discovery is silent, so users hand-write configs with absolute paths and pass `--tool_data_table`. Planemo already loads this layout, and Galaxy expands `${__HERE__}` in both files:

```
wf.gxwf.yml
wf-tests.yml
test-data/
  tool_data_table_conf.xml.test   # <file path="${__HERE__}/amrfinderplus_versioned.loc" />
  amrfinderplus_versioned.loc     # ...	${__HERE__}/test-db
  test-db/
```

With this branch Planemo says it picked the file up:

```
Using tool data table config /path/to/test-data/tool_data_table_conf.xml.test
```

**No discovery behavior changes** - only docs, one printed line, and a test pinning the existing search. **Only the local `galaxy` engine loads these files; `docker_galaxy` and `external_galaxy` don't.** **Covers #1764's docs and the which-conf-loaded line; the not-found and misnamed-file diagnostics are left out (below).**

<details><summary>Changes</summary>

- `docs/writing_how_do_i.rst`: the "test index (.loc) data?" recipe now covers workflow tests: search order (first runnable's dir, cwd, test data dir), `.sample` fallback (first two only), `galaxy` engine only, `--tool_data_table` replaces the search.
- `docs/best_practices_workflows.rst`: one-line link from Tests.
- `planemo/galaxy/config.py`: `info()` line when a conf is auto-discovered; nothing printed for `--tool_data_table`.
- `tests/test_galaxy_config.py`: workflow runnable with `test-data/tool_data_table_conf.xml.test` and a `.sample` beside it → the `.test` wins and is printed. Fails on `master` at the print assertion.

</details>

<details><summary>Left out of #1764</summary>

- Printing searched paths when nothing is found: would print on every test run without data tables.
- Warning about a misnamed `tool_data_table_conf.xml`: the docs give the exact name, and a missing `Using tool data table config` line shows nothing was loaded.
- Missing-entry hint: that error comes from Galaxy's parameter validation.
- Container mounts for `${__HERE__}` paths: not verified; left as a follow-up.

</details>

## Risks

Risks are minimal - this change doesn't lock the project into particular difficult to change choices (a two-way door). **The line prints on every local-engine run that auto-discovers a conf, including tool tests that pick up a `.sample` beside the tool.**

## Agentic Checks

### ✅ Second Frontier Model Review

<details><summary>Codex found no defects.</summary>

Fresh read-only Codex session checked the docs claims against discovery and engine code paths; no findings.

</details>
