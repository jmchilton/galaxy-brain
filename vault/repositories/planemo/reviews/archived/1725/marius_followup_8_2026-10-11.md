# Review: jmchilton/planemo #8 → galaxyproject/planemo #1725

- Fix PR: https://github.com/jmchilton/planemo/pull/8
- Upstream PR: https://github.com/galaxyproject/planemo/pull/1725
- Upstream review target: `active/1725`.
- Reviewed head: `71ab982844552f67d9284a2ad184917329a7f10c`.
- Reviewed base: `72eb17b232c961aa31574a56118f6b3575199154`.
- Recommendation: **APPROVE / merge into `test-data-option-fix`**. No blocking issue found in Marius's one-line fix.

The upstream server override is a regression: `_find_test_data` auto-discovers a runnable's `test-data` directory even without an explicit `--test_data`. Passing that directory as `tool_test_data_directories` replaces Galaxy's default `<galaxy_root>/test-data`, including stock fixtures a tool may rely on. Galaxy config in both the local development source and cached `v25.1.2` reads this option with the stock-root default only when the key is absent. Marius correctly restores the prior `test_data_dir` property, which Galaxy does not use as this resolver setting; the recognized server key is absent again.

The useful upstream change remains in `planemo/engine/galaxy.py`: an explicit `--test_data` becomes the real `GalaxyInteractorApi.test_data_directories` list. Tool XML test cases take this `ExternalGalaxyToolTestCase` path. The actual installed galaxy-tool-util 26.0.1 interactor first requests server data and then searches the supplied local directories after a server miss. The cached Galaxy `v25.1.2` source has the same constructor and download fallback logic. This preserves stock-server resolution and makes the external directory additive.

## Validation

- Existing suite: `PYTHONPATH=$PWD PLANEMO_SKIP_GALAXY_TESTS=1 /Users/jxc755/projects/repositories/planemo/.venv/bin/python -m pytest -q tests/test_galaxy_config.py`: **48 passed, 3 skipped**. The first sandboxed run passed 44 and failed four interactive-tool configuration checks solely because ephemeral localhost binds were denied; approved retry allowing those binds passed all 48. No test changes or weakened assertions.
- Temporary behavioral checks in `/tmp/planemo-marius-oct11/test_pr8_probe.py`: **6 passed**. Three generate actual `local_galaxy_config` files against a temporary minimal Galaxy root for explicit, automatically discovered, and absent test-data directories; each confirms `tool_test_data_directories` remains absent. Three execute the real engine test-case path and real 26.0.1 `GalaxyInteractorApi.test_data_download` with only server HTTP responses and tool execution stubbed: server 404 falls back to the explicit local file; server 200 wins over the explicit local file; absent option retains server behavior with an empty client fallback list.
- `git diff --check` passes; review checkout remains clean.
- Full managed-Galaxy tool execution, including `tests/test_cmd_test.py::CmdTestTestCase::test_test_data_option`, **was not run**. The passing upstream checks in the supplied snapshot predate this fix and do not validate its new head. Use CI to confirm full upload/execution on the merged branch; local evidence here covers generated configuration and actual client resolution, not live server execution.

## Follow-ups for John

1. **Update #1725's description after merging.** It currently presents the unrecognized config key as a problem being fixed, says both server/client fixes ship, and claims no-option cases leave the key unset. The final implementation deliberately retains Galaxy defaults and ships only the additive client fallback. The original red-to-green evidence should be labeled as historical if retained; the final branch's CI should establish current full integration behavior.
2. **CI confirmation / useful regression coverage.** Confirm the existing `test_test_data_option` succeeds on the merged head. An integration case with an automatically discovered tool `test-data/` directory but a test input present only in Galaxy's stock test-data would directly protect the regression Marius identified. This is sensible follow-up coverage rather than a blocker for restoring the previous default.
3. **Minor optional cleanup.** The restored `test_data_dir=... # TODO: make gx respect this` retains a known unused server property and stale TODO. Removing it deliberately later would make the client-only design clearer; no need to widen this narrow fix to do that now.

No original worktree edits, merges, or pushes performed.

## Coordinator outcome

Companion #8 merged into test-data-option-fix as c95fd681c979b127e7667f30585a7bdd7e6bce0f. Configuration suite: 48 passed/3 skipped; six client/configuration probes passed. Full managed-Galaxy test remains for CI.
