Moved both regression scenarios from manager-level unit tests into the existing Tool Shed repository API suite, reused its upload/reset/metadata helpers, and removed all branch-only unit application configuration and unused helpers. No production changes were needed.

- Kept the sample-only-tool and per-revision-sample scenarios: both check repository behavior, rather than copying implementation logic.
- Kept the existing numbered reset-all-metadata browser test unchanged: its reset assertion is already marked `xfail`; the focused API regressions cover these bugs without browser setup or UI coupling.
- Added no UI/E2E coverage: this change concerns metadata generation and revision selection, and the public API exercises that entire path.

<details>
<summary>Review and validation</summary>

Read `doc/source/dev/writing_tests.md` and reviewed every added test, fixture, and helper. The original unit tests used real SQLite/Mercurial/upload/reset paths and no new mocks, but the same scenarios were readily expressible through `ToolShedPopulator`. They now live in `lib/tool_shed/test/functional/test_shed_repositories.py`, using existing `new_category`, `new_repository`, `upload_revision`, `reset_metadata`, and `get_metadata` helpers. Two small local helpers create temporary upload archives and collect tool IDs/versions by changeset; no new endpoint-specific request code was introduced.

The sample-only scenario checks that a `filter_tool.xml.sample` uploaded in an earlier revision never becomes an executable tool when metadata is reset. The revision scenario uploads different tool versions, data-table configurations, and `.loc.sample` names, then verifies both revision metadata rows survive reset unchanged. Both also assert a successful reset status after checking the metadata output.

All now-unused changes to `test/unit/tool_shed/_util.py` and `test_repository_metadata_manager.py` were removed; these files match the release baseline. This migration preserves the original regression scenarios and introduces no separate baseline behavior tests.

The Tool Shed frontend was initially absent; installed locked dependencies and built it successfully. The shared virtualenv also lacked `pytest-xdist`; installed repository-pinned `pytest-xdist==3.8.0` (and its `execnet` dependency). Neither setup action changed tracked application files. Functional runs use `TOOL_SHED_TEST_OMIT_GALAXY=1` because these scenarios need the Tool Shed server only, and `GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false`.

Validation:

- Original manager suite before migration: 11 passed.
- Migrated focused API regressions on the fixed branch: 2 passed.
- Full final repository API suite: **40 passed**, 11 dependency deprecation warnings, 204.23 seconds.
- Complete Tool Shed unit suite after migration: **99 passed, 12 skipped**, 236.49 seconds. The pass count is two lower than the initial record because those tests moved to API coverage.
- Red check: temporarily used `d9647406cf6`'s generator with the final API tests. **Both failed at their own metadata assertions**: the sample-only repository gained `Filter1`, and the two-version repository lost its historical 1.0 tool metadata. The reset result/status assertions remain after those comparisons. No collection, missing-helper, or transport failure caused either failure. A `finally` block restored the exact fixed generator; verified byte-for-byte against HEAD afterward.
- Black and isort checks passed for the modified API test file.

The full green HTML report is preserved at `/tmp/reset_metadata_api_green.html`; baseline-failure evidence is in `/tmp/reset_metadata_api_red.log` and `/tmp/reset_metadata_api_red.html`. The worktree's `run_toolshed_tests.html` has been restored to the full green report.

Status: READY for subsequent hardening steps. No unresolved test challenge blocker.

</details>
