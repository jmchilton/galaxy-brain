# Review branch: `pr_24719_review_0`

Based on `e2c3677d3ae`. It replaces the fake-config serializer test with an integration test against real server configuration, adds a browser test connecting the API key to the dialog, makes the lifetime label round up rather than to nearest, stops the dialog reusing a link past half a short server lifetime, and pins the helper's explicit `duration` argument.

- `6f4fd89b6c0` Pin explicit duration handling in effective_storage_duration. Adds rows through the helper and `new_target` (verified P3 4).
- `d761a276130` Round link lifetime labels up so they do not understate exposure. Changes `formatDurationSeconds` to round up with unit carry and adds non-multiple rows (verified P3 2).
- `a4197825bfd` Stop reusing an export link past half its lifetime. Caps the dialog's one hour reuse window from the reported lifetime, with a Vitest case (verified P3 1).
- `016df53042d` Test the effective duration against a real server configuration. Deletes `test_ConfigSerializer.py` and adds `test/integration/test_short_term_storage_configuration.py` (verified P2 1).
- `faa72e0e6ea` Add a browser test connecting the link lifetime API key to the dialog. Adds the Selenium integration test, navigation entries and a `data-description` on the warning text (verified P3 3).
