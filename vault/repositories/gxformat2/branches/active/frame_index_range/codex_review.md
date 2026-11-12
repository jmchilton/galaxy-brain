Run via gpt-6-sol at medium effort.

Codex review of `frame_index_range` (`baaac08` vs `origin/main` `d00e1f7`) raised one finding, which was confirmed and fixed in `ca67b45`: digit strings over Python's 4300-digit `int()` limit crashed linting/conversion instead of reporting out-of-range. Red-to-green test added as an inline mutation of the existing fixture; no fixture, expectation or message changes.

Not acted on: nothing.

<details>
<summary>Full review</summary>

- **P2 correctness, `gxformat2/normalized/_format2.py:307`: Very long digit-string indices crash linting.** `_is_index_string()` accepts digit strings of any length, but `int(ref)` raises ValueError past Python's int string-conversion limit; it escapes `lint_format2` instead of producing the out-of-range lint error. Scenario: `contains_steps` of 4,301 nines in a two-step workflow. Confidence: certain.
  - Verdict: CONFIRMED (reproduced). Fix: `_index_in_range` helper rejects strings longer than the count's digit length (after stripping leading zeros) before `int()`. Test `test_format2_to_native_frame_huge_digit_index` in `tests/test_comments.py`.

Coverage notes: none. Files reviewed included `_conversion.py`, `lint.py`, `lint_rules.py`, `test_interop_tests.py` plus the diff.

</details>
