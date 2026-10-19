# from_file deprecation review (`ed05d4d2bfe`)

Normal review subagent, 2026-10-08. Verdict: ready to merge, nothing must-fix, no security issues. Applied nit 2: `gxdocs:deprecated="true"` plus a `*Deprecated*.` prefix (`f66d1f0f97d`). Applied should-fix 1: the PR description now explains the deprecation, and the debrief is regenerated.

Not acted on:
- **Nit 3:** dropping `from_file` from the drill_down `$attribute_list` is new, because siblings keep their deprecated attributes in their tables. I kept it on purpose: no working tool uses it, so it shouldn't be easy to discover.
- **Nits 4–5:** these were praise, not requests. Nothing to do.

<details><summary>Full review</summary>

**Checks run**
- `test_tool_linters.py`: 136 passed.
- XSD docs rendered with `doc/parse_gx_xsd.py`. The drill_down section shows only `multiple` and `hierarchy`. `from_file` still appears, with the deprecated wording, in the full `param` attribute table.
- No test or workflow lints `test/functional/tools` or asserts zero warnings. The new warning on `gx_drill_down_from_file.xml` breaks nothing, and the XSD checks (including the stacked branch) still pass.

**Branch-specific answers**
- A new `InputsDrillDownFromFile` linter class is the right reuse. It mirrors `InputsSelectDynamicOptions`: a deprecated attribute on `<param>`, gated on param type. Folding or generalizing would change what skipping a linter by name disables. `InputsSelectOptionsDeprecatedAttr` lints attributes on `<options>`, so it doesn't fit.
- The message matches the `<Type> parameter [name] ...` convention.
- The XSD wording matched the adjacent `dynamic_options` doc.

**Should-fix**
1. The PR description and implementation debrief were stale: attribute table, "officially supported", annotation_profiler as "the one known tool", and the commit and test count.

**Nits**
2. Other deprecated `param` attributes (`size`, `force_select`, `default_value`) use `gxdocs:deprecated="true"` and a `*Deprecated*.` prefix.
3. Dropping the attribute from `$attribute_list` differs from siblings. It renders fine.
4. The test reuses the `DRILL_DOWN_ATTRIBUTES` fixture and asserts the exact warning list. That's good: keep it.
5. The reworded tool comment earns its place.

</details>
