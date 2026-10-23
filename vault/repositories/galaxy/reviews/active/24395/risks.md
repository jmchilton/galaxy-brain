Profile gx_risk_assessment, Opus 5.5, low effort, reviewed commit `b95cd79f9bb`.

The one-way-ish risk is behavioral: every tool test (Galaxy, planemo, IUC via `galaxy-tool-util`) that leaves a conditional's select test param unset now resolves to the `selected` option instead of the first, so tests silently passing against the wrong branch for up to ~13 years may start failing after a minor release; the code itself is trivially revertible.

<details><summary>Risk Details</summary>

- Before this PR the `for/else` never broke, so the `else` always ran and `default_option` was always the first option's value; the `selected` branch was dead code since 48b7a50eb20 (2013), carried into 90c6dcc590d (2024).
- Tool tests that relied on the first-option behavior (unset conditional selector, non-first `selected` option, nested params belonging to the first `when`) change meaning; they may fail or exercise a different case. This lands in a patch release of `galaxy-tool-util`, which tool repos pick up via planemo without opting in.
- The newly live branch assigns `name` (tuple[0], the option label/text) while the fallback uses tuple[1] (the value). `parse_static_options()` returns `(text, value, selected)`, and `case_when` values are option values, so for any option whose label differs from its value (the common case, e.g. `<option value="yes" selected="true">Yes</option>`) nothing matches, `_matching_case_for_value` logs at info and returns `None`, and the conditional's nested test params are not resolved under it. The fix only works when label == value or the option has no text.
- Server-side, Galaxy's own select default already honors `selected`, so the test client and server previously disagreed; the fix aligns them, which is the intended behavior change.

</details>

<details><summary>Risk Review Advice</summary>

Confirm the selected branch should use the option value (`_, value, selected` / tuple[1]) rather than the label before merging; as written the fix silently no-ops for most real tools. A regression test with a label differing from its value would catch this.

Decide whether a release-branch patch is the right vehicle given tool-test behavior changes downstream; if so, call it out in release notes so IUC/planemo users understand newly failing tests reflect the tool's declared default.

</details>
