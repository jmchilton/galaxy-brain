# Polish debrief

I wrote [pr_description.md](pr_description.md) and ran one strengthening round with a fresh subagent. Branch head is `e30e16b0`.

## Applied

- **New fixtures, commit `e30e16b0`.** Added `expect_failure` fixtures, one clean and one leaky. The worry was that a fetch error on an errored output would turn every clean expect-failure test into `error`. It doesn't: the clean test stays green and the leaky one fails. Also added a `discover_datasets` fixture, which is reported as `__new_primary_file_parts|a__`.
- **"All seven pass on master" checked.** I ran master's planemo against all 7 fixtures, and all 7 passed. The `Failed to delete test credentials` warnings in that run come from Galaxy's interactor and appear on base as well.
- **Description: bold answers to likely misreadings:**
  - always on
  - doesn't mask anything
  - tool tests only, not workflow/CWL
- **Description: Risks reworded.** It now says every output is downloaded in full into memory and that there's no opt-out.

## Left over: questions for John (would widen scope)

- Add an opt-out (per-test or CLI flag) for tools that write the API key on purpose?
- Redact secret values from the stdout/stderr that `tool_test_output.json` and the HTML report already hold? This matters for the external engine, where the user's key is real.
- Run the same check on workflow tests?
- Cap the size of scanned outputs instead of always downloading them in full?
