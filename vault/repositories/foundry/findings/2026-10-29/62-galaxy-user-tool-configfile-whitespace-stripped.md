# User-tool configfiles lose their trailing newline: Galaxy evaluates them with CWL whitespace stripping

- Target: galaxyproject/galaxy (`lib/galaxy/tools/evaluation.py` `_write_workdir_file` for YAML user tools). Foundry also needs one authoring rule. Foundry tracking needed: yes, label `upstream/galaxy`.
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-hic-v0-2026-11-01, phase 10 attempt 2 (case `test`, Galaxy release_26.1), 2026-11-01. Open-requirements decision `repair-r2-merge-read-loop-final-line`. Not in the feedback ledger; the driver called it a shell idiom slip.
- Existing issues/PRs: none in galaxyproject/galaxy (searched "user defined tool configfile whitespace", "configfile newline", `strip_whitespace`). Foundry: none; nearest is #672 (user-tool authoring note).

## Symptom
User tool `hicpro_merge_valid_interaction` wrote its input list with a configfile whose YAML block was `$(... .join('\n'))` followed by the block's own newline, and read it with `while IFS= read -r f; do`. A sample with one run produced a one-line file with no trailing newline, `read` returned false on that line, and the job failed "ERROR: no valid-pairs input" (attempt 2, job 77; 72 ok / 1 error). Repair R2 appended `+ '\n'` inside the expression and added `|| [ -n "$f" ]`.

## Root cause
Confirmed. The authored text did end in a newline; Galaxy removed it.
- `UserToolEvaluator._build_config_files` (`evaluation.py:1073-1091` on release_26.1) writes each `configfiles` entry through `_write_workdir_file` with `template_type="ecmascript"`, which calls `do_eval(content, ...)` (`:985-990`; dev `:1002`) without `strip_whitespace`.
- Galaxy's `do_eval` (`lib/galaxy/tools/expressions/evaluation.py:70-104`) calls cwl_utils `do_eval`, whose `strip_whitespace` defaults to `True`; `interpolate` then runs `scan.strip()` (cwl_utils `expression.py:194-207, 287-328`). Any configfile containing `$(` or `${` (escaped verbatim ports included) loses leading and trailing whitespace.
- cwltool evaluates `InitialWorkDirRequirement` Dirent `entry` with `strip_whitespace=False` (`cwltool/command_line_tool.py:614`). Galaxy's configfiles are the same construct, so it diverges from the CWL reference behaviour.

Reproduced with the release_26.1 venv's cwl_utils:

| content | default (Galaxy) | `strip_whitespace=False` |
|---|---|---|
| `"$(inputs.x)\n"` | `'a\nb'` | `'a\nb\n'` |
| `"  plain text $(inputs.x)\n"` | `'plain text a\nb'` | `'  plain text a\nb\n'` |

Shell `read` drops an unterminated final line, so any list-file-plus-read-loop user tool silently loses its last element; with one element it loses everything.

## Evidence
- `galaxy-workflow.gxwf.yml:4189-4191` (fixed configfile) and `planemo/attempt1/test/wf.gxwf.yml:4178-4180` (original); `run_merge.sh` read loop at `galaxy-workflow.gxwf.yml:4265`.
- Attempt 2 `rc.txt` 981 s; attempt 3 passed the merge (stats equal to the host reference, driver-notes).

## Proposed fix
- Galaxy: pass `strip_whitespace=False` when evaluating YAML user-tool configfile content (as cwltool does for Dirent entries). Check whether `shell_command` should keep stripping (it is a command line, so stripping is harmless there).
- Foundry, `galaxy-user-tool-authoring` §6: until the Galaxy fix ships, a configfile with any expression loses its trailing newline; end list files with `+ '\n'` inside the expression, and write shell read loops as `while IFS= read -r f || [ -n "$f" ]`. Add both to the user-tool audit in finding 61.

## Draft issue
**Title:** YAML user-tool `configfiles` are whitespace-stripped, so generated files lose their trailing newline

A user tool's `configfiles` entry such as

```yaml
configfiles:
  - filename: inputs.txt
    content: |
      $(inputs.files.map(function (x) { return x.path; }).join('\n'))
```

is written without the final newline, though the YAML block ends with one. `UserToolEvaluator` writes configfiles via `_write_workdir_file(..., template_type="ecmascript")`, which calls `do_eval` without `strip_whitespace`; cwl_utils defaults it to `True` and `interpolate` strips the whole template. Every configfile containing `$(`/`${` loses leading and trailing whitespace. cwltool evaluates the equivalent `InitialWorkDirRequirement` `entry` with `strip_whitespace=False` (`command_line_tool.py`).

Impact: a shell `while read` over such a file drops the last line; with one input the tool sees none. Seen in a workflow test on release_26.1; the cwl_utils behaviour reproduces directly (`"$(inputs.x)\n"` → `'a\nb'`; with `strip_whitespace=False` → `'a\nb\n'`). Still the same on dev.

Ask: evaluate configfile content with `strip_whitespace=False`.

Foundry tracking comment (label `upstream/galaxy`):

> nf-core/hic wb2g build (2026-11-01): a user-tool list configfile lost its trailing newline and a `while read` loop dropped the only input. Filed upstream as galaxyproject/galaxy#NNNN ("every configfile containing `$(`/`${` loses leading and trailing whitespace"). Until it ships, `galaxy-user-tool-authoring` should say to append `'\n'` inside the expression and use `|| [ -n "$f" ]` in read loops.
