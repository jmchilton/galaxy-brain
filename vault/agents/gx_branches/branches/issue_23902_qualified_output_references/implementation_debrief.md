# issue_23902_qualified_output_references — implementation debrief

Fixes galaxyproject/galaxy#23902. There are two commits on `jmchilton/issue_23902_qualified_output_references` @ `00bbf736a74`. The branch is **stacked on `issue_23891_output_reference_resolver`** (`6d6548ee962`, not yet a PR). It can only open after #23891's branch does, or squashed into it. Both use profile 26.2, so they must land in the same release.

## Decisions (John, 2026-10-06)
- **Profile:** 26.2. Dev's `VERSION_MAJOR` is 26.2, and #23891's 26.2 load error hasn't shipped.
- **Cross-branch resolution is dropped at 26.2.** `cond|input1` no longer reaches `cond|inner_cond|input1` through the alias. This follows the issue's proposal: a load error, plus alias-free runtime lookups.

## What changed
- **Shared rule** in `output_references.py`:
  - `profile_allows_legacy_output_references(profile)` is the single 26.2 cutoff. The tool loader (`Tool.legacy_output_references`) and the format_source linter both use it.
  - `output_reference_problem(..., legacy_aliases)` returns "must be qualified as 'X'" for a legacy-only match. The wording mirrors the `type_source` load error.
  - `ResolvedReference.qualified_keys` holds one entry per match, reindexed to the reference's own repeat index. Suggestions leave out inputs of the wrong type.
- **Tool load:** at 26.2 a legacy-only reference raises `ToolLoadError` through #23891's existing problem path.
- **Runtime:** `determine_output_format(..., legacy_aliases=)` and the `metadata_source` lookup in `DefaultToolAction` use `without_legacy_aliases()` (`wrapped.py`) for 26.2+ tools. `change_format` `input_dataset` and `structured_like` keep the alias.
- **Linter:** at 26.2 the unqualified warning (and the discovered-collection special case) becomes the shared error.
- **XSD:** 26.2 changelog entry, plus `format_source` and `metadata_source` attribute docs. `format_source_in_conditional.xml` comments updated.

## Tests (red → green)
- **Framework tool** `format_source_in_conditional_qualified` (profile 26.2): red before the runtime change (`output1` got `tsv`, expected `data`).
- **`test_actions.py`:** `metadata_source`, `format_source` and `change_format` at 26.1 vs 26.2. Red with the metadata change disabled (columns 5 ≠ 0). It also pins "change_format keeps the alias", which nothing tested before.
- **Unit tests:** the load error (plain, `metadata_source`, repeat reindex), qualified references still load at 26.2, ambiguous suggestions skipping the wrong type and keeping the repeat index, and two linter tests at 26.2.
- **Green:** related unit suites (275) and format_source/metadata_source/output_format framework tests (16).
- **mypy:** run from `lib/` as `make mypy` does. No new errors in the touched files.

## Sweep
No Galaxy tool at profile 26.2 or later uses a legacy reference. Only `format_source_in_conditional.xml` (16.01) and `format_source_legacy_alias_collision.xml` (26.0) do, and they keep working. The external sweep in the #23891 debrief (94 one-level aliases across IUC/bgruening/devteam) covers tools below 26.2, so nothing changes for them.

## Review suggestions not acted on
- **Upgrade advice:** deferred.
  - `lib/galaxy/tool_util/upgrade` only knows profiles up to 24.2. `upgrade_advice_structured_like` (#23884) adds the 26.0 migration in the same two files.
  - Once that lands, add a `26_2_*` must_fix code that covers both #23891's and this branch's load errors.
- **Lint `metadata_source`:** still John's decision (open since #23891). It matters more now: at 26.2 an unqualified `metadata_source` fails loading with no lint error first.
- **Two alias-detection mechanisms:** `type_source` uses `qualify_legacy_data_input_reference` (`tools/parameters/__init__.py`, over `Tool.inputs`) and is separate from `InputReferences`. Possible follow-up to unify them.
