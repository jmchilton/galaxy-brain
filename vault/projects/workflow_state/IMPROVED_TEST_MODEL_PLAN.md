# Improved Test Model Plan

Independent follow-up to [TEST_VALIDATION_PLAN.md](TEST_VALIDATION_PLAN.md) §"TestOutputAssertions depth". Goal: make `TestOutputAssertions` errors usable by collapsing the un-discriminated `Union` into a tagged one. Secondary: parity fixes for the nested-element variants.

Target file: `lib/galaxy/tool_util_models/__init__.py:185-235`.

**Status: IMPLEMENTED** — commit `0adf9f776c` on branch `wf_test_job_schema`. See §8 for what diverged.

## 0. Verified claims

- `TestOutputAssertions = Union[TestCollectionOutputAssertions, TestDataOutputAssertions, TestOutputLiteral]` — confirmed (`__init__.py:235`). Un-discriminated.
- `class_` defaults: `"File"` on `TestDataOutputAssertions` (`__init__.py:202`) and `"Collection"` on `TestCollectionOutputAssertions` (`__init__.py:225`). Both `Optional[Literal[...]] = Field(..., alias="class")` — `class:` key is optional in YAML.
- `TestCollectionCollectionElementAssertions` has no `class_` field (`__init__.py:205-207`). Nested siblings:
  - `TestCollectionDatasetElementAssertions(BaseTestOutputModel)` — inherits no `class_` either (only `TestDataOutputAssertions` adds it). Nested dataset elements therefore also cannot carry `class: File`.
  - `TestCollectionElementAssertion = Union[TestCollectionDatasetElementAssertions, TestCollectionCollectionElementAssertions]` — also un-discriminated.
- `_discriminate_file` precedent: `test_job.py:102-132`, `Annotated[Union[Tag(...), ...], Discriminator(callable)]` — in-tree pattern.
- Existing `Field(discriminator="class_")` string-form precedent: `__init__.py:159` (`DynamicToolSources`), `test_job.py:146` (`CollectionElement`).
- `StrictModel` → `extra="forbid"` (`_base.py:17-18`).
- Assertions root model is discriminated on `"that"` — verified at `assertions.py:1-60` (auto-generated, `AssertionModel` uses `extra="forbid"`). 3641-line file, not touching.
- `Tests` / `TestJob` external consumers: `test/unit/tool_util_models/test_simple_parse.py`, `test/unit/tool_util/test_test_format_model.py`, and `lib/galaxy_test/workflow/test_framework_workflows.py:17` (likely `UserToolSource` bundle; not the assertion types — verify).

## 1. Discriminator strategy

Use a callable `Discriminator` on `TestOutputAssertions`, three tags: `"File"`, `"Collection"`, `"scalar"`.

```python
def _discriminate_output(v):
    if isinstance(v, dict):
        cls = v.get("class")
        if cls == "Collection":
            return "Collection"
        return "File"  # default — class absent or class: "File"
    if isinstance(v, TestCollectionOutputAssertions):
        return "Collection"
    if isinstance(v, TestDataOutputAssertions):
        return "File"
    if isinstance(v, (bool, int, float, str)):
        return "scalar"
    return None

TestOutputAssertions = Annotated[
    Union[
        Annotated[TestCollectionOutputAssertions, Tag("Collection")],
        Annotated[TestDataOutputAssertions, Tag("File")],
        Annotated[TestOutputLiteral, Tag("scalar")],
    ],
    Discriminator(_discriminate_output),
]
```

Why callable and not `Field(discriminator="class_")`:
- The scalar branch has no `class_` field.
- `class_` is optional everywhere; string-form discriminator requires the key present.
- Pydantic's string discriminator does not see defaults at discrimination time.

An unknown `class:` value (e.g. `class: Banana`) falls through to `"File"` → user gets a clean "literal_error: expected 'File'" on the `class_` field rather than three parallel tracebacks. Acceptable.

Same treatment applies to `TestCollectionElementAssertion` — but the two inner types currently share zero distinguishing keys. See §2.

## 2. Nested element fix — `TestCollectionCollectionElementAssertions`

Parallels `TestCollectionOutputAssertions` but omits `class_`. No surrounding tests exercise the nested element shape. Looks like oversight, not deliberate.

Recommended: add the field, symmetric with outer.

```python
class TestCollectionCollectionElementAssertions(StrictModel):
    class_: Optional[Literal["Collection"]] = Field("Collection", alias="class")
    elements: Optional[Dict[str, "TestCollectionElementAssertion"]] = None
    element_tests: Optional[Dict[str, "TestCollectionElementAssertion"]] = None
```

And give the dataset nested variant an explicit `class_` too (on `TestCollectionDatasetElementAssertions` since the base model intentionally doesn't have one — keep base bare, push to the concrete variant):

```python
class TestCollectionDatasetElementAssertions(BaseTestOutputModel):
    class_: Optional[Literal["File"]] = Field("File", alias="class")
```

Then apply the same `_discriminate_output`-style callable to `TestCollectionElementAssertion` so nested-element diagnostics match.

Risk: if any real test YAML has nested collection elements with unknown keys that currently parse as `TestCollectionDatasetElementAssertions` (the `Union` leftmost winner) by accident, adding strict `class_` won't change that path — `class_` defaults to `"File"` so omitted-class still goes to dataset branch. Should be pure improvement.

## 3. Backwards compatibility

Grep for `TestOutputAssertions` / `TestCollectionOutputAssertions` / `TestDataOutputAssertions` / `TestCollectionCollectionElementAssertions`: only `__init__.py` references them. No external importers.

The discriminator change is additive for valid inputs: same models still accept same dicts. Only the error-surface shape changes. `model_dump()` round-trips still work — `Annotated[... Tag(), Discriminator()]` is dump-transparent.

`model_json_schema()` output changes from flat `anyOf` to `oneOf` with a `discriminator` property (see §5) — any consumer parsing that schema needs to handle discriminator, but we control both sides.

## 4. Test impact & new tests

Existing:
- `test/unit/tool_util_models/test_simple_parse.py` — one positive case, passes under either model.
- `test/unit/tool_util/test_test_format_model.py` — runs `Tests.model_validate` against `lib/galaxy_test/workflow/*.gxwf-tests.yml` and optionally IWC. Positive-only; should continue passing. Verify locally.

New tests (red-to-green, drop in `test/unit/tool_util_models/` or `test/unit/tool_util/`):

1. Positive: implicit-File output (no `class:` key) validates as `TestDataOutputAssertions`.
2. Positive: explicit `class: Collection` with `elements:` validates as `TestCollectionOutputAssertions`.
3. Positive: scalar literals (`True`, `42`, `"hello"`) validate as `TestOutputLiteral`.
4. Positive: nested collection element with `class: Collection` validates (regression guard for §2 fix).
5. Negative (the crux): `File` output with unknown field — assert `ValidationError` contains ONE error targeting `TestDataOutputAssertions` (not three), and the error string does NOT include `_model` fan-out:
   ```python
   errs = exc.value.errors()
   assert len(errs) == 1
   assert errs[0]["loc"][:2] == ("outputs", "out")
   assert "File" in str(errs[0]["loc"])  # discriminator tag present
   ```
6. Negative: bad `class: Banana` — one error on `class_` literal, not three branches.
7. Negative: `asserts: [{that: "not_a_real_assert"}]` — verify error is scoped to `asserts` and doesn't bleed into Collection / scalar branches.
8. Snapshot-ish: assert `Tests.model_json_schema()` contains a `discriminator` key at the output-assertions union site.

All additions are in-package; no integration-test impact. Run `pytest test/unit/tool_util_models test/unit/tool_util/test_test_format_model.py` before commit.

## 5. JSON Schema export impact (shared benefit)

- Current: `Tests.model_json_schema()` emits `anyOf: [CollectionOutput, DataOutput, {type: [bool, int, number, string]}]` for each output value.
- After: `oneOf: [...]` with a `discriminator: {propertyName: "class", mapping: {File: "#/$defs/TestDataOutputAssertions", Collection: "#/$defs/TestCollectionOutputAssertions"}}` for the model arms. Callable discriminators may not export a JSON-Schema-level discriminator automatically — verify empirically, and if missing add `json_schema_extra={"discriminator": {...}}` override.

Benefits for downstream:
- Ajv picks the right branch by `class` — single-path error instead of all-branches-failed.
- TS codegen emits a proper tagged union (`{ class: 'File', ... } | { class: 'Collection', ... } | boolean | number | string`).
- The `TestOutputLiteral` arm remains a scalar union — fine.

## 6. Implementation order (red-to-green)

1. Write new negative test #5 first against current code — confirm it fails in the bad way (triple error, `_model` fan-out string). Locks the regression baseline.
2. Write positive tests #1-#4 — confirm #1-#3 pass; #4 (nested `class: Collection`) fails on current code. Leave red.
3. Apply §2 fix: add `class_` to `TestCollectionCollectionElementAssertions` and `TestCollectionDatasetElementAssertions`. Run tests — nested #4 passes; others still pass.
4. Apply §1 discriminator on outer `TestOutputAssertions`. Run #5-#7. Should go green.
5. Apply discriminator on inner `TestCollectionElementAssertion` (same callable pattern, tags `"File"` / `"Collection"`). Run nested negative tests.
6. Write test #8 (JSON Schema). Inspect schema; if no discriminator key emitted for callable case, add `json_schema_extra` override.
7. Run existing `test_test_format_model.py` and `test_simple_parse.py`. Spot-check IWC tree if env available.
8. Commit.

## 7. Unresolved questions

- Require `class:` key explicitly (break implicit-File)? Would let us use string-form `Field(discriminator="class_")` and skip callable. Probably no — IWC test YAMLs routinely omit it.
- Pydantic callable-`Discriminator` JSON Schema: auto-emit `discriminator` property or need `json_schema_extra`? Verify in step 6.
- `TestOutputLiteral` tag — single `"scalar"` or split bool/int/float/str? Single simpler; split gives better TS types but clutters errors.
- `BaseTestOutputModel` itself grow `class_` instead of duplicating on two subclasses? Cleaner, but changes `TestCollectionDatasetElementAssertions`'s class_ default semantics. Recommend: duplicate on subclasses, keep base bare.
- Rename `TestOutputAssertions` (Union) vs `TestDataOutputAssertions` / `TestCollectionOutputAssertions` (classes)? Confusing but out of scope.

## Key paths

- `lib/galaxy/tool_util_models/__init__.py:185-250`
- `lib/galaxy/tool_util_models/test_job.py:102-147` (precedent)
- `lib/galaxy/tool_util_models/_base.py:17-18` (StrictModel)
- `lib/galaxy/tool_util_models/assertions.py:1-60` (AssertionModel; don't touch)
- `test/unit/tool_util/test_test_format_model.py` (regression guard)
- `test/unit/tool_util_models/test_simple_parse.py` (regression guard)
- `test/unit/tool_util_models/test_output_assertions.py` (new — 11 tests added in commit `0adf9f776c`)

## 8. Implementation debrief (2026-04-21)

Landed in commit `0adf9f776c` on `wf_test_job_schema`. Full regression suite (`test/unit/tool_util_models` + `test/unit/tool_util/test_test_format_model.py`): 32 passed, 1 skipped.

### Deviations from plan

**A. Three gxwf-tests YAMLs were buggy; fixed, not accommodated.**
Plan §1 said `class` absent → default to `File`. Regression surfaced: three workflow test YAMLs had nested collection outputs with `elements:` but no `class: Collection` — the un-discriminated Union had been silently accepting them by trying branches until one worked. Rather than add a shape-peek fallback to the discriminator (initial pass did this; reverted on review), fixed the YAMLs:

- `lib/galaxy_test/workflow/collection_semantics_cat.gxwf-tests.yml` — `[3].outputs.wf_output.elements.el1`
- `lib/galaxy_test/workflow/subcollection_rank_sorting.gxwf-tests.yml` — `[2].outputs.out.elements.test_level_3`
- `lib/galaxy_test/workflow/subcollection_rank_sorting_paired.gxwf-tests.yml` — `[2].outputs.out.elements.test_level_3`

Verified no other workflow YAMLs have the same omission, and no `type:` vs `collection_type:` confusion on `class: Collection` entries anywhere. Discriminators stay strict per plan: `class == "Collection"` → Collection, else → File.

**B. Test loc-shape correction.**
Plan §4 test #5 asserted `errs[0]["loc"][:2] == ("outputs", "out")`. Actual pydantic loc begins with the `RootModel` list index, so `(0, "outputs", "out", "File", ...)`. Tests were updated to match. No behavioral impact — just mechanical.

**C. `BaseTestOutputModel` stays bare; class_ duplicated on subclasses.**
Plan §7 asked this as an open question; implementation went with "duplicate on subclasses". `TestCollectionDatasetElementAssertions` now has `class_: Optional[Literal["File"]] = Field("File", alias="class")` explicitly. Keeps the base model flexible for any future subclass that doesn't need a class tag.

**D. JSON-schema test (#8) left loose.**
Plan §5 flagged uncertainty about whether callable `Discriminator` auto-emits a JSON-Schema `discriminator` keyword. Test asserts `"discriminator" in schema OR "oneOf" in schema` — passes under pydantic 2.12 but doesn't pin down which. Tightening requires inspecting actual schema output; deferred.

### What matched the plan exactly

- §1 tag names (`"File"` / `"Collection"` / `"scalar"`)
- §2 nested `class_` additions (symmetric with outer)
- §3 backwards-compat: all existing positive fixtures still parse
- §6 red-to-green order loosely followed — skipped the baseline-lock test at user's direction and wrote final-shape tests directly
- No external consumers touched (confirmed — `__init__.py` is the only site that references these names)

### Updated unresolved questions

- (Original) `TestOutputLiteral` tag — single `"scalar"` or split? Kept single. Revisit if downstream TS consumers want tighter types.
- (Original) Rename `TestOutputAssertions` vs `TestDataOutputAssertions` / `TestCollectionOutputAssertions`? Still out of scope.
- (New) Tighten test #8 once pydantic 2.12's emit shape is confirmed. Cheap follow-up.
- (New) `json_schema_extra` discriminator override needed for TS codegen downstream? Gated on whatever consumer surfaces the need.
