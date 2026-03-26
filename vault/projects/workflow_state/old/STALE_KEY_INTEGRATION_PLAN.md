# Stale Key Categories: CLI Integration Plan

## Goal

Integrate the stale key taxonomy (see STALE_KEY_TAXONOMY.md) into all three CLI tools so they share a common detection/classification layer. Users get smart defaults but can twist knobs per category.

---

## Shared Foundation: `StaleKeyClassifier`

New module or addition to existing code in `workflow_state/`:

```python
class StaleKeyCategory(Enum):
    BOOKKEEPING = "bookkeeping"           # __current_case__, __page__, chromInfo, etc
    STALE_ROOT = "stale-root-keys"        # conditional params leaked to root
    STALE_BRANCH = "stale-branch-data"    # data from inactive conditional branch
    UNKNOWN = "unknown"                   # catch-all: undeclared key not matching other categories
    RUNTIME_LEAK = "runtime-leak"         # __workflow_invocation_uuid__, *|__identifier__

@dataclass
class StaleKey:
    key_path: str           # e.g. "licensed.applications_licensed" or "filter_type"
    category: StaleKeyCategory
    value: Any
    detail: Optional[str]   # e.g. "duplicate of filter.filter_type (values match)" or "from inactive branch 'true'"

def classify_stale_keys(
    step: NativeStepDict,
    parsed_tool: ParsedTool,
) -> list[StaleKey]:
    """Walk tool_state against tool definition, classify every undeclared key."""
```

### Classification waterfall

1. **Runtime leak** — match by key pattern first (no tool def needed): `__workflow_invocation_uuid__` exact, `|__identifier__` suffix
2. **Bookkeeping** — match against `BOOKKEEPING_KEYS` set (already exists in `_walker.py`)
3. **Stale root** — undeclared key at a level where a conditional exists, and the key name matches a test param or branch param of that conditional
4. **Stale branch** — key inside a conditional dict that belongs to a non-active branch (determined by test param value vs branch discriminators)
5. **Unknown** — catch-all: undeclared key at any level that doesn't match categories 1-4 (most commonly tool upgrade residue, but can't be verified without historical tool defs)

### Value divergence detail

For stale root keys (category 2), the `detail` field should include whether the root value matches or diverges from the nested copy:
- `"duplicate of filter.filter_type (values match)"`
- `"duplicate of filter.filter_type (VALUE DIVERGED: root='5', nested='0')"`

### Implementation gap: walker raises, classifier needs to collect

The current walker (`_walker.py`) raises `Exception` on the first unknown key when `check_unknown_keys=True`. The classifier needs to **collect all** unknown keys before classifying them. Options:
1. Add a `collect_unknown_keys` mode to the walker that accumulates instead of raising
2. Implement classification as a separate pass over the state dict independent of the walker

Similarly, `clean.py` has its own independent walk (`_strip_recursive`) that doesn't use `_walker.py`. The classifier either needs to work standalone or `clean.py` needs refactoring to use the shared walker. This is a prerequisite step that may be non-trivial.

---

## CLI Flag Design

### `validate` and `export-format2`: `--allow` / `--deny`

```
--allow CATEGORY [CATEGORY ...]
--deny CATEGORY [CATEGORY ...]
```

Where `CATEGORY` is one of: `bookkeeping`, `stale-root-keys`, `stale-branch-data`, `unknown`, `runtime-leak`, `all`, `none`.

| Tool | `--allow X` means | `--deny X` means |
|------|------------------|-----------------|
| `validate` | Don't count category X as validation failure | Count category X as failure (even if default allows it) |
| `export-format2` | Attempt conversion even if step has category X keys | Skip conversion (fall back to tool_state) if step has category X keys |

### `clean-stale-state`: `--preserve` / `--strip`

The clean tool uses **different flag names** to avoid semantic confusion. "Allow" in the context of stripping keys is ambiguous — does "allow bookkeeping" mean "allow it to exist" (preserve) or "allow stripping it" (strip)? Using `--preserve`/`--strip` is unambiguous:

```
--preserve CATEGORY [CATEGORY ...]
--strip CATEGORY [CATEGORY ...]
```

| `--preserve X` means | `--strip X` means |
|----------------------|-------------------|
| Don't strip category X keys | Strip category X keys (even if default preserves) |

The existing `--strip-bookkeeping` flag is replaced by `--strip bookkeeping`.

### Precedence rules

Explicit flags override defaults. Between `--allow`/`--deny` (or `--preserve`/`--strip`):
- Start with tool-specific defaults
- Apply `--deny` (or `--strip`): adds categories to the denied set
- Apply `--allow` (or `--preserve`): removes categories from the denied set
- `--allow all` resets everything to allowed, then `--deny X` can carve out exceptions
- Conflicting explicit flags for the same category (e.g., `--allow X --deny X`) is an error — print usage and exit

---

## Per-Tool Defaults and Behavior

### `galaxy-workflow-validate`

**Current behavior:** Validates tool_state against tool definition. Undeclared keys cause failure. `--strip-bookkeeping` strips bookkeeping before validation.

**New defaults:**

| Category | Default | Rationale |
|----------|---------|-----------|
| bookkeeping | allowed | Harmless framework keys, always present |
| stale-root-keys | **denied** | Indicates a Galaxy bug; should be visible |
| stale-branch-data | **denied** | Indicates inconsistent state |
| unknown | **denied** | Undeclared key, likely stale |
| runtime-leak | **denied** | Indicates extraction/export bug |

**New output:** Per-step results include categorized stale keys. Allowed categories still appear as INFO (visibility without blocking):

```
Step 1: interproscan ... FAIL
  stale-branch-data: licensed.applications_licensed (from inactive branch "true")
Step 2: cat1 ... OK
  bookkeeping: __current_case__ [allowed]
Step 16: ivar_trim ... FAIL
  stale-root-keys: min_len (duplicate of trimmed_length.min_len, VALUE DIVERGED)
  stale-root-keys: filter_type (duplicate of filter.filter_type, values match)
```

**Usage examples:**
```bash
# Strict: everything except bookkeeping is a failure (default)
galaxy-workflow-validate workflow.ga

# Lenient: only care about branch data and unknown keys
galaxy-workflow-validate workflow.ga --allow stale-root-keys --allow runtime-leak

# Just check for unknown/undeclared keys
galaxy-workflow-validate workflow.ga --allow stale-root-keys --allow stale-branch-data --allow runtime-leak
```

### `galaxy-workflow-export-format2`

**Current behavior:** Attempts conversion per step. Falls back to `tool_state` on any conversion failure. `--strict` makes any failure fatal.

**New defaults:**

| Category | Default | Rationale |
|----------|---------|-----------|
| bookkeeping | allowed | Stripped during conversion anyway |
| stale-root-keys | allowed | Conversion ignores root-level extras |
| stale-branch-data | allowed | Conversion selects active branch, ignores rest |
| unknown | allowed | Conversion walks declared inputs only, ignores extras |
| runtime-leak | allowed | Stripped during conversion |

The export tool is **maximally permissive by default** — it already handles stale keys gracefully because `convert_state_to_format2()` walks only declared inputs. Only `--deny` adds value (opt-in strictness):

```bash
# Default: convert everything possible
galaxy-workflow-export-format2 workflow.ga

# Cautious: skip steps with inconsistent branch data
galaxy-workflow-export-format2 workflow.ga --deny stale-branch-data

# Paranoid: skip any step with any stale keys
galaxy-workflow-export-format2 workflow.ga --deny all --allow bookkeeping
```

When a step is skipped due to `--deny`, it falls back to `tool_state` (same as missing tool behavior) and the summary reports the category.

### `galaxy-workflow-clean-stale-state`

**Current behavior:** Strips keys not in tool definition. `--strip-bookkeeping` also strips bookkeeping keys.

**New defaults:**

| Category | Default | Rationale |
|----------|---------|-----------|
| bookkeeping | **preserved** | Harmless, some tools may depend on them existing |
| stale-root-keys | **stripped** | Bug artifacts |
| stale-branch-data | **stripped** | Inactive branch data |
| unknown | **stripped** | Undeclared key, likely stale |
| runtime-leak | **stripped** | Execution artifacts |

**New output:** Categorized removal report:

```
Step 1: interproscan — 1 key removed
  stale-branch-data: licensed.applications_licensed
Step 16: ivar_trim — 2 keys removed
  stale-root-keys: min_len (VALUE DIVERGED: root='1', nested not present)
  stale-root-keys: filter_type
Step 31: snpeff — 10 keys removed
  stale-root-keys: annotations, chr, csvStats, filterOut, ...
```

**Usage examples:**
```bash
# Default: strip everything except bookkeeping
galaxy-workflow-clean-stale-state workflow.ga --output-template "{path}"

# Also strip bookkeeping (for format2-ready output)
galaxy-workflow-clean-stale-state workflow.ga --strip bookkeeping --output-template "{path}"

# Only strip runtime leaks, preserve everything else
galaxy-workflow-clean-stale-state workflow.ga --preserve all --strip runtime-leak --output-template "{path}"
```

---

## Implementation Plan

### Step 1: `StaleKeyCategory` enum + `StaleKey` dataclass + `StaleKeyPolicy`

New file `stale_keys.py` (or addition to existing module). Contains:
- `StaleKeyCategory` enum
- `StaleKey` dataclass
- `StaleKeyPolicy` with `from_args()` factory and precedence logic

```python
@dataclass
class StaleKeyPolicy:
    allowed: set[StaleKeyCategory]
    denied: set[StaleKeyCategory]

    def is_allowed(self, category: StaleKeyCategory) -> bool:
        return category in self.allowed

    @classmethod
    def for_validate(cls, allow: list[str], deny: list[str]) -> "StaleKeyPolicy": ...

    @classmethod
    def for_export(cls, allow: list[str], deny: list[str]) -> "StaleKeyPolicy": ...

    @classmethod
    def for_clean(cls, preserve: list[str], strip: list[str]) -> "StaleKeyPolicy": ...
```

### Step 2: Shared CLI args in `_cli_common.py`

```python
def add_stale_key_args(parser, mode="validate"):
    """Add stale key category flags. Mode determines flag names."""
    if mode == "clean":
        parser.add_argument("--preserve", nargs="+", metavar="CATEGORY", default=[])
        parser.add_argument("--strip", nargs="+", metavar="CATEGORY", default=[])
    else:
        parser.add_argument("--allow", nargs="+", metavar="CATEGORY", default=[])
        parser.add_argument("--deny", nargs="+", metavar="CATEGORY", default=[])
```

### Step 3: Walker collection mode

Add `collect_unknown_keys` option to `walk_native_state` (or a wrapper) that accumulates unknown keys instead of raising. Returns both the walked result and a list of `(key_path, key_name, value, nesting_context)` tuples for classification.

Alternatively: standalone `collect_undeclared_keys()` function that walks the state dict against the tool definition without using the walker, since the walker's callback model isn't designed for collection.

### Step 4: `classify_stale_keys()` function

Builds on step 3. For each undeclared key, applies the classification waterfall. Returns `list[StaleKey]`.

### Step 5: Integrate into `validate.py`

- Use `add_stale_key_args(parser, mode="validate")`
- After validation, run `classify_stale_keys()` on failures
- Filter results through `StaleKeyPolicy.for_validate()`
- Allowed categories reported as INFO, denied as FAIL
- Categorized output in text/json/markdown reports

### Step 6: Integrate into `export_format2.py`

- Use `add_stale_key_args(parser, mode="export")`
- Before converting each step, optionally run `classify_stale_keys()`
- If any denied categories found, skip conversion for that step
- Report category in per-step status

### Step 7: Integrate into `clean.py`

- Use `add_stale_key_args(parser, mode="clean")`
- Categorize removed keys using `classify_stale_keys()` (may require refactoring `_strip_recursive` or running classification as a separate pass)
- `--strip-bookkeeping` becomes alias for `--strip bookkeeping`

---

## Interaction with `galaxy-workflow-roundtrip-validate`

The roundtrip validator doesn't directly deal with stale keys (it compares before/after states). The existing `--strip-bookkeeping` flag could eventually be extended to other categories, but this is lower priority — the primary use case is `validate` + `clean` + `export`.

---

## Smart Defaults Summary

|  | validate | export-format2 | clean-stale-state |
|--|----------|---------------|-------------------|
| bookkeeping | allow | allow | **preserve** |
| stale-root-keys | **deny** | allow | **strip** |
| stale-branch-data | **deny** | allow | **strip** |
| unknown | **deny** | allow | **strip** |
| runtime-leak | **deny** | allow | **strip** |

**Philosophy:** `validate` is strict by default (report problems), `export` is permissive (convert what you can), `clean` is aggressive (fix problems).

---

## Unresolved Questions

- Should `--allow all` / `--deny all` / `--preserve all` / `--strip all` be supported as shorthands? Leaning yes.
- Should `galaxy-workflow-validate` report allowed categories as INFO in the output? Provides visibility without blocking, but adds noise for common cases like bookkeeping. Could gate on `-v`.
- Implementation of walker collection mode: extend existing walker vs standalone function? The walker's callback model (returns per-leaf) doesn't naturally collect unknown keys at intermediate levels. Standalone may be cleaner.
- Scope of `clean.py` refactoring: `_strip_recursive` is an independent tree-walk. Running classification as a post-strip reporting pass (classify what was removed) may be simpler than integrating classification into the strip walk itself.
