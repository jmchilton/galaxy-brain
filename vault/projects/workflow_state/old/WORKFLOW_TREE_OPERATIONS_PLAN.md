# Plan: Workflow Tree Operations (Validate + Clean at Scale)

## Motivation

We vendor 11 IWC workflows in `test/unit/workflows/iwc/` — this doesn't scale and drifts. A local IWC clone exists at `~/projects/repositories/iwc/` with 115 .ga workflows across 23 categories. We need CLI tooling that:

1. Points at an arbitrary directory of workflows (IWC or otherwise) via CLI arg
2. Validates all workflows, produces a Markdown summary report
3. Cleans stale state from all workflows, produces a Markdown report, with modes for dry-run / in-place / adjacent copy

Both operations reuse existing `galaxy-workflow-validate` and `galaxy-workflow-clean-stale-state` plumbing.

---

## Phase A: Shared Directory Walking Infrastructure

### A.1: `workflow_tree.py` — directory scanner

New module `lib/galaxy/tool_util/workflow_state/workflow_tree.py`.

Follow patterns from `lib/galaxy/tool_util/loader_directory.py`:

- **`os.walk()` with in-place dir exclusion** — `dirnames[:] = [d for d in dirnames if d not in EXCLUDE_WALK_DIRS]` to skip `.git`, `.hg`, `.venv`
- **Extension-based filtering** — `.ga` for native, `.gxwf.yml`/`.gxwf.yaml` for format2
- **Content validation before full parse** — read first 5KB, check for `"steps"` (native JSON) or `class: GalaxyWorkflow` (format2 YAML) to reject non-workflow files that happen to match extensions
- **Error-tolerant loading** — capture parse failures per-workflow (like `TOOL_LOAD_ERROR` sentinel) rather than aborting the tree

```python
def discover_workflows(root: str, include_format2: bool = True) -> List[WorkflowInfo]
```

- Return `WorkflowInfo(path, relative_path, category, format)` for each
- `category` = first parent directory name relative to root (e.g. `"imaging"`, `"transcriptomics"`)
- Sort by relative path for deterministic output

### A.2: URI resolution for workflows

Follow `ToolLocationFetcher` pattern from `lib/galaxy/tool_util/fetcher.py` — abstract path vs URI so tree commands can transparently handle:
- Local directories of `.ga` files
- Remote workflow sources (Dockstore, TRS endpoints, plain URLs)
- Format2 `run: https://...` subworkflow references during validation

Not needed for the initial local-directory implementation, but design `discover_workflows` so it can be extended with URI resolvers later (accept a path-or-URI, resolve to local before scanning).

### A.3: Shared Markdown report builder

### A.2: Shared Markdown report builder

Helper for generating Markdown tables:

```python
@dataclass
class WorkflowReport:
    sections: List[ReportSection]  # one per category/subdirectory

def render_markdown(report: WorkflowReport) -> str
```

Common columns: workflow name, relative path, status, details. Each operation (validate, clean) adds its own columns.

---

## Phase B: `galaxy-workflow-validate-tree`

New CLI or subcommand that validates all workflows in a directory.

### B.1: Core function

```python
def validate_tree(
    root: str,
    get_tool_info: GetToolInfo,
    populate_cache: bool = False,
    source: str = "auto",
) -> TreeValidationReport
```

- Discover all workflows under `root`
- Populate cache for all tools across all workflows (deduplicated) if `--populate-cache`
- Validate each workflow via `validate_workflow_cli()`
- Aggregate results per workflow and per category (subdirectory)

### B.2: TreeValidationReport

```python
@dataclass
class WorkflowValidationResult:
    path: str
    relative_path: str
    category: str  # parent directory name
    step_results: List[StepResult]
    error: Optional[str]  # if workflow itself failed to load

@dataclass
class TreeValidationReport:
    results: List[WorkflowValidationResult]

    @property
    def summary(self) -> dict  # ok/fail/skip/error counts

    def by_category(self) -> Dict[str, List[WorkflowValidationResult]]
```

### B.3: Markdown output

```markdown
# Workflow Validation Report

Generated: 2026-03-11 | Root: ~/projects/repositories/iwc/workflows
Summary: 87 OK, 15 FAIL, 8 SKIP, 5 ERROR

## amplicon (3 workflows)

| Workflow | Steps | OK | Fail | Skip | Details |
|----------|-------|----|------|------|---------|
| amplicon-wf.ga | 12 | 10 | 1 | 1 | Step 5: Invalid select option |

## transcriptomics (8 workflows)
...

## Failure Details

### amplicon/amplicon-wf.ga
- Step 5 (tool_id 1.2.3): Invalid select option found "bad_value"
```

### B.4: CLI interface

```
galaxy-workflow-validate-tree ROOT [--populate-cache] [--source api|auto]
    [--cache-dir DIR] [--output report.md] [--json] [--strict] [-v]
```

Or extend existing `galaxy-workflow-validate` to accept directories:

```
galaxy-workflow-validate WORKFLOW_OR_DIR [--recursive] ...
```

**Decision:** Prefer extending existing CLI with `--recursive` flag. If path is a directory, discover and validate all workflows. Default output becomes the Markdown report.

### B.5: Entry point

Add to `setup.cfg` only if new CLI; otherwise reuse existing `galaxy-workflow-validate`.

---

## Phase C: `galaxy-workflow-clean-stale-state-tree`

Extends stale-state cleaning to operate on a directory tree.

### C.1: Core function

```python
def clean_tree(
    root: str,
    get_tool_info: GetToolInfo,
    mode: Literal["dry-run", "in-place", "adjacent"],
    populate_cache: bool = False,
    source: str = "auto",
) -> TreeCleanReport
```

- Discover all .ga workflows under `root`
- Populate cache (deduplicated) if requested
- Clean each workflow via `clean_stale_state()`
- Three output modes:
  - `dry-run`: report only, no file changes
  - `in-place`: overwrite original files
  - `adjacent`: write cleaned copy as `WORKFLOW.cleaned.ga` next to original

### C.2: TreeCleanReport

```python
@dataclass
class WorkflowCleanResult:
    path: str
    relative_path: str
    category: str
    step_results: List[StepCleanResult]
    total_removed: int
    error: Optional[str]  # if workflow failed to load or tool lookup failed

@dataclass
class TreeCleanReport:
    results: List[WorkflowCleanResult]
    mode: str

    @property
    def summary(self) -> dict  # total keys removed, workflows affected, etc.

    def by_category(self) -> Dict[str, List[WorkflowCleanResult]]
```

### C.3: Markdown output

```markdown
# Stale State Cleaning Report

Generated: 2026-03-11 | Root: ~/projects/repositories/iwc/workflows
Mode: dry-run | Summary: 23 stale keys across 8 workflows (of 115 total)

## Affected Workflows

| Workflow | Steps Affected | Keys Removed | Details |
|----------|---------------|--------------|---------|
| imaging/segmentation-and-counting.ga | 2 | 4 | Step 3: stale_param_1, stale_param_2 |
| variant-calling/pe-artic-variation.ga | 1 | 2 | Step 7: old_setting |

## Clean Workflows (107)

All other workflows have no stale keys.

## Per-Workflow Details

### imaging/segmentation-and-counting.ga
- Step 3 (tool_id x.y.z 1.0): Removed `stale_param_1`, `stale_param_2`
- Step 7 (tool_id a.b.c 2.1): Removed `old_flag`, `deprecated_option`
```

### C.4: CLI interface

Extend existing `galaxy-workflow-clean-stale-state`:

```
galaxy-workflow-clean-stale-state WORKFLOW_OR_DIR [--recursive]
    [--mode dry-run|in-place|adjacent] [--report report.md]
    [--populate-cache] [--source api|auto] [--cache-dir DIR] [-v]
```

When `WORKFLOW_OR_DIR` is a directory and `--recursive` is set:
- Default mode: `dry-run` (safe)
- `--report FILE`: write Markdown report to file
- Without `--report`: print report to stdout
- Single-file behavior unchanged (backwards compatible)

---

## Phase D: Bulk Cache Population

### D.1: Deduplicated cache population across a tree

```python
def populate_cache_for_tree(
    root: str,
    tool_info: ToolShedGetToolInfo,
    source: str = "auto",
) -> Tuple[int, int]  # (ok, fail)
```

- Discover all workflows, extract all tools (deduplicated across entire tree)
- Single pass through all unique (tool_id, version) pairs
- Report: "Found 342 unique tools across 115 workflows, cached 318, failed 24"
- This is the first step before validate-tree or clean-tree

### D.2: CLI integration

Both tree commands get `--populate-cache` which calls `populate_cache_for_tree()` before processing.

Could also extend `galaxy-tool-cache populate-workflow` to accept directories:

```
galaxy-tool-cache populate-workflow WORKFLOW_OR_DIR [--recursive]
```

---

## Implementation Order

| Step | What | Depends On | Tests |
|------|------|------------|-------|
| A.1 | `workflow_tree.py` — discover_workflows | — | Unit: finds .ga files, handles nested dirs, sorts |
| A.2 | Markdown report builder | — | Unit: renders tables, handles empty sections |
| B.1-B.3 | validate-tree core + report | A.1, A.2 | Integration: run on vendored IWC, check report |
| B.4 | CLI --recursive for galaxy-workflow-validate | B.1 | CLI: directory arg produces report |
| C.1-C.3 | clean-tree core + report | A.1, A.2 | Integration: run on vendored IWC, check report |
| C.4 | CLI --recursive for galaxy-workflow-clean-stale-state | C.1 | CLI: all three modes work |
| D.1-D.2 | Bulk cache population | A.1 | Integration: deduplicates across tree |

**Parallelism:** B and C can be built in parallel after A. D can follow independently.

**Red-to-green approach:**
- A: Write test that discovers vendored IWC workflows → implement discover_workflows
- B: Write test that validates tree and checks report structure → implement validate-tree
- C: Write test that cleans tree and checks report structure → implement clean-tree
- D: Write test that populates cache for tree → implement populate_cache_for_tree

---

## Unresolved Questions

1. Extend existing CLIs with `--recursive` or create new `galaxy-workflow-validate-tree` / `galaxy-workflow-clean-stale-state-tree` entry points? Leaning toward extending existing.
2. Adjacent copy naming: `WORKFLOW.cleaned.ga` or `WORKFLOW.ga.cleaned`? Former is still a valid .ga file.
3. Should the Markdown report include a diff section for clean-stale-state (inline unified diffs per workflow)?
4. Should `discover_workflows` also find `.gxwf.yml` files? Clean-stale-state is native-only, but validate handles both formats.
5. Cache population across 115 workflows will hit many ToolShed API calls — need rate limiting or is current sequential approach sufficient?
