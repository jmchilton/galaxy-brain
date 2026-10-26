# Normal review

No blocking findings or additional changes recommended. No findings were left unaddressed.

<details><summary>Review details</summary>

The is None check matches both output paths: the shared getter returns None for an absent key, and Galaxy's lazy collector returns/caches None for missing outputs while preserving False and other falsy values. CWL responses use the same checker, so they receive the correction too. Explicit None remains missing; null semantics are unchanged.

Tests cover matching falsy values, correct mismatch diagnostics, truthy controls, absent keys, and explicit None. The reviewer independently verified all 29 related tests pass.

</details>
