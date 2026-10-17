# issue_23978_parameter_tools_xsd — thermo-nuclear code quality review

Scope: `f66d1f0f97d..2bd2d9cf1b4` (`bbda1d165f1`, `2bd2d9cf1b4`). Run 2026-10-16.

**Verdict: approve with one fix.** Acted on one finding: the XSD lint in `.ci/validate_test_tools.sh` still ignored its exit status after the branch fixed its path. Commit `935eee9c5f2` adds `|| exit 1` and rewords the exclusion comment to name all three exclusion kinds. No structural problems. The `case` loop is the right shape, and the content-sniffing alternative was tried and rejected (see below). No XSD doc changes.

## Not acted on

- **Pick files with `loader_directory.looks_like_a_tool_xml` instead of the `case`.** Measured, and it does not work here. It returns True for `sample_tool_conf.xml` and `upload_tool_conf.xml` because `<toolbox>`/`<tool file=` match its regex. `upload.xml` would still need an explicit skip. The result would be a sniffer plus leftover name exceptions, which is worse than one 3-arm `case`.
- **Derive the file list from `sample_tool_conf.xml`.** It doesn't list `parameters/` and does list `for_workflows/` etc. That would change scope, and it needs a Python parse step.
- **`find ... -exec validate_tools.sh {} +`.** It may split into several calls, each running `common_startup.sh`, and output order isn't guaranteed. The loop is clearer.
- **Move the XSD lint into `scripts/validate_tools.sh` / dedupe `xsd_path`.** That's a generic shared script, so the move is scope creep. Fail-fast covers the drift risk.
- **Remove the hand-maintained `type` list in the XSD docs in favour of the enum.** `doc/parse_gx_xsd.py` doesn't render attribute enums, so the hand list is the only rendered copy.
- **Pre-existing XSD doc warts:** `ftpfile` is listed but isn't in the enum, the "obsecure" typo, and the "This covers examples..." closing sentence now sits under `rules` (before, it sat under `directory_uri`). Not branch-owned. Changing them is churn.
- **Never-validated subdirs** (`for_workflows/`, `expression_tools/`, ...). Out of scope, already noted in the initial debrief.

## Checks

- `shellcheck .ci/validate_test_tools.sh`: clean. Pre-commit (incl. Shell Syntax Check) passed on commit.
- Copies of `.ci/validate_test_tools.sh` + `scripts/validate_tools.sh` with only `common_startup.sh` stubbed:
  - real XSD path: exit 0, 410 ok, 0 not ok, 100 `parameters/` tools.
  - old bogus path `lib/galaxy/tools/xsd/galaxy.xsd`: exit 1 before the tool loop (0 tools run). Without the fix this case logged a warning and carried on.
- `pytest test/unit/tool_util/test_tool_linters.py`: 136 passed.

<details>
<summary>Full review</summary>

### 1. Structural / code-judo

**`.ci/validate_test_tools.sh` file selection.** The `ls | grep -v | grep -v` pipeline became a glob + `set --` + `case` loop. This is the standard POSIX idiom for building an argv without word-splitting, and shellcheck forced it. Three exclusion arms, one per real category: `*_conf.xml` (toolbox/datatype/data-manager configs), `*/upload.xml` (schema-invalid by design), `*/parameters/macros.xml` (macro file). That isn't spaghetti. Each arm is a named category, not an ad-hoc special case.

Searched for an existing abstraction that already owns "which files are tools":
- `galaxy.tool_util.loader_directory.looks_like_a_tool_xml`: run over all 416 candidates, it flags only 3 as non-tools (`parameters/macros.xml`, `sample_data_manager_conf.xml`, `sample_datatypes_conf.xml`). `sample_tool_conf.xml` and `upload_tool_conf.xml` sniff as tools (regex hits `<tool`). Adopting it would keep the `_conf`/upload exclusions and add a Python call to a shell script. Rejected.
- `sample_tool_conf.xml`: the canonical framework-tool registry. It covers a different set (no `parameters/`, includes `for_workflows/`). Rejected for scope.
- `tox.ini` `validate_test_tools` env: only invokes the script, so the script is the right home.
- `scripts/validate_tools.sh`: generic "validate these paths" and correctly takes explicit args. File selection belongs in the CI caller, where it is.

### 2. Boundary / silent-fallback problem (acted on)

The branch fixed `xsd_path` from the nonexistent `lib/galaxy/tools/xsd/galaxy.xsd` to `lib/galaxy/tool_util/xsd/galaxy.xsd`. The path had been wrong for years because nothing checked `xmllint --noout`'s exit status. The script carried on to per-tool validation in `scripts/validate_tools.sh`, which has its own correct copy of `xsd_path`. Two copies of one constant plus a swallowed status is a silent drift trap, and the branch fixed the symptom (the path) but not the trap. The test challenge argued a malformed XSD still fails every per-tool run. That holds for a malformed schema but not for a wrong path in the `.ci` copy, which is exactly the bug that happened. Fix: `xmllint --noout "$xsd_path" || exit 1`. One line, same style as the `cd ... || exit` the branch already added. Verified red (bogus path → exit 1, no tools run) and green (410 ok).

The comment above the loop explained `upload.xml` and `macros.xml` but not `*_conf.xml`. Reworded to cover all three arms.

### 3. XSD (`lib/galaxy/tool_util/xsd/galaxy.xsd`)

- `rules` enum addition: correct. `RulesListToolParameter` is registered in `parameter_types` and `parameters/gx_rules.xml` needs it.
- `#### rules` section: short, flagged core-only, follows the `directory_uri` precedent. Fine.
- `type` attribute hand list gains `group_tag`, `directory_uri`, `rules`. The hand list duplicates the enum and had already drifted. Ideally it would go, but `doc/parse_gx_xsd.py` doesn't render simpleType enumerations for attributes, so it is the only rendered list. Keeping it is correct for now.
- `data_ref` docs adding `rules`: verified, `RulesListToolParameter.__init__` reads `data_ref` (basic.py ~3239).
- File size: the XSD was already far past 1k lines. +7 lines of docs isn't a decomposition trigger.

### 4. Tool fixture edits (`test/functional/tools/parameters/*.xml`)

`ext=` isn't a Galaxy param attribute (it was silently ignored). Dropping `ext="data"` restores the identical default. `ext="txt"/"tabular"` → `format=` makes 5 tools actually restrict, and their embedded tests use auto-sniffed matching data (verified in the initial debrief, 10/10 both tool APIs). Titles added on section/repeat match sibling tools. Mechanical, minimal, nothing to restructure.

### 5. Test (`test/unit/tool_util/test_tool_linters.py`)

The expected enum-facet message gains `'rules'`. Required by the enum change and not a weakening. The assertion hardcoding the whole set is pre-existing brittleness. Out of scope.

</details>
