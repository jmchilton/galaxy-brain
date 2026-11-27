# Implementation debrief

```
created .../tool_security_static_findings/differential-review/snapshots/20261127T205108Z-revision-53559de55d06.json
  revision @ 53559de55d06 vs origin/dev (merge-base ce63095e7a8a)
  first snapshot: 26 commits, 100 files, 102 hunks
```

**STATUS: READY.** This revision is John's 2026-11-27 changes: it drops the LLM judge and removes two analyser false positives that refused stock tools in the active sample `tool_conf.xml`. There are three new commits on `0ad21214cce`, pushed to `jmchilton/tool_security_static_findings` as a plain push. The new head is `53559de55d0`.

## Commits

1. `47de75304e2` "Drop the language model judge from the security review"
   - Removes `judge.py`, `test_judge.py`, and the CLI's `--judge` flag, import, call and verdict lines.
   - Removes the `--judge` clause from the `--fail-on` help.
   - Removes `Finding.assessment`, so `--json` findings no longer have an `"assessment"` key.
   - Removes `Report.assess()` and the judge lines of the admin docs.
   - Keeps the deterministic `PythonAudit.judge`, `judge_shell`, `judge_config` and `_judge_rewrite`.
2. `30fd8ee53f4` "Read repr() of a string as a Python literal in Python code" (FP-2)
   - **The fix.** `repr()` of a user string is marked `quoted="pystr"`. That includes a string built from literal text and values, which is collapsed into one string. As with `repr()` of a list, it clears only where it is code outside any string.
   - **The inside-a-string guard.** The early return for JSON and Python literals now needs `not quote`. Inside a string, the quotes that `repr()` writes are added to the value's characters, so `'${repr(str($p))}'` is flagged even for a sanitized value. `"${json.dumps(str($p))}"` was a silent false negative before and is flagged now.
   - **Backslashes inside a string.** A literal's backslash is dropped there, because json.dumps and repr escape it.
   - **Review fixes:**
     - A literal after `eval(`, `exec(` or `compile(` is read as an evaluated string, and one after an f prefix as an f-string. Two new `_Text` flags carry this.
     - A slice drops the escaping. That also covers json.dumps and shlex.quote, which had the gap before this branch.
   - **Unchanged on purpose:** how the shell reads a scalar `repr()`.
3. `53559de55d0` "Read a file param as Galaxy renders it, through its sanitizer" (FP-1)
   - **Why.** `FileToolParameter` has no `to_param_dict_string` of its own. It renders through `ToolParameter.to_param_dict_string` inside `InputValueWrapper`, which runs the param's sanitizer or the default one.
   - **The fix.** `file` is removed from the as-is types. `$f` is now a sanitized `text` ref and `$f.value` is raw.
   - **Checked:** color, directory_uri and ftpfile do write their value as it is, and stay as they were.

The review fixes and the test challenge changes were folded into commits 2 and 3. Each commit passes on its own: 807, 820 and 822 security unit tests. ruff, black, isort and mypy are clean on the changed modules.

## Corpus check

I diffed the CLI's `--json` output before and after, across `tools/`, `lib/galaxy/datatypes/converters/` and `lib/galaxy/tools/*.xml`. I ran it on `origin/dev` (`070dab20526`) and on `jmchilton/stock_tools_review_clean_alt_release_26_1` (`6cfe8e271c1`), both as `git archive` copies. The scripts are in the session scratchpad (`fp/run.sh` and `fp/cmp.py`).

The result was the same on both trees:
- `maf/maf_filter.xml` loses its 4 HIGH `configfile-injection` findings and nothing else changes; its max severity goes from high to low.
- `data_source/ncbi_datasets.xml` loses its HIGH `shell-injection` on `'$file_param'`. Its `reads` and `writes` move from the `raw` to the `text` accessor, as a text param's do, and its max severity goes from high to low.
- No other tool changes.

## Tests

- **Spec cases added:**
  - `repr_python_literal` (cleared, raw and sanitized)
  - `repr_inside_python_string` (flagged)
  - `json_inside_python_string` (flagged)
  - `file_param_stays_quoted` (cleared)
  - `ftpfile_param_shell_injection` (flagged)
- **The generated docs section** was regenerated at every commit, and MANIFEST.in lists the new spec tools.
- **New source tests:** `test_literal_in_python_configfile_stays_one_string` (4 rows) and `..._breakout` (6 rows) in `test_sources.py`. They pin the job check's `breakout`, `requires` and `context` for each literal shape.
- **Dropped in the test challenge:** the spec cases `repr_in_shell` and `raw_file_param_shell_injection`. Both stayed green with the change reverted and were already covered elsewhere. See `test_challenges_debrief.md`.
- **Review:** `subagents/review_judge_and_fps.md`.

## For the children and the re-sync

- **Not in `tool_security_review_spec`.** None of the three commits is there.
  - The judge removal is a permanent re-sync skip.
  - The two false positive fixes have to be carried through each re-sync, or ported to the spec branch. That is John's call.
  - See `index.md`.
- **For `tool_security_runtime` (branch 3).** A file param's job-check data changed. `$f` is now a `text` ref with `verbatim=True`, as a text param is; before, both `$f` and `$f.value` were `raw`. Its job value is the `local_filename` string, read like a text param's value. Check this when the branch is rebased.
- **For `tool_patches_static_findings` (branch 4).** It still has judge test scaffolding to drop, per John's 2026-11-27 decision.

## Follow-ups (older behaviour, not changed)

- **`<inputs check_values="false">`.** Galaxy then skips wrapping, so no value is sanitized, and the analyser doesn't read the attribute. No stock tool is affected: all 26 such tools run only `data_source.py '$output' $__app__.config.output_size_limit`.
- **Python-to-shell sinks in configfiles.** `os.system('${v}')` and `subprocess.run(..., shell=True)` aren't read as shell.
- **The shell reading of a scalar `repr()` is off both ways:**
  - `echo '${repr(str($p))}'` gets only a LOW, but repr's `'` closes the shell quote.
  - `echo ${repr(str($p))}` gets a MEDIUM, but repr's quotes make it one word.
- **The f-string check skips JSON**, both for `f'${json.dumps(v)}'` and for `f${json.dumps(v)}`, because of its `quoted != "json"` exclusion.
- **Cautious false positives:**
  - `'${repr($wrapper)}'`: Galaxy's wrappers have no `__repr__`.
  - Triple-quoted strings.
  - An `#if` merge of a `pystr` branch with a raw branch names both sources.
- **`_ESCAPING_ADDS["pystr"]`** repeats what `introduced(..., escape=True)` records, and no test pins it.
