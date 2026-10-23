`pr_24418_review_0` sits on the reviewed commit `bdfe24d00ed` and changes only tests and docstrings. The validators themselves are untouched. The twobit and lav invalid assertions now check the expected message, so a crashing validator can no longer pass as a detected truncation. The TwoBit tests build big-endian and version-1 variants of `1.twobit` in the test, and parametrized byte mutations cover every rejection branch. Separately, the validate docstring is trimmed to one line and a sniff doctest is added.

- `d9aad76f2c8` Assert expected messages for twobit and lav invalid cases: `_assert_invalid` takes an optional message substring, and every new invalid case passes one.
- `8fef17b62c8` Cover big-endian, v1, and each rejection branch of TwoBit validation: adds the `_twobit(order, version)` rebuild helper, the parametrized valid/truncated and rejection tests, and `_bytes()` in place of `_empty()`.
- `96198cca2a0` Trim TwoBit.validate docstring to one line: drops the rationale paragraph.
- `3c09e4c2610` Add TwoBit sniff doctest using 1.twobit: a positive check on `1.twobit` and a negative one on `1.fasta`.
