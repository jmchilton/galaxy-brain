# custom_build_from_fasta

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:custom_build_from_fasta?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/custom_build_from_fasta)

## Status

Hardening on `release_26.2`; missing-test coverage for the release.

No PR.

CI not yet observed.

## Scope

New E2E test `test_custom_builds.py::TestCustomBuilds::test_build_add_from_fasta`: add a custom build from a history FASTA (GTN FAQ `analysis_add_custom_build`). Adds `custom_builds` components and the `fasta -> len -> linecount` converters/datatypes the framework test datatypes lacked.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). Drop "Test adding a custom build from a history FASTA dataset" from `galaxy_ui_driver` once this merges.

Related queued issues: `gx_issues/to_file/custom_build_fasta_not_listed_until_reload.md` (test waits + reloads because of it) and `custom_build_conversion_error_swallowed.md`. Out of scope here.
