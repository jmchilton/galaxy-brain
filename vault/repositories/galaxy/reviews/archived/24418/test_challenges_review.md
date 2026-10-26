# Test challenges review — PR #24418

Profile: gx_test_challenger. Model: claude-opus-5-5. Effort: medium. Reviewed commit: `bdfe24d00ed`.

Verdict: tests are at the right layer (unit; API validate path already covered generically, no UI) and pass locally. Their invalid-case assertions are too weak to prove the validators work, and the 2bit tests miss the big-endian and 64-bit paths. Details and test plan in [test_challenges_debrief.md](test_challenges_debrief.md).

### P2 1: Invalid-case assertions pass even when the validator crashes

`galaxy.datatypes.data.validate()` turns any exception into `invalid("Problem running datatype validation method [...]")`, and `_assert_invalid` checks only `state`. Replacing `TwoBit.validate` and `Lav.validate` with a function that raises `RuntimeError` leaves all five new invalid assertions passing. So they can't tell "detected truncation" from "crashed".

Fix: have `_assert_invalid` take an expected message substring (or at least reject the `"Problem running datatype validation method"` prefix), and pass substrings in the new tests (`"truncated"`, `"#:lav"`, `"#:eof"`, `"16"`).

### P2 2: Big-endian 2bit path untested

`1.twobit` is little-endian, so the `order = ">"` branch never runs. That branch decides how every later int is decoded, so it's the riskiest untested code. Add a big-endian variant (re-pack the fixture's ints with `>` in the test, or a second small fixture), asserted `ok`, plus a truncated copy asserted `invalid`.

### P3 1: Most 2bit rejection branches unexercised

The tests reach 2 of about 9 rejection branches (size < 16, final `end > size`). Probing mutated copies of `1.twobit` shows each other branch returns the right message (bad magic, version 2, count 0, prefix 20 truncated index, prefix 40 offset past EOF, prefix 80 truncated record header). Parametrize these as cases with expected message substrings. A `_bytes(content)` temp helper would cover them and replace `_empty()`. Version-1 (64-bit offset) coverage too, if a fixture is cheap.

### P3 2: No sniff doctest for TwoBit

The new `1.twobit` fixture enables a one-line `TwoBit` sniff doctest; `TwoBit.sniff_prefix` has none today. Optional.
