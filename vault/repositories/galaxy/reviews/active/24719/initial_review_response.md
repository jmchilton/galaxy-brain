

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via claude-opus-5-5 at low effort.
- Review profile [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) was run via claude-opus-5-5 at medium effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via claude-opus-5-5 at medium effort.

</details>

<details><summary>Risks</summary>

The only one-way door is small: `/api/configuration` gains a public key, `short_term_storage_effective_duration`, which is awkward to rename or remove once clients such as #24259 rely on it.

<details><summary>Risk Details</summary>

- New `/api/configuration` key, readable by all users including anonymous ones. It is additive, so existing clients are unaffected, and the value is a duration only.
- The key's name and meaning (seconds a new link lasts when no explicit duration is requested) become a contract. A caller that passes its own `duration` to `new_target` can diverge from it. The export paths in this PR's scope pass none, so the value is accurate today.
- `new_target` now gets its duration from the extracted `effective_storage_duration`. The logic looks equivalent, and a parametrized test compares it against real targets, so this path is cheap to revert.
- The dialog text changes only on servers with non-default settings, and falls back to "24 hours" when the key is missing, so it can be reverted freely.
- The history and invocation export wizards still say 24 hours, so wording can disagree across dialogs on non-default servers until the follow-up lands. The PR calls this out.

</details>

<details><summary>Risk Review Advice</summary>

Consider whether `short_term_storage_effective_duration` is the name and unit Galaxy wants to keep, since this is the part that outlives a revert. A separate key from `short_term_storage_default_duration` is an explicit choice in the PR description.

The client side, including `formatDurationSeconds`, is a two-way door and needs only a light check of the wording.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24719_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

# Review branch: [`pr_24719_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24719_review_0)

Based on `e2c3677d3ae`. It replaces the fake-config serializer test with an integration test against real server configuration, adds a browser test connecting the API key to the dialog, makes the lifetime label round up rather than to nearest, stops the dialog reusing a link past half a short server lifetime, and pins the helper's explicit `duration` argument.

- [`6f4fd89b6c0`](https://github.com/jmchilton/galaxy/commit/6f4fd89b6c0) Pin explicit duration handling in effective_storage_duration. Adds rows through the helper and `new_target` (verified P3 4).
- [`d761a276130`](https://github.com/jmchilton/galaxy/commit/d761a276130) Round link lifetime labels up so they do not understate exposure. Changes `formatDurationSeconds` to round up with unit carry and adds non-multiple rows (verified P3 2).
- [`a4197825bfd`](https://github.com/jmchilton/galaxy/commit/a4197825bfd) Stop reusing an export link past half its lifetime. Caps the dialog's one hour reuse window from the reported lifetime, with a Vitest case (verified P3 1).
- [`016df53042d`](https://github.com/jmchilton/galaxy/commit/016df53042d) Test the effective duration against a real server configuration. Deletes `test_ConfigSerializer.py` and adds `test/integration/test_short_term_storage_configuration.py` (verified P2 1).
- [`faa72e0e6ea`](https://github.com/jmchilton/galaxy/commit/faa72e0e6ea) Add a browser test connecting the link lifetime API key to the dialog. Adds the Selenium integration test, navigation entries and a `data-description` on the warning text (verified P3 3).

</details>

</details>

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

Fixed on the review branch in [`016df53042d`](https://github.com/jmchilton/galaxy/commit/016df53042d).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 1: Reused link can outlive a short server lifetime (implementation verified)

`ExportToAnotherGalaxyDialog.vue` reuses a link for one hour, on the comment's guess that this is "well inside the shortest storage duration a server is likely to use". The dialog now reads the real lifetime and is the first place to state it. With `short_term_storage_maximum_duration: 1800`, reopening an item at 45 minutes can show a link cleanup has already deleted, next to text saying it lasts "usually after 30 minutes".

Cap the window at half the reported lifetime, keeping one hour when the key is missing. Commit `a4197825bfd` does this and adds a Vitest case that fails without the change.

Fixed on the review branch in [`a4197825bfd`](https://github.com/jmchilton/galaxy/commit/a4197825bfd).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: Lifetime label rounds to nearest, understating exposure, and the rounding is unpinned (implementation verified)

`formatDurationSeconds` backs a consent warning ("Anyone with this link can download... It can't be withdrawn before then"), so rounding down is the wrong direction: 3.4 days reads "3 days" and 83 minutes reads "1 hour". Also, 3599 seconds reads "60 minutes" and 172799 reads "48 hours". Every row in `duration.test.ts` is an exact multiple of its unit, so nothing pins the rounding at all. Impact is low: typical values are round and the text says "usually".

Round up at each unit, moving to the next unit at its boundary, and add rows for non-multiples. Commit `d761a276130` does this; four of its six new rows fail against the PR's code.

Fixed on the review branch in [`d761a276130`](https://github.com/jmchilton/galaxy/commit/d761a276130).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 3: No browser test connects the API key to the dialog (implementation verified)

`GalaxyConfiguration` is `any`, so a mismatch in the `short_term_storage_effective_duration` string between `configuration.py` and the Vue file passes typing, Vitest (which mocks the key) and the API test. No test or navigation entry touches this dialog; that gap predates the PR, but this PR adds the seam. Priority is P3 since the change is one sentence of text.

Add a Selenium integration test following the PR's manual steps 1-2. Commit `faa72e0e6ea` adds `test/integration_selenium/test_export_to_another_galaxy.py`, navigation entries and a `data-description` on the warning text. It passes under the Playwright backend, and fails when the key served by the API is renamed.

Fixed on the review branch in [`faa72e0e6ea`](https://github.com/jmchilton/galaxy/commit/faa72e0e6ea).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 4: Explicit `duration` argument of the new helper is untested (implementation verified)

`effective_storage_duration` takes `duration` first in its `or` chain and `new_target` passes it through, but no test passes one, so dropping it from the chain fails nothing. No production `new_target` caller passes it today, which is why the gap is minor. The code moved in this PR.

Add rows through both the helper and `new_target`. Commit `6f4fd89b6c0` does this; the `(300, no maximum)` row fails with `duration` dropped from the chain.

Fixed on the review branch in [`6f4fd89b6c0`](https://github.com/jmchilton/galaxy/commit/6f4fd89b6c0).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>
