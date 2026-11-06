# Test challenges debrief — gxformat2#277 @ 177a083

No unit tests added; coverage is one synthetic fixture wired into existing declarative suites:

- `validate_format2.yml`: lax accepts, strict rejects `synthetic-extra-field-output.gxwf.yml`.
- `schema_rules.yml`: fixture added as a `SchemaStrictExtraField` negative (drives `test_schema_rules_catalog.py`).
- `catalog.yml`: registered for both runners.

Challenge results:

- Drop/silly/implementation-coupled: none. Tests assert behavior through public validators, not model internals.
- Mocks: none.
- Red-to-green: confirmed. On `origin/main` (2602e0c) with only the fixture copied in, `validate_format2_strict`, `normalized_format2(strict_structure=True)` and `to_native(strict_structure=True)` all accept it; on 177a083 all reject with `outputs...out.WorkflowOutputParameter.output_source: extra_forbidden`.
- List-form outputs (`outputs: [{id, output_source}]`) were already rejected under strict on main; dict form was the gap. Fixture targets the right shape.
- Focused run: `tests/test_interop_tests.py tests/test_schema_rules_catalog.py tests/test_examples_catalog.py` — 129 passed.

Test plan suggestions:

- Lax side effect: dropping `dict[str, Any]` from the shared `pydantic:type` also tightens the lax model. `outputs: {out: null}` (and `{out: [1]}`) passed `validate_format2` on main and now fail it, and `normalized_format2` lax now raises too. PR says "Lax validation is unchanged." Rejecting these is defensible (nothing meaningful could rely on a null output), but pin it: add a lax negative expectation for a null-valued dict output, or document the change in the PR/HISTORY.
- Optional: the fixture already exercises `normalized_format2`/`to_native` strict paths; no new `TestStrictStructure` case needed — declarative coverage suffices.
