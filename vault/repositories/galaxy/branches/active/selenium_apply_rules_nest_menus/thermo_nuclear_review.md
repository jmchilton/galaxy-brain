# Thermo-nuclear review: selenium_apply_rules_nest_menus (round 2, after re-scope)

**Coordinator:** I made one change, to `assert_rule_builder_source`, the new shared API on this branch:
- Renamed `rules` to `source`. The argument is the whole builder source, so the old body read `rules["rules"]`. The call sites in example 3 and the nest test bind `source` now too.
- Tightened `source` to `dict[str, Any]` and `expected_mapping` to `list[tuple[str, list[int]]]`. `expected_rules` stays bare `list`: mypy infers the mixed rule-dict literals at the call sites as `list[object]`, so `list[dict[str, Any]]` would have meant annotating every call site.

Fixups went into `d816893cc95` (helper plus examples 3/4) and `0043245ad2f` (nest test). Then autosquash and a force-push. Head `cca6ff1c87a` → `f3017abfe05`, still three commits, baseline first. Commit 3's tree diff is unchanged. GTN screenshot names and order are untouched, and so are `history_wait_for_new_collection`, navigation.yml and schema.ts. Everything else is recorded below as a dev follow-up, or stays declined.

Not acted on:
- **Commit 3 left three helper idioms (dev follow-up, now the strongest case for it).** Round 1 saw only one outlier. After the re-scope:
  - Five helpers use the target: sort, regex-groups, regex-replacement, basename, remove.
  - Three use raw `find_elements`: concatenate, split, swap.
  - Two mix both inside one function: `add_regex_groups` and `add_regex_replacement` take the column from the target but the radio and regex inputs from `editor_element.find_element`.

  The re-scope swapped one outlier for mixing inside functions. The move that fixes it is still a typed editor handle yielded by `rule_builder_rule_editor`, e.g. `editor.select_column(label, index=0)` and `editor.input(...)`. It covers all ten helpers, the indexed two-selector case and the radio/regex inputs. On release_26.2 that means rewriting ten helpers, and the proportionality constraint wins.
- **The rule-type literal is repeated in 5 helpers (round 1 counted 1).** Each helper names `rule_type` for both the context manager and the target. A parameterless target isn't safe: `ColumnSelector.vue` (`.rule-column-selector`) is also used by the mapping editors, so the `rule_type` scope matters. A local variable would only be cosmetic. The editor handle above removes the repetition.
- **`test_workbook_mapping.py` `_mapping`/`_assert_mapping` overlaps `assert_rule_builder_source`.** It's mapping-only with per-index asserts, it's in a different file and on a release branch. Consolidate it with the dev follow-up.
- **`rule_editor_column_selector` name vs multi-selector editors**: unchanged from round 1. It's only used for single-selector editors. An indexed form belongs with the follow-up.
- **File size**: `navigates_galaxy.py` is now 3413 lines (net +19 from this branch), `framework.py` 1722 (+10, already over 1k), `test_tool_form.py` 819, `test_uploads.py` 479. Nothing crosses 1k because of this branch. A `rule_builder_*` mixin extraction is a natural dev move.
- **Shared open → select input → edit rules test helper, `history_wait_for_new_collection`, three-phase nest test**: still declined, for the round-1 reasons. The helper is locked byte-identical to `jmchilton/selenium_collection_build_convert`, re-diffed this round.

Verification:
- Baseline commit `74022c11369` alone, examples 3/4:
  - Playwright: 2 passed (96s).
  - Selenium: 2 passed (85s).
- Tip `f3017abfe05`, examples 3/4 plus the nest test:
  - Playwright: 3 passed (115s).
  - Selenium: 3 passed (118s).
- `cd lib && mypy` on the three touched test files reports no errors in them.

<details>
<summary>Full review</summary>

## Scope

`git diff origin/release_26.2...cca6ff1c87a`, 6 files, +120/-10, three commits. This is a fresh pass. Round 1 (`earlier_drafts/1/thermo_nuclear_review.md`) predates commit 3 and `assert_rule_builder_source`, so those get the closest look.

## Approval bar

- **Structural regression:** none. The commit 3 migration is behavior-preserving: the `v-if` renders only the open editor, so the global target hits the same node the editor-scoped lookup did (confirmed in `subagents/rescope_normal_review.md`).
- **Spaghetti growth:** none. No new conditionals.
- **File size:** see above.
- **Wrappers, casts, optionality:** `assert_rule_builder_source` earns its keep. It replaces three copies of an assert pair and keeps the source as the failure message. Its parameter naming and loose types were the gap (finding 2).
- **Canonical reuse:** checked. Every helper the test uses already exists on release_26.2. `rule_builder_rule_editor` is still needed for its exit click on `rule_editor_ok`.

## Findings

### 1. Mixed idioms after the re-scope (record, dev)
See "not acted on". This is the main structural debt in the rule-builder helper family, and the re-scope made it more visible, not less. The partial migration is still a net improvement: five of the eight column lookups go through a named target, and the remaining raw lookups are exactly the cases a plain target can't express (indexed selectors, non-column inputs). Write up the dev follow-up as one editor-handle refactor, not as moving more helpers onto targets one at a time.

### 2. `assert_rule_builder_source` contract (acted)
- The parameter `rules` held the full source, and its body read `rules["rules"]` / `rules["mapping"]`, which misleads on a shared helper. Renamed to `source`.
- Bare `dict`/`list` types hid the `(type, columns)` tuple shape the helper compares against. Tightened `source` and `expected_mapping`. `expected_rules` stays `list` because mypy infers heterogeneous dict literals as `list[object]`.

### 3. Rule-type literal duplication (record)
It is 5x now. There's no safe parameterless target, because `.rule-column-selector` also renders in the mapping editors. The editor handle in finding 1 fixes it.

### 4. Overlap with `test_workbook_mapping.py` (record)
Its private mapping asserts could use the framework helper (or a mapping-only variant). That touches a test this branch doesn't otherwise need, so it goes with the dev follow-up.

### 5. Tests (no action)
- Examples 3/4 pin the full `rules` and `mapping` after the last GTN screenshot, so the screenshot sequence is unchanged.
- The nest test pins the source, the outer and inner identifiers, and the exact map-over hint.
- No sleeps. SmartTarget and `_wait_on` waits throughout.

</details>
