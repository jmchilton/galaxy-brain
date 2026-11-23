Profile: gx_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: 5a70538cf56893f10d7e01c0b4a8b9d36a2be742

Small one-way door: string sample-sheet values with any Unicode control character (`Cc`: tab, newline, CR, NUL, ...) are now rejected with a 400 where they were previously accepted and stored unchanged, tightening the API contract for collections, landing requests and URL dereferencing.

<details><summary>Risk Details</summary>

- `validate_column_value` is shared by collection creation, landing request create/claim (`managers/landing.py`) and fetch dereferencing (`model/dereference.py`); all three now reject what they used to accept.
- Clients that paste spreadsheet cells (trailing `\r`, embedded tabs/newlines) into string columns will now get errors instead of silent success; no stripping or normalization fallback is offered.
- Landing requests already saved with such values may now fail when claimed, since rows are re-validated on claim.
- Already-stored sample sheets with control characters are not touched or migrated; only new writes are checked.
- Tests-only changes (API tests) are two-way; the second hunk also changes fixture values in an existing workflow-caching test.

</details>

<details><summary>Risk Review Advice</summary>

Confirm rejecting (rather than stripping) is the desired contract, and that the client sample-sheet editor and landing-request producers (e.g. foundry#191 consumers) never emit `\r`/tabs in string cells. Check the error message names the column, not the value, which it does.

</details>
