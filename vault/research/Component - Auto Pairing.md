---
type: research
subtype: component
component: auto-pairing
tags:
  - research/component
  - galaxy/collections
  - galaxy/client
status: draft
created: 2026-03-26
revised: 2026-04-22
revision: 2
ai_generated: true
summary: "Automatic forward/reverse read pairing: parallel frontend/backend implementations validated against shared YAML spec"
related_notes:
  - "[[Component - Collection Creation API]]"
  - "[[Component - Collections - Paired or Unpaired]]"
  - "[[Component - Data Fetch]]"
  - "[[PR 19377 - Collection Types and Wizard UI]]"
---

# Auto-Pairing in Galaxy

Auto-pairing is Galaxy's mechanism for automatically matching forward/reverse paired-end sequencing datasets by filename convention. It exists as parallel implementations in the frontend (TypeScript) and backend (Python), both validated against a shared YAML test specification.

## Test Specification Schema

`client/src/components/Collections/auto_pairing_spec.yml` and `lib/galaxy/model/dataset_collections/auto_pairing_spec.yml` are identical YAML files defining expected auto-pairing behavior. Each entry:

```yaml
- doc: Human-readable description of the test case
  inputs:
  - filename_R1.fastq
  - filename_R2.fastq
  paired:
    <expected_pair_name>:
      forward: <forward_filename>
      reverse: <reverse_filename>
```

- `doc` - description
- `inputs` - flat list of filenames to pair
- `paired` - map of pair name -> `{forward, reverse}` filenames

The pair name key (e.g. `input541`) is what the algorithm should derive as the identifier for the paired collection element. Adding a new test case means adding an entry to both YAML files and running both the frontend and backend test suites.

**Frontend tests**: `client/src/components/Collections/pairing.test.ts` - loads the YAML, creates `{name}` objects, calls `autoPairWithCommonFilters()`, asserts pair names and forward/reverse assignments.

**Backend tests**: `test/unit/data/dataset_collections/test_auto_pairing.py` - loads the YAML via `resource_string`, creates `MockDataset` objects, calls `auto_pair()`, asserts the same.

## Filter Patterns

Both implementations define the same `COMMON_FILTERS`:

| Key | Forward | Reverse | Example |
|-----|---------|---------|---------|
| `illumina` | `_1` | `_2` | `sample_1.fastq` / `sample_2.fastq` |
| `Rs` | `_R1` | `_R2` | `sample_R1.fastq` / `sample_R2.fastq` |
| `dot12s` | `.1.fastq` | `.2.fastq` | `sample.1.fastq` / `sample.2.fastq` |

**Filter detection priority**: The `guessInitialFilterType()` function counts how many input filenames contain each pattern. The pattern with the highest count wins; ties default to `illumina`. Detection order matters: `.1.fastq`/`.2.fastq` is checked first (since `_1`/`_2` would also match `.1.fastq` names), then `_R1`/`_R2`, then `_1`/`_2`.

## Frontend Implementation

### Core Algorithm (`client/src/components/Collections/pairing.ts`)

Entry points, from highest to lowest level:

1. **`autoPairWithCommonFilters(elements, willRemoveExtensions)`** - Guesses filter type, splits elements, runs pairing. Returns `{filterType, forwardFilter, reverseFilter, pairs, unpaired}`.

2. **`splitIntoPairedAndUnpaired(elements, forwardFilter, reverseFilter, willRemoveExtensions)`** - Given explicit filters, splits elements into forward/reverse lists via regex, runs `autoDetectPairs`, returns `AutoPairingResult<T>`. Returns all elements as unpaired if either filter is empty.

3. **`autoDetectPairs(listA, listB, forwardFilter, reverseFilter, willRemoveExtensions)`** - Two-pass matching:
   - **Pass 1** (`matchOnlyIfExact`): After stripping filter strings, only pairs items whose names are identical (score = 1.0, threshold 0.6). Handles the common case where `sample_R1.fastq` and `sample_R2.fastq` become `sample.fastq` and `sample.fastq`.
   - **Pass 2** (`matchOnPercentOfStartingAndEndingLCS`): For remaining unpaired items, uses LCS-based fuzzy matching (threshold 0.99). Handles cases with minor naming variations.

4. **`statelessAutoPairFnBuilder(match, scoreThreshold, ...)`** - Factory that builds a pairing function from a scoring function. Iterates listA, scores each against all of listB, splices out the best match if it exceeds the threshold. The splice prevents double-pairing.

5. **`guessNameForPair(fwd, rev, forwardFilter, reverseFilter, willRemoveExtensions)`** - Generates the pair identifier by stripping filters, computing the LCS of the remaining names, stripping URL prefixes and extensions. Falls back to `fwd_and_rev` if LCS is empty.

6. **`naiveStartingAndEndingLCS(s1, s2)`** - Concatenates the longest common prefix and longest common suffix of two strings. This is not a true LCS but works well for filenames that differ only in a short middle segment (the filter pattern).

### Key Types

```typescript
interface HasName { name: string | null; }
type CommonFiltersType = "illumina" | "Rs" | "dot12s";
type GenericPair<T> = { forward: T; reverse: T; name: string; };
type AutoPairingResult<T> = { pairs: GenericPair<T>[]; unpaired: T[]; forwardFilter: string; reverseFilter: string; };
```

### Vue Composables

**`usePairing.ts` - `useAutoPairing<T>()`**: Top-level composable used by wizard components. Wraps `autoPairWithCommonFilters()` and exposes reactive refs for `pairs`, `unpaired`, `countPaired`, `countUnpaired`, `currentForwardFilter`, `currentReverseFilter`. Provides the `AutoPairing` Vue component reference and an `autoPair(selectedItems)` function.

**`usePairingSummary.ts` - `usePairingSummary<T>(props)`**: Lower-level composable used by `AutoPairing.vue`. Wraps `splitIntoPairedAndUnpaired()` and generates human-readable summary text. Differentiates messaging for `list:paired` (unpaired datasets excluded) vs `list:paired_or_unpaired` (unpaired datasets included).

### Vue Components

**`AutoPairing.vue`** - The auto-pairing UI panel. Displays filter controls, auto-matched pairs list, and unmatched datasets. Operates in two modes:
- `wizard` mode: step in the `ListWizard` flow, "next" button advances
- `modal` mode: dialog with "Apply Auto Pairing" / "Cancel" buttons, used by `PairedOrUnpairedListCollectionCreator`

Props: `elements`, `collectionType`, `forwardFilter`, `reverseFilter`, `removeExtensions`, `extensions`, `mode`, `showHid`

Emits: `on-apply`, `on-update`, `on-cancel`

**`PairingFilterInputGroup.vue`** - Dropdown + two text inputs for selecting/customizing forward and reverse filter patterns. The dropdown offers the three `COMMON_FILTERS` presets plus a "Clear All Filtering" option. Custom regex can be typed directly into the inputs.

**`PairedOrUnpairedListCollectionCreator.vue`** - The main collection builder for `list:paired` and `list:paired_or_unpaired` types. Uses AG Grid to display paired and unpaired datasets. Supports manual pairing via click/drag, pair swapping, unpairing. Integrates auto-pairing as initial state.

**`PairedDatasetCellComponent.vue`** - AG Grid cell renderer for paired datasets. Shows forward/reverse indicators, swap/unpair/pair actions.

### Extension Stripping (`stripExtension.ts`)

When `removeExtensions` is enabled, identifiers are stripped of file extensions before display. Handles compound extensions (`.fastq.gz`, `.fastq.bz2`) by first removing secondary extensions (`.gz`, `.bz2`, `.tgz`, `.crai`, `.bai`), then the primary extension. The `useUpdateIdentifiersForRemoveExtensions` composable manages toggling this on/off while preserving user edits.

### Integration Points

**`ListWizard.vue`**: Uses `useAutoPairing()` to auto-pair on initialization. Uses pair count to infer builder type (`list` vs `list:paired`). The auto-pairing step appears as a wizard page.

**`SampleSheetWizard.vue`**: Same pattern, extended to sample sheet workflows with URI-based elements.

## Backend Implementation

### Core Module (`lib/galaxy/model/dataset_collections/auto_pairing.py`)

Simpler than the frontend - uses only exact matching (no LCS fuzzy pass).

**`auto_pair(elements) -> AutoPairResponse[T]`**: Guesses filter type, splits elements, builds a `PartialPair` dict keyed by base name (filter stripped, extensions stripped via `filename_to_element_identifier`). Matches forward/reverse by identical base name. Elements that don't pair up go to `unpaired`.

**`paired_element_list_identifier(forward, reverse) -> str`**: Generates pair name from two filenames. Used by workbook/fetch integration to auto-label pairs.

**`longest_prefix(s1, s2)`**: Simple common prefix (not LCS like frontend).

### Data Structures

```python
@dataclass
class Pair(Generic[T]):
    name: str
    forward: T
    reverse: T

@dataclass
class AutoPairResponse(Generic[T]):
    paired: list[Pair[T]]
    unpaired: list[T]
```

### Collection Types

**`lib/galaxy/model/dataset_collections/types/paired.py`** - `PairedDatasetCollectionType`: Collection with exactly two elements using identifiers `"forward"` and `"reverse"`.

**`lib/galaxy/model/dataset_collections/types/paired_or_unpaired.py`** - `PairedOrUnpairedDatasetCollectionType`: Collection with 1-2 elements. If 2, uses `"forward"`/`"reverse"` identifiers. If 1, uses `"unpaired"` identifier.

### Workbook Integration (`lib/galaxy/tools/fetch/workbooks.py`)

`_split_paired_data_if_needed()` detects when workbook imports have two URI columns (paired data). Uses `paired_element_list_identifier()` to auto-generate pair names from the URLs.

### Auto-Identifiers (`lib/galaxy/model/dataset_collections/auto_identifiers.py`)

`filename_to_element_identifier(filename_or_uri)` extracts base filenames and strips compression extensions. Used by the backend pairing code to normalize names before matching.

## Adding a New Filter Pattern

1. Add the pattern to `COMMON_FILTERS` in both:
   - `client/src/components/Collections/pairing.ts`
   - `lib/galaxy/model/dataset_collections/auto_pairing.py`

2. Update `guessInitialFilterType()` in both files to count/detect the new pattern. Consider detection priority (more specific patterns should be checked before less specific ones to avoid false matches).

3. Add test cases to both `auto_pairing_spec.yml` files.

4. Run tests:
   - Frontend: `npx vitest run client/src/components/Collections/pairing.test.ts`
   - Backend: `pytest test/unit/data/dataset_collections/test_auto_pairing.py`

5. The `PairingFilterInputGroup.vue` dropdown automatically picks up new `COMMON_FILTERS` entries.

## Adding a New Test Case

Add an entry to both YAML spec files with the same content:
- `client/src/components/Collections/auto_pairing_spec.yml`
- `lib/galaxy/model/dataset_collections/auto_pairing_spec.yml`

Both test runners iterate all spec entries, so no test code changes needed.

## Data Flow Summary

```
User selects datasets in history
  -> ListWizard / SampleSheetWizard calls useAutoPairing().autoPair()
    -> autoPairWithCommonFilters() guesses filter, splits, pairs
      -> guessInitialFilterType() counts pattern occurrences
      -> splitElementsByFilter() divides into forward/reverse lists
      -> autoDetectPairs() runs exact match then LCS match
        -> guessNameForPair() generates pair identifier via LCS
  -> AutoPairing.vue displays results, user adjusts filters
  -> PairedOrUnpairedListCollectionCreator shows AG Grid table
    -> User can manually pair/unpair/swap, edit identifiers
  -> Collection creation payload sent to API
    -> Backend DatasetCollectionManager.create() builds collection
      -> PairedDatasetCollectionType or PairedOrUnpairedDatasetCollectionType
         generates DatasetCollectionElements with forward/reverse/unpaired identifiers
```

## Frontend vs Backend Differences

| Aspect | Frontend (TS) | Backend (Python) |
|--------|--------------|-----------------|
| Matching strategy | Two-pass: exact then LCS fuzzy | Single pass: exact only |
| Name generation | LCS (prefix + suffix concat) | Longest common prefix only |
| Extension handling | `stripExtension()` with toggle | `filename_to_element_identifier()` |
| Used by | Collection builder UI | Workbook/fetch imports, API |

The frontend is more sophisticated because it handles interactive use cases where users may have inconsistently named files. The backend handles programmatic cases where filenames tend to be more regular.
