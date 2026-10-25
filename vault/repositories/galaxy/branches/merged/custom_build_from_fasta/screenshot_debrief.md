# Screenshot debrief — custom_build_from_fasta

Screenshots successfully obtained.

Branch has no Vue/UI source changes (`navigation.yml` selectors, tests, test datatypes only), so no existing test needed a new capture. The one relevant screenshot is the new test's own `self.screenshot("custom_builds_from_fasta")`.

## Screenshots

| File | Test | Shows |
|---|---|---|
| `screenshots/custom_builds_from_fasta.png` | `test_custom_builds.py::TestCustomBuilds::test_build_add_from_fasta` | User Preferences / Current Custom Builds; the FASTA-derived build (random name/key) listed with "Number of chroms/contigs" = 2. Add form below still has "FASTA-file from history" selected on `1: Test_Dataset`. |

## Run

- HEAD `364768249c4`, Playwright backend, headless, driver-launched Galaxy, `GALAXY_TEST_TIMEOUT_MULTIPLIER=2`: 1 passed (~33s).
- No test or code changes; Selenium rerun not needed.
- No problems recording.
