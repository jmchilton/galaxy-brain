### P2 1: Invalid-case assertions pass even when the validator crashes (implementation verified)

`galaxy.datatypes.data.validate()` turns any exception into `invalid("Problem running datatype validation method [...]")`, and `_assert_invalid` checks only `state`. With `TwoBit.validate` and `Lav.validate` replaced by a function that raises `RuntimeError`, all five new invalid assertions still pass. The tests can't tell a detected truncation from a crash.

Commit `d9aad76f2c8` gives `_assert_invalid` an optional expected message substring and passes one in every new twobit and lav invalid case. Under the same raising stub, each of the five assertions now fails on the `Problem running datatype validation method [boom]` message.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P2 2: TwoBit tests skip the big-endian path, version 1, and most rejection branches (implementation verified)

`1.twobit` is little-endian version 0, so neither the `order = ">"` branch nor the 64-bit offset path ever runs. The byte order decides how every later int is decoded, which makes it the riskiest untested code. The tests also reach only 2 of the 8 rejection branches: `size < 16` through the empty file, and the final `end > size` check through a 3-byte truncation.

Commit `8fef17b62c8` rebuilds `1.twobit` in the test with either byte order and either version, so no new binary fixtures are needed. Each variant is asserted `ok`, and the same variant cut by one byte is asserted `invalid`. Byte mutations of the fixture are parametrized over every rejection branch, each with its expected message: empty, bad magic, version 2, zero sequences, truncated index, offset past EOF, truncated record header, truncated DNA. A small `_bytes(content)` helper replaces `_empty()`. With the PR's code the rebuilt little-endian v0 file is byte-identical to the fixture. Forcing `order = "<"` and 32-bit offsets in the validator fails the three big-endian and v1 cases.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 1: `TwoBit.validate` docstring carries rationale (implementation verified)

The docstring's second paragraph ("A 2bit truncated or written empty by a failed job still sniffs...") explains why the validator exists. That belongs in the commit or PR message.

Commit `96198cca2a0` keeps only the first line.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: No sniff doctest for TwoBit (implementation verified)

`TwoBit.sniff_prefix` has no doctest, and the PR's new `1.twobit` fixture makes one cheap to add.

Commit `3c09e4c2610` adds a doctest that sniffs `1.twobit` as `True` and `1.fasta` as `False`. It passes.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>
