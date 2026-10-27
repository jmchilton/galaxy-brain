# Normal review: 27.0 gate and shadowed-alias error (2026-10-27)

The review found no bugs. I acted on nits 1 and 2 and checked nit 3; the result was amended into `185ef488bdc` and pushed as `f7b5ad8f098`.

## Not acted on
- **Nit 4:** `output_reference_ambiguity` returns a message fragment. That matches `output_reference_problem`, so I left it.

<details><summary>Review</summary>

- **Profile comparison:** correct. Tool load and the linter both compare `Version` against `OUTPUT_REFERENCE_STRICT_PROFILE`.
- **Lint vs load:** they use the same threshold and the same shared helpers, so lint can't miss anything that fails load.
- **Discovered collection with a shadowed alias:** it gets the existing discovered error only once. Load raises the ambiguity error.
- **XSD and message:** both accurate and clear.
- **Nit 1:** the "before Galaxy" wording on the discovered-collection error used the profile constant to name a Galaxy release. **Fixed:** it's now a literal `27.0`.
- **Nit 2:** two cases were missing. **Fixed:** added lint tests for a shadowed `metadata_source` and for no ambiguity error below 27.0.
- **Nit 3:** does the qualified key win at runtime? **Verified:** `tools/actions/__init__.py` records legacy names through `set_legacy_alias`, which is looked up only after real keys.
</details>
