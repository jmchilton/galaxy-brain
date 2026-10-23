(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via claude-opus-5-5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via claude-opus-5-5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile: gx_risk_assessment · Model: claude-opus-5-5 · Effort: low · Reviewed commit: bdfe24d00ed

Risks are minimal - this change only adds opt-in `validate()` implementations for `twobit` and `lav` plus unit tests, so it doesn't lock Galaxy into difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- Validation runs only where Galaxy already requests datatype validation; no API, schema, tool, or workflow contract changes.
- New behavior is a stricter definition of "valid": a `lav` file without a trailing `#:eof` line, or a `twobit` whose last indexed record extends past EOF, will now be marked invalid. Producers that omit `#:eof` (non-lastz/blastz writers) would be flagged; reverting is a one-commit rollback.
- TwoBit check reads only the header, index, and the last record header, so cost stays small even for large genomes.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should confirm that `#:eof` is reliably written by the LAV producers Galaxy users rely on (lastz, blastz) and that the TwoBit end-offset arithmetic (n blocks, mask blocks, reserved word, packed DNA) matches the UCSC spec for both v0 and v1 files.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24418_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[`pr_24418_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24418_review_0) sits on the reviewed commit `bdfe24d00ed` and changes only tests and docstrings. The validators themselves are untouched. The twobit and lav invalid assertions now check the expected message, so a crashing validator can no longer pass as a detected truncation. The TwoBit tests build big-endian and version-1 variants of `1.twobit` in the test, and parametrized byte mutations cover every rejection branch. Separately, the validate docstring is trimmed to one line and a sniff doctest is added.

- [`d9aad76f2c8`](https://github.com/jmchilton/galaxy/commit/d9aad76f2c8) Assert expected messages for twobit and lav invalid cases: `_assert_invalid` takes an optional message substring, and every new invalid case passes one.
- [`8fef17b62c8`](https://github.com/jmchilton/galaxy/commit/8fef17b62c8) Cover big-endian, v1, and each rejection branch of TwoBit validation: adds the `_twobit(order, version)` rebuild helper, the parametrized valid/truncated and rejection tests, and `_bytes()` in place of `_empty()`.
- [`96198cca2a0`](https://github.com/jmchilton/galaxy/commit/96198cca2a0) Trim TwoBit.validate docstring to one line: drops the rationale paragraph.
- [`3c09e4c2610`](https://github.com/jmchilton/galaxy/commit/3c09e4c2610) Add TwoBit sniff doctest using 1.twobit: a positive check on `1.twobit` and a negative one on `1.fasta`.

</details>

</details>

### P2 1: Invalid-case assertions pass even when the validator crashes (implementation verified)

`galaxy.datatypes.data.validate()` turns any exception into `invalid("Problem running datatype validation method [...]")`, and `_assert_invalid` checks only `state`. With `TwoBit.validate` and `Lav.validate` replaced by a function that raises `RuntimeError`, all five new invalid assertions still pass. The tests can't tell a detected truncation from a crash.

Commit `d9aad76f2c8` gives `_assert_invalid` an optional expected message substring and passes one in every new twobit and lav invalid case. Under the same raising stub, each of the five assertions now fails on the `Problem running datatype validation method [boom]` message.

Fix: [`d9aad76f2c8`](https://github.com/jmchilton/galaxy/commit/d9aad76f2c8)

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P2 2: TwoBit tests skip the big-endian path, version 1, and most rejection branches (implementation verified)

`1.twobit` is little-endian version 0, so neither the `order = ">"` branch nor the 64-bit offset path ever runs. The byte order decides how every later int is decoded, which makes it the riskiest untested code. The tests also reach only 2 of the 8 rejection branches: `size < 16` through the empty file, and the final `end > size` check through a 3-byte truncation.

Commit `8fef17b62c8` rebuilds `1.twobit` in the test with either byte order and either version, so no new binary fixtures are needed. Each variant is asserted `ok`, and the same variant cut by one byte is asserted `invalid`. Byte mutations of the fixture are parametrized over every rejection branch, each with its expected message: empty, bad magic, version 2, zero sequences, truncated index, offset past EOF, truncated record header, truncated DNA. A small `_bytes(content)` helper replaces `_empty()`. With the PR's code the rebuilt little-endian v0 file is byte-identical to the fixture. Forcing `order = "<"` and 32-bit offsets in the validator fails the three big-endian and v1 cases.

Fix: [`8fef17b62c8`](https://github.com/jmchilton/galaxy/commit/8fef17b62c8)

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 1: `TwoBit.validate` docstring carries rationale (implementation verified)

The docstring's second paragraph ("A 2bit truncated or written empty by a failed job still sniffs...") explains why the validator exists. That belongs in the commit or PR message.

Commit `96198cca2a0` keeps only the first line.

Fix: [`96198cca2a0`](https://github.com/jmchilton/galaxy/commit/96198cca2a0)

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: No sniff doctest for TwoBit (implementation verified)

`TwoBit.sniff_prefix` has no doctest, and the PR's new `1.twobit` fixture makes one cheap to add.

Commit `3c09e4c2610` adds a doctest that sniffs `1.twobit` as `True` and `1.fasta` as `False`. It passes.

Fix: [`3c09e4c2610`](https://github.com/jmchilton/galaxy/commit/3c09e4c2610)

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>
