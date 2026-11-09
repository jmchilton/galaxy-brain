### P2 1: Non-default server configuration is only tested against a fake, which can't catch swapped arguments (implementation verified)

The PR exists for servers that change the short term storage options, but no test boots Galaxy with them. The only serializer-level test uses a `SimpleNamespace` config, and its rows repeat cases already in `test_effective_duration_matches_new_targets`. Those rows, and the API test, stay green with `default` and `maximum` swapped in the serializer lambda, because `effective_storage_duration` returns the same value either way for each of them. The PR's "cannot drift" claim is also unbacked end to end: `new_target` gets its values through separate wiring in `lib/galaxy/app/__init__.py`, which no test compares with the API.

<details><summary>Evidence</summary>

| default, maximum | Correct | Swapped |
| --- | --- | --- |
| 86400, 0 (API test, unit row) | 86400 | 86400 |
| 604800, 86400 (unit row) | 86400 | 86400 |
| None, 3600 (unit row) | 3600 | 3600 |
| 172800, 0 (PR's manual test step 2; untested at this layer) | 172800 | 86400 |

With the arguments swapped in the lambda, the new integration test fails with `assert 86400 == 172800` in `TestEffectiveDurationNoMaximum`.

</details>

Replace `test/unit/app/managers/test_ConfigSerializer.py` with `test/integration/test_short_term_storage_configuration.py`, which sets the options through `handle_galaxy_config_kwds` and compares the API value with a real target from the running app. Commit `016df53042d` on the review branch does this; both tests pass.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 1: Reused link can outlive a short server lifetime (implementation verified)

`ExportToAnotherGalaxyDialog.vue` reuses a link for one hour, on the comment's guess that this is "well inside the shortest storage duration a server is likely to use". The dialog now reads the real lifetime and is the first place to state it. With `short_term_storage_maximum_duration: 1800`, reopening an item at 45 minutes can show a link cleanup has already deleted, next to text saying it lasts "usually after 30 minutes".

Cap the window at half the reported lifetime, keeping one hour when the key is missing. Commit `a4197825bfd` does this and adds a Vitest case that fails without the change.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: Lifetime label rounds to nearest, understating exposure, and the rounding is unpinned (implementation verified)

`formatDurationSeconds` backs a consent warning ("Anyone with this link can download... It can't be withdrawn before then"), so rounding down is the wrong direction: 3.4 days reads "3 days" and 83 minutes reads "1 hour". Also, 3599 seconds reads "60 minutes" and 172799 reads "48 hours". Every row in `duration.test.ts` is an exact multiple of its unit, so nothing pins the rounding at all. Impact is low: typical values are round and the text says "usually".

Round up at each unit, moving to the next unit at its boundary, and add rows for non-multiples. Commit `d761a276130` does this; four of its six new rows fail against the PR's code.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 3: No browser test connects the API key to the dialog (implementation verified)

`GalaxyConfiguration` is `any`, so a mismatch in the `short_term_storage_effective_duration` string between `configuration.py` and the Vue file passes typing, Vitest (which mocks the key) and the API test. No test or navigation entry touches this dialog; that gap predates the PR, but this PR adds the seam. Priority is P3 since the change is one sentence of text.

Add a Selenium integration test following the PR's manual steps 1-2. Commit `faa72e0e6ea` adds `test/integration_selenium/test_export_to_another_galaxy.py`, navigation entries and a `data-description` on the warning text. It passes under the Playwright backend, and fails when the key served by the API is renamed.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 4: Explicit `duration` argument of the new helper is untested (implementation verified)

`effective_storage_duration` takes `duration` first in its `or` chain and `new_target` passes it through, but no test passes one, so dropping it from the chain fails nothing. No production `new_target` caller passes it today, which is why the gap is minor. The code moved in this PR.

Add rows through both the helper and `new_target`. Commit `6f4fd89b6c0` does this; the `(300, no maximum)` row fails with `duration` dropped from the chain.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>
