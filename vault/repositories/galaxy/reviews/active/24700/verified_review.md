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

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 3: Decompression-bomb test hand-builds a PNG (implementation verified)

`test_decompression_bomb_metadata` builds a 20000x20000 PNG byte by byte with `struct`, `zlib` and CRCs. It also repeats the dataset setup inline. Lowering `PIL.Image.MAX_IMAGE_PIXELS` makes an existing fixture raise the same `DecompressionBombError`.

Use `monkeypatch.setattr(PIL.Image, "MAX_IMAGE_PIXELS", 1)` on `im1_uint8.png`, and move the dataset setup into a small `__set_meta(image_cls, path)` helper. Use `Image`, not `Png`: `Png.set_meta` reads `metadata.dtype`, which raises `AttributeError` on the unit-test `MockMetadata`. Commit `29ff2581ca6` makes this change. The test still fails against base `images.py` with `DecompressionBombError`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 4: The new `log.warning` is unasserted (implementation verified)

Once metadata is skipped, the warning in the `except Exception` branch is the only diagnostic left. No test checks for it, so replacing it with `pass` would still pass the tests.

Assert `"Could not read image metadata" in caplog.text` in the tests that reach this branch. Commit `141c94cad96` adds that check to the XPM, bomb and truncated-GIF tests. All three fail when `log.warning` is replaced with `pass`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>
