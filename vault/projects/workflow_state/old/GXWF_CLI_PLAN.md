# gxwf Unified Python CLI — Implementation Plan

**Goal:** Create a single `gxwf` console_script for Python that mirrors the TypeScript `gxwf` CLI structure — unified subcommand gateway replacing the current 12 standalone `gxwf-*` scripts. Also optionally absorb the gxformat2 pass-through commands (`gxwf-viz`, `gxwf-abstract-export`, `gxwf-mermaid`) under the same umbrella.

**Branch/Package:** `wf_tool_state`, `packages/tool_util/` in galaxy-tool-util

---

## Current State

| What exists | Description |
|---|---|
| 12 `gxwf-*` console_scripts | Individual scripts in `scripts/` wired one-per-operation |
| `galaxy-tool-cache` | Separate binary, no change needed |
| `_cli_common.py` | Shared infra: `build_base_parser`, `cli_main`, `ToolCacheOptions` |
| `scripts/*.py` | Each script calls `cli_main(build_parser(), OptionsClass, run_fn)` |

**TypeScript parallel:** `gxwf` with subcommands `validate`, `clean`, `lint`, `convert`, `roundtrip` + `-tree` variants. The TS version uses `commander` with `.command()` — Python equivalent is `argparse.add_subparsers()`.

---

## Target CLI Shape

```
gxwf <subcommand> [options] <path>

Single-file:
  validate         gxwf-state-validate
  clean            gxwf-state-clean
  lint             gxwf-lint-stateful
  convert          gxwf-to-format2-stateful / gxwf-to-native-stateful (unified via --to)
  roundtrip        gxwf-roundtrip-validate

Tree (batch):
  validate-tree    gxwf-state-validate-tree
  clean-tree       gxwf-state-clean-tree
  lint-tree        gxwf-lint-stateful-tree
  convert-tree     gxwf-to-format2-stateful-tree / gxwf-to-native-stateful-tree
  roundtrip-tree   gxwf-roundtrip-validate-tree

gxformat2 pass-through (new):
  viz              gxwf-viz   (Cytoscape HTML/JSON graph)
  abstract-export  gxwf-abstract-export   (abstract CWL export)
  mermaid          gxwf-mermaid   (Mermaid diagram)
```

`galaxy-tool-cache` stays a separate binary (already matches TS structure).

---

## Design Decisions (Resolved)

| Question | Decision |
|---|---|
| Old `gxwf-*` scripts | **Keep as-is** — all 12 stay registered, no deprecation for now |
| `convert` direction detection | **Auto-detect** from extension (`.ga`→format2, `.gxwf.yml`→native); `--to` overrides |
| `galaxy-tool-cache` as `gxwf tool-cache` | **Keep separate** — `galaxy-tool-cache` stays its own binary |
| `gxwf mermaid` passthrough | **Include** — `gxwf-mermaid` exists in the target gxformat2 |

---

## Implementation Design

### 1. Subparser wiring approach

Two options:

**Option A — parse-level delegation:** Each existing `scripts/*.py` exposes a `register_subcommand(subparsers)` function alongside its existing `build_parser()` and `main()`. The unified `gxwf.py` calls `register_subcommand` for each. When the subcommand's handler fires, it calls the existing `run_fn` directly with a pre-parsed `Namespace`.

**Option B — subprocess delegation:** `gxwf validate ...` shells out to `gxwf-state-validate ...`. Zero code change but no integration.

**Recommendation: Option A.** Subprocess delegation is fragile and prevents help parity. Option A requires a small `_cli_common.py` extension but keeps everything in-process and allows the unified `gxwf --help` to show all subcommands.

### 2. convert subcommand (merging two scripts)

Current: `gxwf-to-format2-stateful` and `gxwf-to-native-stateful` are separate.  
Target: `gxwf convert [--to format2|native]` — auto-detects direction from input extension (`.ga` → format2, `.gxwf.yml` → native); `--to` overrides.

This requires a thin new `workflow_convert.py` dispatch shim. See Step 3 below.

### 3. gxformat2 pass-throughs

`gxwf-viz`, `gxwf-abstract-export`, `gxwf-mermaid` live in gxformat2. **Decision: subprocess pass-through.** Call the gxformat2 binary directly with a clear error message if not found. Keeps gxformat2 decoupled, no import-level dependency on internal gxformat2 script APIs.

### 4. Backward compatibility for old `gxwf-*` scripts

**Decision: keep all 12 registered as-is.** No deprecation warnings for now. A cleanup PR can remove them after `gxwf` is adopted.

---

## Implementation Steps

### Step 1: Extend `_cli_common.py` for subparser registration

Add a `register_subparser(subparsers, name, aliases)` helper to `_cli_common.py`. This function:
- Calls the script's existing `build_parser()` to get the parser
- Extracts its description, arguments, and defaults
- Adds them as a new subparser under `name`
- Sets `func` (or `handler`) on the namespace to the `run_fn`

Alternatively, each script module exposes:
```python
SUBCOMMAND = "validate"
SUBCOMMAND_ALIASES = []

def register(sub):
    p = sub.add_parser(SUBCOMMAND, help="...", aliases=SUBCOMMAND_ALIASES)
    _add_args(p)          # extracted from build_parser(), no prog/description wrapping
    p.set_defaults(func=_run)
```

Then `gxwf.py` iterates over all script modules and calls `register(sub)`.

**What to add to `_cli_common.py`:**
- `add_subparser_from_script(subparsers, module)` — extracts args from a script module's `build_parser()` and re-registers them. Uses `parser._actions` to transfer arguments. Or we restructure each script to split arg-definition from parser-creation.

**Preferred:** Restructure each script slightly:

```python
# scripts/workflow_validate.py

SUBCOMMAND = "validate"

def _add_args(parser):
    """Add validate-specific args to parser (used by both build_parser and register)."""
    add_strict_args(parser)
    parser.add_argument("--summary", ...)
    ...

def build_parser():
    parser = build_base_parser("gxwf-state-validate", "...")
    _add_args(parser)
    return parser

def register(subparsers):
    p = subparsers.add_parser(SUBCOMMAND, help="Validate workflow tool_state")
    build_base_subparser_args(p)   # shared positional + cache flags (new helper)
    _add_args(p)
    p.set_defaults(func=lambda args: cli_main_from_args(ValidateOptions, run_validate, args))
```

This requires a small `build_base_subparser_args(parser)` helper in `_cli_common.py` that adds the shared args (workflow_path, tool-source flags) without the `prog`/`description` context — those come from `build_base_parser`.

**Estimated change:** 3-5 lines added to each of the 10-12 existing script files, plus ~30 lines in `_cli_common.py`.

---

### Step 2: Add `cli_main_from_args` to `_cli_common.py`

Current `cli_main` calls `parser.parse_args(argv)` internally. We need a path where args are already parsed (by the parent `gxwf` parser). Add:

```python
def cli_main_from_args(options_cls, run_fn, args: argparse.Namespace) -> int:
    options = options_cls.from_namespace(args)
    setup_logging(options)
    get_tool_info = setup_tool_info(options)
    return run_fn(options, get_tool_info)
```

And `cli_main` becomes a thin wrapper that parses then calls `cli_main_from_args`.

---

### Step 3: Create the `convert` subcommand dispatch layer

The two scripts `workflow_to_format2_stateful.py` and `workflow_to_native_stateful.py` are unified under `gxwf convert`. Create a new shim:

```python
# scripts/workflow_convert.py
SUBCOMMAND = "convert"
SUBCOMMAND_TREE = "convert-tree"

def _detect_target(path: str, to_override: str | None) -> str:
    """Infer target format from extension if --to not given."""
    if to_override:
        return to_override
    if path.endswith(".ga") or path.endswith(".json"):
        return "format2"
    return "native"   # .gxwf.yml / .gxwf.yaml

def register(subparsers):
    p = subparsers.add_parser("convert", help="Convert between .ga and .gxwf.yml")
    build_base_subparser_args(p)
    p.add_argument("--to", choices=["format2", "native"], default=None,
                   help="Target format (auto-detected from input extension if omitted)")
    p.add_argument("--stateful", action="store_true",
                   help="Schema-aware state re-encoding using tool definitions")
    p.add_argument("--compact", action="store_true", help="Omit position info in format2 output")
    p.add_argument("-o", "--output", metavar="FILE", help="Write to file (default: stdout)")
    p.add_argument("--json", action="store_true", help="Force JSON output")
    p.set_defaults(func=_run_convert)

def register_tree(subparsers):
    p = subparsers.add_parser("convert-tree", help="Batch convert workflows in a directory")
    build_base_subparser_args(p)
    p.add_argument("--to", choices=["format2", "native"], default=None)
    p.add_argument("--output-dir", metavar="DIR", required=True)
    p.add_argument("--stateful", action="store_true")
    p.add_argument("--compact", action="store_true")
    add_report_args(p)
    p.set_defaults(func=_run_convert_tree)

def _run_convert(args):
    target = _detect_target(args.workflow_path, args.to)
    if target == "format2":
        # build ExportFormat2Options from args, call run_export_format2
        ...
    else:
        # build ToNativeOptions from args, call run_to_native
        ...
```

The individual scripts `workflow_to_format2_stateful.py` and `workflow_to_native_stateful.py` stay registered as-is for backward compat.

**Estimated change:** ~100 lines new file, no changes to existing format2/native scripts.

---

### Step 4: Create gxformat2 pass-through subcommands

Create a small helper for subprocess pass-through:

```python
# scripts/_gxformat2_passthrough.py
import shutil, subprocess, sys

def make_passthrough_handler(cmd_name: str):
    def handler(args):
        binary = shutil.which(cmd_name)
        if binary is None:
            print(f"error: '{cmd_name}' not found. Install gxformat2 to use this command.", file=sys.stderr)
            return 1
        result = subprocess.run([binary] + args.passthrough_args)
        return result.returncode
    return handler

def register_passthrough(subparsers, subcommand: str, gxformat2_cmd: str, help_text: str):
    p = subparsers.add_parser(subcommand, help=help_text, add_help=False)
    p.add_argument("passthrough_args", nargs=argparse.REMAINDER)
    p.set_defaults(func=make_passthrough_handler(gxformat2_cmd))
```

Register:
- `gxwf viz` → `gxwf-viz`
- `gxwf abstract-export` → `gxwf-abstract-export`
- `gxwf mermaid` → `gxwf-mermaid` (conditional — check if gxformat2 has it first)

---

### Step 5: Create `scripts/gxwf.py`

```python
"""Unified gxwf CLI entry point."""
import argparse, sys
from . import (
    workflow_validate,
    workflow_validate_tree,
    workflow_clean_stale_state,
    workflow_clean_stale_state_tree,
    workflow_lint_stateful,
    workflow_lint_stateful_tree,
    workflow_convert,           # new shim
    workflow_to_format2_stateful_tree,
    workflow_to_native_stateful_tree,
    workflow_roundtrip_validate,
    workflow_roundtrip_validate_tree,
)
from ._gxformat2_passthrough import register_passthrough

_SINGLE_FILE = [
    workflow_validate,
    workflow_clean_stale_state,
    workflow_lint_stateful,
    workflow_convert,
    workflow_roundtrip_validate,
]
_TREE = [
    workflow_validate_tree,
    workflow_clean_stale_state_tree,
    workflow_lint_stateful_tree,
    # convert-tree: handled by workflow_convert
    workflow_roundtrip_validate_tree,
]

def build_parser():
    parser = argparse.ArgumentParser(
        prog="gxwf",
        description="Galaxy workflow CLI — validate, clean, lint, convert, and roundtrip workflows.",
    )
    sub = parser.add_subparsers(dest="subcommand", metavar="<command>")
    sub.required = True
    for mod in _SINGLE_FILE + _TREE:
        mod.register(sub)
    register_passthrough(sub, "viz", "gxwf-viz", "Interactive Cytoscape graph (requires gxformat2)")
    register_passthrough(sub, "abstract-export", "gxwf-abstract-export", "Abstract CWL export (requires gxformat2)")
    register_passthrough(sub, "mermaid", "gxwf-mermaid", "Mermaid diagram (requires gxformat2)")
    return parser

def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)
    sys.exit(args.func(args) or 0)

if __name__ == "__main__":
    main()
```

---

### Step 6: Register in `setup.cfg`

In `packages/tool_util/setup.cfg`, add to `[options.entry_points] console_scripts`:

```ini
gxwf = galaxy.tool_util.workflow_state.scripts.gxwf:main
```

Keep all existing `gxwf-*` entries.

---

### Step 7: Tests

**CLI integration tests** — add a new test file `test_gxwf_cli.py`:

- `test_gxwf_help` — `gxwf --help` exits 0, lists all subcommands
- `test_gxwf_validate_help` — `gxwf validate --help` exits 0
- `test_gxwf_validate` — runs validate subcommand on a fixture workflow
- `test_gxwf_clean` — runs clean subcommand
- `test_gxwf_lint` — runs lint subcommand
- `test_gxwf_convert_to_format2` — `gxwf convert --to format2`
- `test_gxwf_convert_to_native` — `gxwf convert --to native`
- `test_gxwf_convert_autodetect` — `gxwf convert` with .ga input → format2 output
- `test_gxwf_roundtrip` — runs roundtrip subcommand
- `test_gxwf_validate_tree` — runs validate-tree on fixtures directory
- `test_gxwf_viz_missing_gxformat2` — `gxwf viz` with no gxwf-viz installed → error message + exit 1

Use `main(argv=[...])` entrypoint pattern (not subprocess) for fast tests without process overhead.

**Red-to-green order:**
1. Write `test_gxwf_help` → fails (no `gxwf.py`) → implement Steps 1-6 → green
2. Add convert tests → fails (no `workflow_convert.py`) → implement Step 3 → green
3. Add passthrough test → implement Step 4 → green

---

### Step 8: Update docs

In `doc/source/dev/wf_tooling.md`:

1. Replace the Quick Reference table entries to show `gxwf validate`, `gxwf clean`, etc. (keep old `gxwf-*` names in a "deprecated aliases" note)
2. Update all usage examples in Part 1 to use `gxwf <subcommand>` form
3. Add `gxwf viz` and `gxwf abstract-export` to the Visualization section (currently shows the bare `gxwf-viz` / `gxwf-abstract-export` commands)
4. Update "Adding a New CLI Command" in Part 2 to show both the standalone script pattern AND the `register(subparsers)` pattern for adding to `gxwf`

---

## File Inventory

| File | Change |
|---|---|
| `scripts/gxwf.py` | **New** — unified entry point |
| `scripts/workflow_convert.py` | **New** — convert shim dispatching to format2/native ops |
| `scripts/_gxformat2_passthrough.py` | **New** — subprocess pass-through helper |
| `_cli_common.py` | **Modify** — add `build_base_subparser_args`, `cli_main_from_args` |
| `scripts/workflow_validate.py` | **Modify** — add `SUBCOMMAND`, `_add_args`, `register` |
| `scripts/workflow_validate_tree.py` | **Modify** — same |
| `scripts/workflow_clean_stale_state.py` | **Modify** — same |
| `scripts/workflow_clean_stale_state_tree.py` | **Modify** — same |
| `scripts/workflow_lint_stateful.py` | **Modify** — same |
| `scripts/workflow_lint_stateful_tree.py` | **Modify** — same |
| `scripts/workflow_roundtrip_validate.py` | **Modify** — same |
| `scripts/workflow_roundtrip_validate_tree.py` | **Modify** — same |
| `scripts/workflow_to_format2_stateful_tree.py` | **Modify** — add `register` for convert-tree |
| `scripts/workflow_to_native_stateful_tree.py` | **Modify** — add `register` for convert-tree |
| `packages/tool_util/setup.cfg` | **Modify** — add `gxwf` console_script |
| `test/unit/tool_util/workflow_state/test_gxwf_cli.py` | **New** — integration tests |
| `doc/source/dev/wf_tooling.md` | **Modify** — update examples, add new subcommand form |

---

## Sequencing

```
Step 1+2  _cli_common.py extensions (build_base_subparser_args, cli_main_from_args)
Step 1    Modify 8 existing scripts to add register()
Step 3    New workflow_convert.py
Step 4    New _gxformat2_passthrough.py
Step 5    New scripts/gxwf.py
Step 6    setup.cfg registration
Step 7    Tests (red-to-green, drive Steps 1-6)
Step 8    Docs update
```

Steps 1-6 are tightly coupled; do in one commit. Tests and docs can follow separately.

---

## Resolved Decisions

| Question | Decision |
|---|---|
| Old `gxwf-*` scripts | Keep all 12 registered as-is — clean up in later PR |
| `convert` direction detection | Auto-detect from extension; `--to` overrides |
| `galaxy-tool-cache` as subcommand | Keep separate binary |
| `gxwf mermaid` | Include — `gxwf-mermaid` exists in target gxformat2 |

## Remaining Questions

1. **Script refactor scope** — keep standalone `build_parser()`/`main()` intact alongside new `register()`? Yes, `main()` stays as a one-liner; safest for users running scripts directly.
2. **`convert-tree` output-dir required?** TS requires `--output-dir`. Should Python also require it, or allow stdout/dry-run? (Required is likely correct — batch stdout is unworkable.)
3. **Docs flag convergence** — align `--report-json`/`--json` naming with TypeScript now, or save for a separate convergence pass?
