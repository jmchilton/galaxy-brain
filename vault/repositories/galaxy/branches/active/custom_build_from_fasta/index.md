# custom_build_from_fasta

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:custom_build_from_fasta?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/custom_build_from_fasta)

## Status

Implemented and hardened on `release_26.2`, head `364768249c4`; READY, missing-test coverage for the release.

No PR.

CI not yet observed.

## Scope

New E2E test `test_custom_builds.py::TestCustomBuilds::test_build_add_from_fasta`: add a custom build from a history FASTA (GTN FAQ `analysis_add_custom_build`). The framework test datatypes gain `fasta -> len -> linecount`. A refactor commit first moves the existing custom-build test helpers onto `custom_builds` navigation.yml components.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). Once this merges, drop "Test adding a custom build from a history FASTA dataset" from `galaxy_ui_driver`. Its copy lacks the success-alert wait and the helper refactor, so a restack should take this branch's version.

## Decisions

- Kept the original scope. The scope eval's API happy-path test can't pass without a product fix: API-key FASTA builds 500 because there's no current history. Queued as `gx_issues/to_file/custom_build_fasta_api_no_current_history.md`. The eval suggests the fix plus that API test belong next to `custom_build_no_converter_400_26.0` / #24310 (John's call).

## Related

- #24309: FASTA build not listed until reload. The E2E re-navigates because of it; once fixed, switch to waiting for the row.
- [`custom_build_no_converter_400_26.0`](../custom_build_no_converter_400_26.0/index.md) and [`better_custom_build_error_handling_25.1`](../better_custom_build_error_handling_25.1/index.md) (#24310): API error handling on the same path.
