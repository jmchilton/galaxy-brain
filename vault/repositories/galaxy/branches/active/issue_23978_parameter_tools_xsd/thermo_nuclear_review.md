# issue_23978_parameter_tools_xsd — thermo-nuclear code quality review

Scope: `f66d1f0f97d..04034197ef7` (`977e2f3971a`, `8dcdee07d4b`, `ab7999ce965`, `04034197ef7`). Run 2026-10-16, post re-scope. I formed this view before reading `earlier_drafts/2/thermo_nuclear_review.md`.

**Verdict: approve, no changes.** Acted on nothing because no finding holds up as a structural problem. The branch is small (+43/-29) and stays inside what #23978 owns. The re-scope (`*/*.xml`) is itself the code-judo move: it deletes the hand-maintained subdirectory list that caused the bug instead of adding one more entry. The CI script has one glob pair and one `case` with 4 named exclusion categories. The XSD gains one enum value plus docs. The fixtures get mechanical attribute fixes. No new commits.

## Not acted on

- **Pick tool files with `loader_directory.looks_like_a_tool_xml` instead of the name `case`.** That is the canonical "is this a tool" helper, but its `TOOL_REGEX` (`<tool\s`) matches `sample_tool_conf.xml` (`<tool file="upload.xml" />`). The `_conf` and `upload.xml` exceptions would remain, so this adds a Python sniff step without deleting any arms.
- **Replace `scripts/validate_tools.sh` (one python + xmllint process per tool, 431 spawns) with a single Python driver using `linters/xsd.py`'s `TOOL_XSD` + lxml `XMLSchema`.** That is the real structural simplification in this area, but it targets a generic, pre-existing script the branch never touches. It belongs in its own PR.
- **Recurse past one directory level.** No tool sits deeper today. Recursing needs a `cwl_tools/` prune (gitignored, populated locally). The comment states the depth.
- **`upload.xml` special case.** Re-checked: it still fails XSD (`conditional` without `param`), so the arm stays.
- **Hand-maintained `type` list in XSD docs duplicates the enum** (and lists `ftpfile`, which is not in the enum). `doc/parse_gx_xsd.py` does not render attribute enumerations, so the hand list is the only rendered copy. The branch keeps it in sync, which is correct. The `ftpfile` drift predates the branch.
- **`test_inputs_param_type` pins the full enum set.** Pre-existing brittleness. Loosening it would weaken the assertion.
- **XSD doc warts** ("obsecure" typo, the "most common parameter types" closing sentence sits under core-only types). Both predate the branch. `directory_uri` already sat in the same spot.
- **`cd ... || exit` vs `xmllint ... || exit 1` style mismatch.** Both fail non-zero. `|| exit` is shellcheck's recommended form for `cd`. Changing it would be churn.

## Checks

- Stubbed CI run (copies of `.ci/validate_test_tools.sh` + `scripts/validate_tools.sh`, `common_startup.sh` stubbed, `cd` pointed at the worktree, worktree `.venv`): exit 0, 431 ok, 0 not ok.
- `shellcheck .ci/validate_test_tools.sh`: clean.
- `pytest test/unit/tool_util/test_tool_linters.py`: 136 passed.
- `upload.xml` through loader + xmllint: still invalid, so the exclusion is needed.
- Worktree clean, no edits.

<details>
<summary>Full review</summary>

### 1. Structural / code-judo

**Root cause vs symptom.** #23978 happened because `.ci/validate_test_tools.sh` named directories by hand and `parameters/` was never added. The original scope added `parameters/*.xml`, which kept the trap. The re-scope's `"$test_tools_path"/*/*.xml` removes the concept of a directory list entirely. Now any new subdirectory is validated by default, and the only remaining knowledge in the script is which files are *not* tools. That is the simplest model available. I looked for a smaller one:

- *Content-based selection* (`looks_like_a_tool_xml`): fails on toolbox confs, see above.
- *Derive from `sample_tool_conf.xml`*: a different set (omits `parameters/`, a framework-only dir loaded another way), and it needs XML parsing in shell. Rejected.
- *`find -L ... -exec`*: needs `cwl_tools` pruning and may split into several `validate_tools.sh` calls (each running `common_startup.sh` in CI). Worse.

The exclusion `case` has 4 arms, each a named category: toolbox/datatype/data-manager configs (`*_conf.xml`), macro files (`*/macros.xml`, `*_macros.xml`), and one schema-invalid-by-design tool (`*/upload.xml`). This is not ad-hoc branching. The macro patterns match the repo's naming convention, and they are narrow on purpose: if a pattern is too narrow, a `<macros>` root fails XSD and CI fails loudly. If it is too broad, a tool gets skipped silently.

**Fail-fast on the XSD lint** (`977e2f3971a`). The `.ci` script and `scripts/validate_tools.sh` each hold their own copy of `xsd_path`. The `.ci` copy was wrong for years because nothing checked xmllint's status. `|| exit 1` turns that drift into a hard failure. The full fix would be one constant, but that means editing the generic shared script. The guard is the proportionate fix.

**Per-tool process spawning in `scripts/validate_tools.sh`** is the heaviest part of this pipeline: one Python interpreter plus one xmllint per tool, with `PYTHONPATH` re-exported inside the loop. A Python driver could reuse `TOOL_XSD` and the loader in one process, and would also remove the duplicated `xsd_path`. The branch does not touch that file, so this is a follow-up, not a branch finding.

### 2. Spaghetti / branching

None added. No conditionals in application code. The only control flow is the shell `case`.

### 3. Boundary / type contracts

- `ext=` is not a recognized param attribute (`grep` over `basic.py` / `parser/xml.py`: nothing reads it). It was silently ignored, so dropping `ext="data"` is behavior-identical to the default `data`. `ext="txt"/"tabular"` → `format=` makes the 5 dynamic-options/drill_down fixtures actually restrict, which is what the authors meant. Their embedded tests use auto-sniffed matching data (initial debrief: 10/10 under both tool APIs).
- No `ext=` left on data params under `test/functional/tools`, `tools/` or `lib/galaxy/tools`.
- `rules` enum: `parameter_types` registers `rules=RulesListToolParameter`, and `parameters/gx_rules.xml` exercises it. `data_ref` doc addition is correct (`RulesListToolParameter` reads `data_ref`).

### 4. File size / decomposition

`galaxy.xsd` was already far past 1k lines. +7 lines of docs/enum is no decomposition trigger. The shell script is 20 lines.

### 5. Legibility

- Titles added to section/repeat match the existing siblings (`title="Section Parameter"` / `"Repeat Parameter"`). The untitled `<section>`/`<repeat>` elements left in those files are inside `<tests>`, where titles do not apply.
- Script comment states depth and all exclusion categories accurately.
- Symlinked production tools (`expression_tools/`, `for_tours/filtering.xml`) are now XSD-gated by this job. That is desirable, following the existing top-level symlink precedent (`upload.xml`, `export_remote*.xml`), but the PR description should say so (already noted in the rescope review and test challenge).

### 6. Test change

`test_inputs_param_type` expected string gains `'rules'` at the enum's position. The change is required and is not a weakening.

### Comparison with earlier draft (read afterwards)

`earlier_drafts/2/thermo_nuclear_review.md` covered the pre-re-scope branch and reached the same verdict. Its one fix (`|| exit 1`) is now `977e2f3971a`. Its "never-validated subdirs" not-acted item is resolved by the re-scope. New here: the re-scope is assessed as the root-cause fix, the `upload.xml` arm is re-verified as still needed, and the per-tool process spawning is noted as the follow-up structural target.

</details>
