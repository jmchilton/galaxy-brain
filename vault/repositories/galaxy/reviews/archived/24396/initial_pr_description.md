Review suggestions for #24396: tighten ordered data table sources and their tests

These are the fixes from the automated review of #24396 at `770965bef62`, one commit per finding, so you can merge, cherry-pick or drop them individually. Your branch is still at `770965bef62`, so this merges as a fast-forward. Full findings are in the review comment on #24396.

**Library changes** (`lib/galaxy/tool_util/data`, `lib/galaxy/app`, `lib/galaxy/config_watchers`)

- [`8d8935d2e2d`](https://github.com/jmchilton/galaxy/commit/8d8935d2e2d) Rename `ToolDataTableConfig` to `ToolDataTableConfigSource` to match `config_sources` (P3 7).
- [`18869533bc8`](https://github.com/jmchilton/galaxy/commit/18869533bc8) Reject `config_sources` combined with `config_filename`, which made tables silently disappear on full reload (P2 2).
- [`8a81e018c2f`](https://github.com/jmchilton/galaxy/commit/8a81e018c2f) Move source ordering out of the app into `tool_data_table_config_sources()`, with direct tests (P2 3).
- [`8016fa7a5b1`](https://github.com/jmchilton/galaxy/commit/8016fa7a5b1) Report a reload failure after persisting via `error_message` instead of raising mid-install (P3 1).
- [`a774950b479`](https://github.com/jmchilton/galaxy/commit/a774950b479) Share the watcher setup and drop the type asserts that can't fail (P3 3).
- [`15e4d202e7f`](https://github.com/jmchilton/galaxy/commit/15e4d202e7f) Watch location-file directories outside `tool_data_path` / `shed_tool_data_path` non-recursively (P3 2).
- [`f9b0f84cc90`](https://github.com/jmchilton/galaxy/commit/f9b0f84cc90) Send one peer reload control task per registration, with `table_name=[...]` (P3 4).
- [`1a66bf5f2d2`](https://github.com/jmchilton/galaxy/commit/1a66bf5f2d2) Name the in-place `__class__`/`__dict__` swap as `ToolDataTable._replace_with` (P3 5).

**Tests**

- [`68e15f68ec9`](https://github.com/jmchilton/galaxy/commit/68e15f68ec9) Move function-level test imports to module top (P3 6).
- [`9f55343196d`](https://github.com/jmchilton/galaxy/commit/9f55343196d) Integration test: a live registration lands in the configured managed slot. Fails against `release_26.1`'s `lib/galaxy` (P2 4).
- [`62a50f641ae`](https://github.com/jmchilton/galaxy/commit/62a50f641ae) Drop the startup ordering test now covered by the `tool_data_table_config_sources` tests (P2 3).
- [`dac998fd770`](https://github.com/jmchilton/galaxy/commit/dac998fd770) Drive `test_ordered_data_tables.py` through `ToolDataTableManager(config_sources=..., on_registration=recorder)` directly, keeping a small app-wiring section built on the real application classes instead of `Mock(spec=UniverseApplication)` (P2 3).
- [`59ac691f51d`](https://github.com/jmchilton/galaxy/commit/59ac691f51d) Keep the app-level check that a multi-table registration sends one peer reload (P2 3).

**Not included**

- Duplicate dropdown choices when sources overlap (P2 1) — that collapse lives in #24323, so this branch doesn't copy it.
- Unifying the legacy `config_filename` path with `config_sources` — drafted as a follow-up refactor issue for `dev`.

**Testing**

Every behavior change was checked to fail without its fix. Unit modules touched pass: `test_ordered_data_tables.py` (36), `test_tool_data.py`, `test_refgenie_data_table.py`, `test_data_manager_reload.py`, `test_dynamic_options.py`, `managers/test_tool_data.py`, `test_install_manager.py`. The new integration test passes; mypy is clean on the touched library modules.

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at low effort.
- Review profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/learning_galaxy.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>
