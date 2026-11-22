Run via gpt-6.2-sol; Codex reported reasoning effort "none".

# Codex review debrief

Codex reviewed the branch at `44d5df632ff` against `origin/dev` and returned six findings. Two were fixed, three declined, and one was handled outside this record under the private-report policy. Each was checked against the code first.

Acted on:

- **The API key test passed if Show revealed a blank field.** After clicking show/hide, `test_api_key` only checked the input became `type="text"`. It now asserts the revealed value equals the key (`a7d1a8cba3c`).
- **Duplicated dataset setup in the history panel tests.** The new range filter test copied the "create N one-line datasets, go home, wait for the last hid" block from `test_delete_undelete_and_purge_items`; `test_hide_and_unhide_items` had the same block for three. All three use a new `_show_history_of_datasets(count)` helper (`f4b60719013`).

Not acted on:

- **`FilterMenuInput.test.ts` lost its datalist and disabled-state test.** True, but that test asserted the `list` and `disabled` attributes pass through to the input, which is what the branch removes on purpose.
- **`VaultSecret.test.ts` no longer checks the stored-secret mask and disabled state.** Same reason.
- **`CredentialsGroupForm.test.ts` no longer asserts the secret input is `type="password"`.** Same reason. This is the closest call of the three, since it guards secret masking; left for John.

## Verification

After the two fixes, each of these passed once under the Playwright backend and once under the Selenium backend: `test_api_key`, `test_advanced_filter_index_range`, `test_delete_undelete_and_purge_items`, `test_hide_and_unhide_items`. `ruff` and `black --check` are clean on both files.

## Details

- Codex's local shell failed to start on both attempts. On the first it reviewed nothing. On the second it read the branch from the fork through GitHub, where the tip matched the local head, and ran no tests.
- Coverage, per Codex: all 18 changed files plus surrounding code in `GFormInput`, `GCollapse`, `FilterMenu.vue`, `HistoryFilters.js`, `navigation.yml`, `lib/galaxy/selenium/` and `lib/galaxy_test/selenium/framework.py`.
- Findings as returned (ordinary ones only):
  - P2 test-coverage, `test_personal_information.py:21` — the API key test can pass when clicking Show reveals a blank field. Confirmed; fixed.
  - P2 test-coverage, `FilterMenuInput.test.ts:47` — the text filter loses coverage for datalist wiring and disabled state. Confirmed as stated; declined.
  - P2 test-coverage, `VaultSecret.test.ts:44` — the vault secret spec no longer checks the stored-secret display. Confirmed as stated; declined.
  - P2 test-coverage, `CredentialsGroupForm.test.ts:77` — credential secret masking loses its regression assertion. Confirmed as stated; declined, flagged for John.
  - P3 reuse, `test_history_panel.py:127` — two history tests duplicate setup for the same four ready datasets. Confirmed; fixed, and a third copy folded in.
