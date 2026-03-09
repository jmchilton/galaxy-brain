# Plan: Review Spec for Typos and Inaccuracies

## Overview

28 total issues identified across 7 categories in the hand-written collection semantics specification.

## Category 1: Grammar and Typos in Prose (5 issues) -- DONE

| # | Line | Current | Fix | Status |
|---|------|---------|-----|--------|
| 1.1 | 12 | "Typically, this explicitly annotated" | "Typically, this **is** explicitly annotated" | DONE |
| 1.2 | 184 | "referred to a \"reduction\"" | "referred to **as** a \"reduction\"" | DONE |
| 1.3 | 557 | "Due only implementation time" | "Due only **to** implementation time" | DONE |
| 1.4 | 359 | "as describe above" | "as describe**d** above" | DONE |
| 1.5 | 440 | "This inverse of this" | "**The** inverse of this" | DONE |

## Category 2: Swapped/Incorrect Test References (3 issues) -- DONE

### 2.1: Swapped paired/unpaired test refs -- DONE
- `BASIC_MAPPING_PAIRED_OR_UNPAIRED_PAIRED` (line 59, paired case) references `..._unpaired`
- `BASIC_MAPPING_PAIRED_OR_UNPAIRED_UNPAIRED` (line 74, unpaired case) references `..._paired`
- **Fix:** Swap the `api_test` values

### 2.2: Duplicated path in `LIST_REDUCTION` -- DONE
- Line 303: `"test_tools.py::TestToolsApi::test_tools.py::test_reduce_collections"`
- **Fix:** `"test_tools.py::TestToolsApi::test_reduce_collections"`

### 2.3: `wf_editor` field name instead of `workflow_editor` -- DONE
- Line 45: `wf_editor: "accepts paired data -> data connection"`
- Pydantic v2 silently drops unknown fields - reference completely lost
- **Fix:** `workflow_editor: "accepts paired data -> data connection"`

## Category 3: Bracket Mismatches in `then` Expressions (4 issues) -- DONE

| # | Line | Label | Issue | Status |
|---|------|-------|-------|--------|
| 3.1 | 86 | `BASIC_MAPPING_LIST` | Stray `]` -- `[o]]` should be `[o]` | DONE |
| 3.2 | 171 | `BASIC_MAPPING_TWO_INPUTS_WITH_IDENTICAL_STRUCTURE` | Same stray `]` | DONE |
| 3.3 | 532 | `MAPPING_LIST_OVER_PAIRED_OR_UNPAIRED` | Same stray `]` | DONE |
| 3.4 | 374 | `NESTED_LIST_REDUCTION` | `on:` floats outside inner braces | DONE |

## Category 4: Dataset Naming Inconsistency (1 issue) -- DONE

- Line 204: `COLLECTION_INPUT_LIST` uses `d1,...,dn` without underscores
- Every other example uses `d_1,...,d_n`; even this example's collection def (line 209) uses underscored form
- **Fix:** `datasets: ["d_1,...,d_n"]`

## Category 5: Notation Inconsistencies in Collection Definitions (5 issues) -- DONE

### 5.1: Mixed `=` vs `:` in element definitions -- DONE
- Line 332: `{forward=d_f, reverse=d_r}` (uses `=`)
- Line 454: `{forward=d_f, reverse: d_r}` (MIXES `=` and `:`)
- **Fix:** Standardize to `:` (YAML colon syntax)

### 5.2: `list:paired` collections with flat (non-nested) elements -- DONE
- Line 391: `C: [list:paired, {forward: d_f, reverse: d_r}]` -- flat
- Should be: `C: ["list:paired", {el1: {forward: d_f, reverse: d_r}}]` (like line 350)
- Same on line 405 for `list:paired_or_unpaired`

### 5.3: `f`/`r` instead of `d_f`/`d_r` -- DONE
- Lines 488, 501: `{forward: f, reverse: r}` but datasets declared as `[d_f, d_r]`

## Category 6: Generator Script Issues (4 issues) -- 6.1/6.2 DONE, 6.3 planned, 6.4 separate

### 6.1: Incomplete `WORDS_TO_TEXTIFY` -- DONE
- Line 120: only `["list", "forward", "reverse", "mapOver"]`
- Missing: `"collection"`, `"dataset"`, `"unpaired"`, `"paired"`, `"inner"`, `"single_datasets"`
- Results in inconsistent LaTeX rendering (some words upright, others math italic)
- **Applied:** Expanded list + placeholder-based handling for `paired`/`unpaired`

### 6.2: `expression_to_latex` doesn't handle `paired_or_unpaired` as compound word -- DONE
- If `paired`/`unpaired` added to `WORDS_TO_TEXTIFY`, the `\text{}` wrapping conflicts with underscore escaping
- **Applied:** Placeholder approach -- replace `paired_or_unpaired` with sentinel, then replace `unpaired`/`paired` individually, then restore sentinel as `\text{paired\_or\_unpaired}`

### 6.3: Examples without `then` silently dropped from docs -- PLANNED
- Line 149: `if entry.example.then:` filters out test-only examples
- 5 examples have tests but no `then` -- completely absent from generated docs
- **Plan:** [COLLECTION_SEMANTICS_PLAN_INCLUDE_TEST_ONLY_EXAMPLES.md](COLLECTION_SEMANTICS_PLAN_INCLUDE_TEST_ONLY_EXAMPLES.md)

### 6.4: `check()` unimplemented -- SEPARATE PLAN
- Lines 168-169: just `pass` with `# todo`
- **Plan:** Covered by [COLLECTION_SEMANTICS_PLAN_VALIDATION.md](COLLECTION_SEMANTICS_PLAN_VALIDATION.md)

## Category 7: Spacing Inconsistencies (2 issues) -- DONE

- ~~Inconsistent spacing around `~>` (trailing space before `}` on some lines)~~
- ~~Inconsistent `collection<type, {` vs `collection<type,{`~~
- **Fix:** Standardized to `collection<type,{...}>}` with no trailing spaces

## Implementation Plan

### Phase 1: Fix YAML spec (High Impact) -- DONE
1. ~~Fix grammar/typos (Findings 1.1-1.5) -- 5 line changes~~
2. ~~Fix swapped/incorrect test refs (Findings 2.1-2.3) -- 3 changes~~
3. ~~Fix bracket mismatches (Findings 3.1-3.4) -- 4 line changes~~
4. ~~Fix dataset naming (Finding 4.1) -- 1 line change~~
5. ~~Fix notation inconsistencies (Findings 5.1-5.3) -- ~6 line changes~~
6. ~~Normalize spacing (Findings 7.1-7.2) -- cosmetic pass~~

### Phase 2: Fix generator script (Medium Impact) -- MOSTLY DONE
7. ~~Expand `WORDS_TO_TEXTIFY` (Finding 6.1)~~
8. ~~Handle `paired_or_unpaired` compound word (Finding 6.2)~~
9. Include test-only examples in docs (Finding 6.3) -- see [separate plan](COLLECTION_SEMANTICS_PLAN_INCLUDE_TEST_ONLY_EXAMPLES.md)

### Phase 3: Regenerate and Verify -- TODO
10. Run `semantics.py` to regenerate docs
11. Visual inspect generated Markdown
12. Build docs locally to confirm LaTeX renders

## Testing Strategy

- **Red-to-green:** Before fixing YAML issues, implement checks that catch them, then fix
- Set `ExampleTests` Pydantic model to `extra='forbid'` to catch `wf_editor`-style typos immediately
- Bracket-matching and test-reference validation catch most issues

## Critical Files

| File | Role |
|------|------|
| `lib/galaxy/model/dataset_collections/types/collection_semantics.yml` | Primary target: all 20+ YAML issues |
| `lib/galaxy/model/dataset_collections/types/semantics.py` | Generator script fixes |
| `doc/source/dev/collection_semantics.md` | Regenerate after fixes |
| `lib/galaxy_test/api/test_tool_execute.py` | Verify swapped test refs |
| `lib/galaxy_test/api/test_tools.py` | Verify duplicated path ref |

## Unresolved Questions

1. ~~Swapped test refs (2.1) -- verify actual test implementations or trust function names?~~ Fixed by swapping.
2. ~~`WORDS_TO_TEXTIFY` -- textify ALL identifier words or curated subset?~~ Applied curated expansion + placeholder approach.
3. ~~Examples without `then` -- render differently (no math block) or add `then` to each?~~ Separate plan recommends adding `then` to each.
4. `check()` implementation -- part of this PR or separate? (Separate plan exists)
5. `ExampleTests` model -- set `extra='forbid'` or keep silent dropping?
