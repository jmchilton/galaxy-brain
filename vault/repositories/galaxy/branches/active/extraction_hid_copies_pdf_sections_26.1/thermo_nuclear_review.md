Run via Claude Opus 5.5 at high effort.

# Thermo-nuclear review: extraction_hid_copies_pdf_sections_26.1

**Top line:** I acted on one finding. `IdKey` spelled out `Literal["dataset", "collection"]`, and `InputKind` redeclared the same literal about 550 lines further down. `InputKind` is now defined once, next to `IdKey`, and `IdKey = tuple[InputKind, int]`, the same shape as #24225's `ContentRef = tuple[ContentKind, int]`. This is a typing-only change. I folded it into the extraction commit with fixup plus autosquash.

Everything else the prompt flags sits in hunks that match the 26.2 shape. That shape is `extract_next_followups` (#24225). It isn't on `origin/release_26.2` yet: none of the helpers or `ContentRef` exist there today. The flagged items are:
- two grouping functions and two group dataclasses
- positional `_INPUT_FIELDS` tuples
- `assoc: Any`
- `or` versus `is not None` for default names
- multi-line docstrings

I declined all of these. Editing them would turn a clean merge-forward into a conflict, or would pull 26.1 away from the code it merges into. The structural ideas are worth doing, but upstream on `dev`/26.2 first. I found no correctness bugs and nothing security-sensitive.

Autosquash ran against a freshly fetched `origin/release_26.1` (`19281d57645`). That fetch moved the branch base forward 12 upstream commits, from `b174bd75077`. It rebased cleanly. `range-diff` shows commits 1, 2 and 4 unchanged, and commit 3 differs only by the fixup. Baseline is still first. New head: `c95d91a4995`. Needs a force-push.

## Not acted on

- **Unify input-step building across the hid and by-ids paths** (code judo). Both paths could share one `InputGroup` type and one `_input_steps(groups)` builder, which would delete the two hid loops and the `HidInputGroup` near-twin. Deferred: it restructures `extract.py` away from #24225, so do it on dev/26.2 first.
- **`_INPUT_FIELDS` / `_HID_INPUT_FIELDS`, string tuples keyed by position.** Only the ids field differs, so passing that one name would delete both dicts. Declined: identical to #24225.
- **Name validation split across layers.** `_validate_parallel_names` lives in the service; copy-name consistency lives in `extract.py`. Declined: identical to #24225, and the legacy `POST /api/workflows` `from_history_id` path never sends names, so there's no gap.
- **`_invocation_section(assoc: Any)`** could take a typed union of the four invocation association classes. Declined: byte-identical to #24225, so `markdown_util.py` merges forward clean.
- **`group.name or "Input Dataset"` (by-ids) vs `is not None` (hid path).** By-ids now turns an empty-string name into the default label, where base kept `""`. The change is minor and arguably better. Declined: #24225 has the same split.
- **Multi-line docstrings** on `_invocation_section`, `_unconverted`, `HidInputGroup` and `group_inputs_by_original`. Declined: identical to #24225, and trimming them makes merge conflicts.
- **`hasattr(assoc, "dataset")` and `_original_key`'s `cast` on `history_content_type`.** Duck typing, but it was already there before this branch and it's the same as #24225's `original_content_ref`. Declined.
- **`histories.py` widened `except` inline**, where #24225 extracts a `tool_for_job` helper. Declined: there's one caller on 26.1, and a helper would be a new abstraction on a release branch.
- **Repeated `if name not in step_labels` label dedup** (three sites). This pattern was already there before the branch. Deferred to dev.
- **Test helpers `_run_user_tool` / `_run_user_tool_in_published_history`.** One caller each, so it's a two-layer wrapper. Declined: matches #24225, so test merge-forward stays clean.

## Checked, not findings

- Removed `WorkflowSummary` members (`hid()`, `collection_types`, `hda_hid_in_history`, `hdca_hid_in_history`) have no other users in `lib/`, `templates/`, `client/src`, `test/` or `lib/galaxy_test`. The attributes of `summarize()`'s result change on a release branch, the same as #24225.
- `int | None` in the test mixin is fine. `requires-python = ">=3.10"` on release_26.1.
- File size: `extract.py` goes from 832 to 893 lines, still under 1k. `markdown_util.py` was already 1438 and shrinks by 28.
- `get_hda_by_hid` / `get_hdca_by_hid` don't filter out deleted items. The hid path's `None` group only covers a hid that has no content at all, which matches base, where the step was created but nothing could wire to it.
- Security: the `histories.py` change turns a whole-summary 403 into a per-row flag on a history the viewer can already access. Nothing sensitive, so no report.

## Tests

- Unit: `test_markdown_export.py` and `test_workflow_markdown.py`, 40 passed on the new head. The wider `test/unit/workflows -k "extract or markdown"` run had 51 passed before the rebase.
- `ruff check`, `black --check` and `mypy` on `lib/galaxy/workflow/extract.py`: clean.
- API `lib/galaxy_test/api/test_workflow_extraction.py`, single process on port 8783: 62 passed, 1 skipped on head `c95d91a4995`. That matches the run before the review. The skip is the existing unconditional `SkipTest`.

<details>
<summary>Full review</summary>

### Verdict

The branch doesn't make the codebase messier. Overall it deletes concepts. The hid path's private keying (`summary.hid()`, two hid maps, `collection_types`, and the "hid outside current history" warning branches) becomes a single "key by original" model shared with the by-ids path. That's the right move: the hid path stops being a parallel universe. `markdown_util.py` collapses two copies of a 4-way if/else into one `_invocation_section`. The service adds one validation helper and calls it from both endpoints, rather than scattering checks. No file crosses 1k lines.

The prompt pushes for further restructuring than this, and most of it is real. All of it lands in code that has to stay textually identical to #24225 (`extract_next_followups`), so on this release backport it's deferred, not fixed.

### 1. Missed code judo: two group types, two input-step builders

`group_inputs_by_original` returns `InputGroup(key, content, name)`. `group_hid_inputs_by_original` returns `HidInputGroup(Optional[key], Optional[content], name)`. These are the same concept. The hid variant only adds a "dataset hid not found" hole, and it differs in how it resolves an id to content.

Then `extract_steps` builds input steps in two loops, one for datasets and one for collections, each repeating the label-dedup block. `extract_steps_by_ids` builds them in one loop that branches on `group.key[0]`. A single resolver-agnostic grouping function, taking a `resolve(i) -> Optional[HistoryItem]` callable and the ids field name, plus one `_input_steps(groups, step_labels) -> list[(step, key)]`, would delete:
- `HidInputGroup`
- one of the two grouping bodies
- `_HID_INPUT_FIELDS`
- the two hid loops

That's roughly 40 lines and one concept. **Deferred**: it changes the shape #24225 merges into. Propose it on dev.

### 2. Stringly-typed field config

`_INPUT_FIELDS` / `_HID_INPUT_FIELDS: dict[InputKind, tuple[str, str, str]]` is a positional triple that `_copies_named_differently` unpacks. The names field and noun depend only on kind, and the ids field depends only on the endpoint. Passing `ids_field: str` and deriving the rest from kind deletes both dicts. **Declined** (matches #24225).

### 3. Validation split between layers

The rule "names are parallel to ids" is checked in `services/workflows.py` (`_validate_parallel_names`). The rule "copies share a name" is checked inside `extract.py` grouping. The grouping docstring then has to restate the service invariant ("``names`` is empty or parallel"). The canonical layer would be one place, either the pydantic payload model validator or the grouping function. **Declined** (matches #24225). Verified that the legacy `from_history_id` path never passes names, so it isn't exposed.

### 4. Type boundary: duplicate literal (ACTED)

`IdKey = tuple[Literal["dataset", "collection"], int]` at the top, and `InputKind = Literal["dataset", "collection"]` declared again mid-file. Two spellings of one contract that can drift apart. Fixed: `InputKind` is declared once next to `IdKey`, and `IdKey = tuple[InputKind, int]`.

### 5. `assoc: Any` in `_invocation_section`

The function dispatches on `assoc.history_content_type` and reaches `.dataset` / `.dataset_collection`. A `Union` of the invocation input/output association classes would make the contract explicit. **Declined**: `markdown_util.py` is byte-identical to #24225 here, so merge-forward is clean, and a type-only edit would break that.

### 6. Default-name inconsistency

The hid path uses `group.name if group.name is not None else "Input Dataset"`. The by-ids path uses `group.name or "Input Dataset"`. One file, two rules for the same thing. By-ids also quietly changed `""` → default (base kept `""`). **Declined** (#24225 identical). Worth picking one rule on dev.

### 7. Duck typing and casts

`elif hasattr(assoc, "dataset")` in `extract_steps`, and `_original_key`'s `cast` keyed on `history_content_type`. Both are the same as #24225 and partly predate this branch. Not worth diverging on a release branch.

### 8. `histories.py`

Widening the `except` tuple inline is direct and boring, which is good. #24225 extracts `tool_for_job`, but on 26.1 there's a single caller, so a helper here would be a wrapper. Fine as is.

### 9. Tests

- Helpers moved into `_ExtractionHelpersMixin` (`_extract_by_ids[_raw]`, `_extract_from_history_raw`, `_get_extraction_summary`, `_row_with_output_id`, `_source_step_id`, `_assert_single_input_single_tool`) reduce duplication. That's the right direction.
- `_run_user_tool_in_published_history` → `_run_user_tool` is two single-use layers. Collapsing them would be cleaner, but they match #24225.
- `copy_library_dataset` on the populator earns its keep: there are other inline sites in the API tests.

### 10. Size / layout

`extract.py` goes from 832 to 893 lines, under 1k. The new grouping helpers are placed between `extract_workflow_by_ids` and `extract_steps_by_ids`, which is the same place as #24225. No decomposition is needed for this backport.

</details>
