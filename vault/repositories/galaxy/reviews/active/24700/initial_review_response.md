(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile: gx_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: ef448e3cde0

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It only widens `Image.set_meta`'s error handling from `PIL.UnidentifiedImageError` to any exception (logged as a warning, metadata left unset) and adds a test fixture plus unit tests; no API, datatype registration, or tool/workflow-facing behavior changes, and reverting is a one-hunk revert.

Small things worth a human glance: the broad `except Exception` can now hide genuine bugs in this block as warnings, and an exception raised after `width`/`height` are assigned leaves metadata partially populated rather than empty.

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24700_round_0_rev_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_24700_round_0_rev_0`](https://github.com/jmchilton/galaxy/tree/pr_24700_round_0_rev_0), from reviewed commit `ef448e3cde0`, makes `Image.set_meta` assign metadata only once every value has been read, so a failure after `Image.open` (e.g. counting frames in a truncated GIF) leaves all metadata unset rather than partly set. It also simplifies the decompression-bomb test by lowering `PIL.Image.MAX_IMAGE_PIXELS` on an existing fixture, adds a small `__set_meta` test helper, and asserts the new warning in every test that reaches the `except Exception` branch. `test/unit/data/datatypes/test_images.py`: 45 passed.

- [`0b42b9e9f72`](https://github.com/jmchilton/galaxy/commit/0b42b9e9f72) Set image metadata only after every value is read — collects values into a dict and assigns them after the `with` block; adds `test_truncated_metadata` (truncated multi-frame GIF), red at `ef448e3cde0` (`width` left as 16). (P3 2)
- [`29ff2581ca6`](https://github.com/jmchilton/galaxy/commit/29ff2581ca6) Trigger decompression bomb test via MAX_IMAGE_PIXELS — swaps the hand-built 20000x20000 PNG for `monkeypatch` + `im1_uint8.png`, and drops `struct`/`zlib`. (P3 3)
- [`141c94cad96`](https://github.com/jmchilton/galaxy/commit/141c94cad96) Assert the warning logged when image metadata is skipped — `caplog` asserts in the XPM, bomb and truncated tests; all three fail when `log.warning` is replaced with `pass`. (P3 4)

</details>

</details>

### P3 1: PR description no longer matches the code

The description says the fix "catches `ValueError` as well" and is "deliberately narrow", leaving out `OSError` so truncated-image errors aren't swallowed. Since `ecf63ae446b` the clause is `except Exception`. So truncated images (`OSError`), decompression-bomb errors and missing files now log a warning and leave metadata unset instead of failing. That is a reasonable choice, and it matches `galaxy.util.image_util.image_type`, which already wraps `Image.open` in `except Exception`. The description just needs to say so.

Update the description to say the catch was widened on purpose, and mention the decompression-bomb case. The description doesn't cover it, but the PR now tests it.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Also raised by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort.

</details>

### P3 2: A failure partway through `set_meta` leaves partial metadata (implementation verified)

`width`, `height` and `depth` are set on `dataset.metadata` before `getattr(im, "n_frames", 0)` and the dtype calculation run. When either of those raises, the new `except Exception` keeps width/height/depth and leaves frames/dtype/axes/channels unset. That contradicts the new comment's "leaves it unset". Before this PR the same failure failed metadata entirely.

<details><summary>Evidence</summary>

A 4-frame GIF made with Pillow, with its last 40 bytes cut off, opens fine, but `im.n_frames` raises `IndexError`. At `ef448e3cde0`, `Image().set_meta` on that file leaves `width == 16`.

</details>

Collect the values in locals inside the `with` block and assign them to `dataset.metadata` only once everything has been read. Commit `0b42b9e9f72` on the review branch does this and adds `test_truncated_metadata`, which fails at `ef448e3cde0` and passes with the fix.

Fixed on the review branch in [`0b42b9e9f72`](https://github.com/jmchilton/galaxy/commit/0b42b9e9f72).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 3: Decompression-bomb test hand-builds a PNG (implementation verified)

`test_decompression_bomb_metadata` builds a 20000x20000 PNG byte by byte with `struct`, `zlib` and CRCs. It also repeats the dataset setup inline. Lowering `PIL.Image.MAX_IMAGE_PIXELS` makes an existing fixture raise the same `DecompressionBombError`.

Use `monkeypatch.setattr(PIL.Image, "MAX_IMAGE_PIXELS", 1)` on `im1_uint8.png`, and move the dataset setup into a small `__set_meta(image_cls, path)` helper. Use `Image`, not `Png`: `Png.set_meta` reads `metadata.dtype`, which raises `AttributeError` on the unit-test `MockMetadata`. Commit `29ff2581ca6` makes this change. The test still fails against base `images.py` with `DecompressionBombError`.

Fixed on the review branch in [`29ff2581ca6`](https://github.com/jmchilton/galaxy/commit/29ff2581ca6).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 4: The new `log.warning` is unasserted (implementation verified)

Once metadata is skipped, the warning in the `except Exception` branch is the only diagnostic left. No test checks for it, so replacing it with `pass` would still pass the tests.

Assert `"Could not read image metadata" in caplog.text` in the tests that reach this branch. Commit `141c94cad96` adds that check to the XPM, bomb and truncated-GIF tests. All three fail when `log.warning` is replaced with `pass`.

Fixed on the review branch in [`141c94cad96`](https://github.com/jmchilton/galaxy/commit/141c94cad96).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>
