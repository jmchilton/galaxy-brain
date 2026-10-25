# custom_build_from_fasta

- [#24312](https://github.com/galaxyproject/galaxy/pull/24312)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/custom_build_from_fasta)
- [PR description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [polish debrief](polish_debrief.md)

## Status

Merged: [#24312](https://github.com/galaxyproject/galaxy/pull/24312) merged 2026-10-23.

Polished on `release_26.2`, head `873b4d93ae8`.

Draft [#24312](https://github.com/galaxyproject/galaxy/pull/24312) opened 2026-10-21 on John's request, titled "[26.2] Test adding a custom build from a history FASTA dataset"; screenshot hosted on the fork's `pr-assets-custom_build_from_fasta` branch.

Fork CI on `873b4d93ae8` pending.

## Scope

New E2E test `test_custom_builds.py::TestCustomBuilds::test_build_add_from_fasta`: add a custom build from a history FASTA (GTN FAQ `analysis_add_custom_build`). The framework test datatypes gain `fasta -> len -> linecount`. A refactor commit first moves the existing custom-build test helpers onto `custom_builds` navigation.yml components.

Pulled out of [`galaxy_ui_driver`](../../active/galaxy_ui_driver/index.md) per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). Once this merges, drop "Test adding a custom build from a history FASTA dataset" from `galaxy_ui_driver`. Its copy lacks the success-alert wait and the helper refactor, so a restack should take this branch's version.

## Decisions

- Kept the original scope. The scope eval's API happy-path test can't pass without a product fix: API-key FASTA builds 500 because there's no current history. Queued as `gx_issues/to_file/custom_build_fasta_api_no_current_history.md`. The eval suggests the fix plus that API test belong next to `custom_build_no_converter_400_26.0` / #24310 (John's call).

## Related

- #24309: FASTA build not listed until reload. The E2E re-navigates because of it; once fixed, switch to waiting for the row.
- [`custom_build_no_converter_400_26.0`](../../active/custom_build_no_converter_400_26.0/index.md) and [`better_custom_build_error_handling_25.1`](../../merged/better_custom_build_error_handling_25.1/index.md) (#24310): API error handling on the same path.
