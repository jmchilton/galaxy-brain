# ToolHelpRst — independent review, batch 60

Reviewed the worker diff against `bc3b5f773a059d2a19aa2be333d06ba53eaf246e`, ToolHelpRst, its real formatted-help composable, the sanitize directive boundary, and README lifecycle guidance. Approve; no blocking findings.

Both original cases and both assertions remain. The HTML assertion retains every demoted heading, nested markup/attributes, plain text, and target=_blank link in the expected fragment. The sanitizer call still checks the exact formatted external-link markup and links profile. The test exercises actual help transformation and directive integration; it does not claim to verify the mocked sanitizer implementation itself.

Native props/global mounting makes the second scenario use the same supported setup as the first. Required help lookup uses get. Mock call history is cleared per case while retaining the established sanitizer implementation. Stacked teardown auto-unmounts before clearing history, so component cleanup still observes its dependency. No shared harness or production edits are needed for these two short scenarios.

Independent shuffled seed 600201 passes both cases (`/private/tmp/readability60-help-independent.log`). Existing guidance covers the ownership and mocking changes; no additional general advice requested.
