# PR #23898 release dependency update — 2026-10-11

John requested replacing the temporary Pulsar source dependency after publishing 0.16.0.

- Original PR head: `c6f8234b5e459285e9637c1fa2ed6b985ee41402`.
- Dependency update: `66ae70628eb9586bc4ae1a7d5d50d1be78de9693`.
- Final head: `d2a95eff002f6ca9cb4c7040303dceea64029438`, merging current dev `7f3badc01ee` without rewriting the author’s commits.
- Pushed both to `mvdbeek/galaxy:pulsar-explicit-imports` (updates the existing PR) and `jmchilton/galaxy:pulsar-explicit-imports` (handoff copy).

Root and galaxy-app declarations now require `pulsar-galaxy-lib>=0.16.0`; pinned runtime requirements require exactly `0.16.0`. Removed the temporary Git URL, related comments, both uv build-variable tables at both workspace roots, the startup/package-test exports, and the tox environment setting. Startup, type-checking and package installation therefore use the release without a source-build environment variable.

GitHub initially reported conflicts against current dev and started no Actions checks. Merged dev, resolving the runner-test import block by retaining both sets of imports. All dev version-metrics tests and the PR’s client-construction regressions survive unchanged. The final PR delta against dev is five files: three dependency declarations, runner imports, and runner regression tests. The previous standalone temporary-setting files match dev exactly.

Validation used the PyPI-installed 0.16.0 wheel in a private target directory, ahead of Galaxy’s source on PYTHONPATH, with PULSAR_GALAXY_LIB unset. Borrowed the existing Galaxy environment read-only for dependencies; its installed Pulsar 0.15.15 was not changed. The runner imports the released coexecution factory, 33 focused runner tests pass, and the current-dev galaxy-app wheel builds with `Requires-Dist: pulsar-galaxy-lib>=0.16.0` and no Git dependencies. TOML parsing, shell syntax, Ruff/isort on the runner and tests, and the PR whitespace check pass.

[Independent incremental review](../../../reviews/archived/23898/release-pin-review-2026-10-11.md) found no issues in either the dependency update or merge resolution. GitHub confirms the final head is mergeable and fresh CI is queued. No full Galaxy integration suite or completed new-head remote CI result is claimed. The existing draft state, PR description, and original test assertions were preserved.
