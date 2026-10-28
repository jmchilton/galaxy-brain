# #24535 regression analysis

Reviewed: PR head `deed873a70a` (base `release_26.2`); tools-iuc `origin/main` `ba9ee7d1b`. Research only, nothing posted.

## Direct answers

1. **Causes**
   - **comment_lines.** The cause is `72dcfbe09dd` (#24357), which added `IntParameter` for `TabularData.comment_lines`. `MetadataToolOutputAction.apply_action` always calls `.split(",")` on `default`, so `default="7"` arrives as `["7"]`. `int(["7"])` raises `TypeError`, which surfaces as `RequestParameterInvalidException`, and the **job dies at creation**.
     - Our hardening `f9c022e2d6e` is **not implicated**. It only adds the bool and fractional-float checks, and `72dcfbe` alone already breaks on a list.
   - **sel.** The cause is `a43a281d4fa` / `67fab451e9c` (#23866), which turns every unregistered output extension into `data` at job finish. `sel` was never registered. Until then, BayeScan's discovered `bayescan.sel` kept the raw extension, and the tool test asserts `ftype="sel"`.
2. **Agreement with the earlier fixes**
   - **comment_lines: neutral to slightly counter.** #24357 aimed to store real ints, and the PR keeps that by storing `7`. But it widens `IntParameter.marshal` to accept a singleton list from *every* caller, including the API and the edit form. That only works around the real defect, the unconditional comma split in output actions, which is already a TODO at `output_actions.py:335-337`.
   - **sel: in line.** The PR keeps #23866's rule ("unknown → `data`") and only registers one more extension.
     - It is a point fix, though. tools-iuc has about 15 other declared formats that are unregistered and silently become `data` (sample below).
     - #23866 shipped with no profile gate after John offered one and then waived it.
3. **Profile gating**
   - **comment_lines: no.** Nothing legitimate depends on the strictness. The bug is in the action layer, and the action's value is overwritten at job finish anyway (see below). Fix it with spec-aware splitting in `apply_action`, or with this PR's unwrap, not with a gate.
   - **sel: a gate at profile `26.2` is feasible and timely**, because 26.2 is untagged and `release_26.2` already carries 26.2 profile changes.
     - The catch is that BayeScan (no `profile`) and #23866's motivating case (unzip, #22648) use the same mechanism, pattern-captured ext. Any gate that spares BayeScan also leaves unzip unfixed until it bumps its profile, so a gate effectively reverts #23866 for all existing tools.
     - My recommendation: keep #23866 ungated and accept registering `sel`. Better still, fix the BayeScan wrapper, since Galaxy's own `ValidDatatypes` linter already errors on `ftype="sel"`.

## comment_lines details

- **Crash path**
  - `lib/galaxy/tools/actions/__init__.py:697-702` calls `output.actions.apply_action` at job *creation*.
  - That reaches `lib/galaxy/tool_util/parser/output_actions.py:338-353` (`fill_template(self.default...).split(",")`), then `MetadataCollection.__setattr__` (`lib/galaxy/model/metadata.py:168-169`), then `spec.unwrap`, then `IntParameter.marshal`.
  - Before `72dcfbe`, `comment_lines` used the base `MetadataParameter`, so `["7"]` was stored as a list without error.
- **Was the old behavior working? It didn't crash, but it was effectively a no-op.**
  - At job finish, `set_meta_with_tool_provided` calls `datatype.set_meta` (`lib/galaxy/metadata/set_metadata.py:162`).
  - `Tabular.set_meta` assigns `comment_lines` unconditionally from file content (`lib/galaxy/datatypes/tabular.py:577`). Its docstring says it treats overwrite as always True.
  - So the action's `["7"]` lived only between creation and finish, while the dataset was queued or running, and nothing downstream ever saw it on an `ok` dataset.
  - The `blurb` (`tabular.py:141-142`) and `ColumnDataProvider` (`visualization/data_providers/basic.py:84-86`) would have seen the list only during that window.
- **The new `metadata_defaults` fixture cannot distinguish the two outcomes.** It writes exactly 7 and 3 `#` lines, so the sniffed count equals the action default. It does prove the crash goes red to green, but not that the action's value persists, which it doesn't for `tabular`.
- **Scope is understated in the PR description.**
  - In tools-iuc `origin/main`, three wrappers use a `comment_lines` metadata action, and all hit the same crash:
    - `tools/chopin2/chopin2.xml:102,111`
    - `tools/cat/macros.xml:253-295` (7 outputs)
    - `tools/arriba/arriba.xml:7`
  - The PR's unwrap fixes all three. Only Chopin2 is named.
- **The other integer metadata path is unaffected.** `IntParameter` is used only by `comment_lines` (`tabular.py:102`). Other int-like metadata such as `columns` and `data_lines` uses the base parameter, so it still stores lists without error.
  - tools-iuc metadata actions by name: `column_names` 114, `dbkey` 26, `column_types` 14, `comment_lines` 10, `columns` 2.
- **The "passes on 26.1" claim is stale, and the fix targets the wrong branch.**
  - `72dcfbe` + `f9c022e` are in `release_25.1` via `482a508f3ad` (10-26). They reached `release_26.0` via `f4568d581ac`, `release_26.1` via `e4cc81b16fa` (10-27 09:19), and `release_26.2` via `76afbdebe0a`.
  - `release_26.1` and `release_26.2` have identical `metadata.py` and `output_actions.py` logic.
  - tools-iuc CI pins `GALAXY_BRANCH: release_26.1` (`.github/workflows/pr.yaml:20`, `ci.yaml:10`). Chopin2, CAT and arriba should be red there now, and the 26.1 pass likely predates 10-27.
  - **The comment_lines half should target `release_25.1`**, split from the `sel` half, which must stay on `release_26.2`.
- **Better-layered fix (dev follow-up)**
  - Address the TODO at `output_actions.py:335-337`: split `default` only when the spec is list-valued, i.e. don't split for scalar params like `IntParameter`.
  - There is no clean existing signal for this. `column_names` uses the base `MetadataParameter` (`tabular.py:127`) and only `column_types` has `ColumnTypesParameter`. So it needs either a "skip split for scalar params" check or a marker on the spec.
  - The PR's unwrap is acceptable as a release-branch stopgap. Its cost is that `IntParameter` now also accepts `["7"]` from the API.

## sel details

- **Mechanism**
  - `JobWrapper._set_unknown_output_extensions_to_data` (`lib/galaxy/jobs/__init__.py:2121-2147`) is called at finish (`:1612`) and on failure (`:2550`).
  - It sets the ext to `data` and records an `unknown_datatype` job message that keeps the original ext.
  - It is only on `release_26.2` and dev. The merge commit is `0d7309fa5a5`, merged 2026-10-13.
- **Production impact is mild.** Users see `data` instead of `sel`, and the datatype was `Data` either way. The hard failure is only the wrapper test's `<discovered_dataset designation="bayescan" ftype="sel">` (`tools/bayescan/bayescan.xml:99`).
  - The tool has no `profile` and uses `__designation_and_ext__` (`:73`).
- **Was it anticipated? Partly.**
  - On #23866 John wrote that he "would gate it because it is a behavior change and I've written tools in the before-times when different Galaxies actually had different datatypes", then waived the gate (comment 2026-10-02T15:20).
  - The archived review lists the risk "All tool profiles now downgrade unregistered output extensions to `data`" (`archived/23866/review-2026-10-13.md:40`). Nobody sampled tools-iuc.
- **Other unregistered extensions in tools-iuc** (`origin/main`, checked against `release_26.2` `datatypes_conf.xml.sample`, with auto-compressed `.gz`/`.bz2` variants treated as registered)
  - **Test ftypes:** `sel` is the only unregistered value, so it is the only one where a tool test fails.
  - **Declared output formats:** these unregistered values now silently become `data`, and no test catches it:
    - `antigenic`, `oddcomp`, `seqmatchall` (emboss_5)
    - `cdt`, `jtv`, `seg` (cnvkit)
    - `omq`, `sum`, `ump` (omark)
    - `pickle` (colabfold, also via discover)
    - `plink` (king, discover)
    - `network` (bigscape)
    - `ps` (graphlan)
    - `emf` (hicexplorer `change_format`)
    - `text` (enasearch)
  - This covers declared formats only. Extensions captured at runtime by `__*_and_ext__` patterns can't be enumerated statically.
- **Registering `sel` vs. a softer approach**
  - Registering it is minimal and consistent with #23866.
  - Downsides:
    - It only helps installs that use the sample conf, not a customized `datatypes_conf.xml`.
    - `display_in_upload="true"` adds a user-visible upload type just to satisfy one test. Nit: `false` would do.
    - It is whack-a-mole for the list above.
  - `ValidDatatypes` (`lib/galaxy/tool_util/linters/datatypes.py:62-110`) already errors on unknown `format`/`ftype`, so the wrapper is also lint-invalid today. Fixing the wrapper (`ftype="txt"`, or a tool-local `datatypes_conf.xml`) is the principled upstream fix. Registering `sel` is the compatibility shim.
  - Keeping unknown exts for legacy profiles would bring back #22648's broken-collection behavior. I don't recommend it.

## Profile-gating feasibility

- **Precedent:** `Version(str(tool.profile))` checks such as `tools/actions/__init__.py:543,555`. The `galaxy.xsd` "Tool profile" section already has a `26.2` entry (galaxy.json opt-in, optional boolean `None`, `has_n_columns` sep).
- **Versions:** `release_26.2` is `VERSION_MAJOR = "26.2"` and untagged (latest tags `v26.1.2`). dev is `27.0`, so `26.2` is the next gate value.
- **Reachability**
  - **Job finish:** `self.tool` is set in `JobWrapper.__init__` (`jobs/__init__.py:1070`), so a gate in `_set_unknown_output_extensions_to_data` is trivial.
  - **Metadata action:** the profile is in scope at the caller (`tool` in `tools/actions/__init__.py:702`). Only `__python_template_version__` is currently passed into `output_action_params`, so threading the profile through would need one more key or a constructor argument. It is reachable but not worth doing (Q3).
