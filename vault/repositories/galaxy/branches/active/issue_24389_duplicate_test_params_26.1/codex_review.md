# Codex review (round 2, after re-scope)

Codex (`codex exec -s read-only`, unprimed brief covering #24389 plus the `edit_attributes` change) reported two findings. I confirmed and fixed the first in `7f2cbaab65a`. I refuted the second.

**P2, confirmed: identical duplicate collection params with composite elements were rejected.** `_comparable_test_input` stripped generated composite renames only from the outer `edit_attributes`. Collection elements parsed by `__parse_param_elem` carry their own UUID renames inside `attributes["collection"]`. I reproduced it at profile 25.1 with two identical `<collection>` params holding a composite element, which errored at load. Fix: `_comparable_attributes` / `_comparable_collection` recurse into collection elements, including nested collections. Red→green test: `test_duplicate_identical_composite_collection_test_param_is_tolerated`.

**P2, refuted: explicit renames that use the composite prefix get ignored.** This only happens when a tool author hand-writes an `edit_attributes` name starting with `_COMPOSITE_RENAMED_`, which is Galaxy's internal generated prefix. No real test does that. A position-based alternative (drop `edit_attributes[0]` when `composite_data` is present) would couple the comparison to the parser's insertion order, and I don't think that's worth it on a release branch.

Tests: the 3 suites pass, 155 passed, 1 skipped. mypy on `case.py` is clean.

<details><summary>Raw output</summary>

1. "Identical collections containing composite datasets are rejected" (case.py:657, certain): a profile 25.1 `data_collection` param `input` specified twice with an identical `<collection type="list"><element ... ftype="velvet"><composite_data value="Sequences"/></element></collection>` gives 'Ambiguous test parameter (input)' and error=True.
2. "Explicit conflicting renames are ignored when they use the composite prefix" (case.py:661, certain): explicit name edits `_COMPOSITE_RENAMED_first` vs `_COMPOSITE_RENAMED_second` raise no error, and only the second rename is kept.

Coverage notes: reviewed case.py, visitor.py, parser util/xml/interface, verify parse/interactor, linters/tests.py, tools/__init__.py and the tests. The sandbox blocked running the linter tests.
</details>
