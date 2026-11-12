Run via Claude Opus 5.5 at low effort.

**Verdict:** good port; semantic parity with gxformat2 `3530ea0` except one schema-invalid edge (floats), fixed in `ad7d1e4b`. Acted on: 1 finding. Not acted on: 2 nits.

Not acted on:
- `checks` tuple uses positional `as const` arrays vs Python's named `_FrameRefCheck`; readable enough at 2 entries, a named object would be nicer. Nit.
- Digit regex `/^[0-9]+$/` matches Python `isascii() and isdigit()`; no change needed.

<details><summary>Full review</summary>

Reviewed `5d773e85` vs `origin/main` `61d5e632`.

Parity checks against Python `_FrameRefCheck.problem`:
- Label-first: yes, label set checked before index path, both fields.
- Bools: JS `typeof` excludes booleans; matches Python's `bool` skip.
- Digit strings in `contains_comments`: treated as labels (unknown label) — matches.
- Negative ints: flagged out of range — matches.
- Huge digit strings: `Number("9"*5000)` is `Infinity`, `>= count` → out of range; matches Python's `_index_in_range` length guard. Test added.
- **Bug (fixed, minor):** non-integer numbers (e.g. `-0.5`, `99.5`) were range-checked in JS but skipped in Python (not int/str). Schema rejects them, so only reachable on unvalidated input. Fixed with `Number.isInteger(ref)`; red-to-green test added.

Fixtures: `synthetic-frame-digit-label.gxwf.yml`, `synthetic-frame-index-out-of-range.gxwf.yml`, `expectations/lint_format2.yml`, `expectations/to_native.yml` byte-identical to gxformat2 branch HEAD; `baaac08..3530ea0` touched only `_format2.py` and `tests/test_comments.py`.

Gates on `ad7d1e4b`: `pnpm build`, `make check`, `pnpm lint:unused:ci`, `make test` all pass. Pushed to `origin`.
</details>
