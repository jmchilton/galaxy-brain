# Review: judge removal and the repr()/file param false positives

I acted on items 1 to 4, 8 and 10 of the review and folded the fixes into their commits: the `repr()` commit (now `e78b2e4befe`) and the file param commit (now `70ffe7eeceb`). The corpus result is unchanged: on `origin/dev` and on `stock_tools_review_clean_alt_release_26_1`, the fixes change no finding, and each commit clears only its tool's findings. 824 security unit tests pass.

- **Slice (1).** A slice now drops the escaping. That covers `repr()`, and also `json.dumps()` and `shlex.quote()`, which had the same gap before this branch.
- **Code before a literal (2).** A literal written outside a string after `eval(`, `exec(` or `compile(` is read as an evaluated string, and one after an f prefix is read as an f-string. This uses two new `_Text` flags, set at the end of each chunk.
- **repr() of parts or alternatives (3).** These are now one string: the value's characters plus the probe characters of the literal text, marked `pystr`. `${repr('a' + $v.value)}` clears, and `'${repr(' ' + str($v))}'` is flagged.
- **Backslash LOW (4).** Inside a string, the backslash of a JSON or Python literal is dropped before the code check.
- **Tests (8).** `test_literal_in_python_configfile` in `test_sources.py` pins `breakout`, `requires` and `context` for 10 literal shapes. Without the review fixes, 5 of them fail.
- **Comment (10).** The file param comment moved to the text fall-through branch.

## Not acted on

- **(5) `'${repr($v)}'`, repr of the wrapper itself, is HIGH.** Galaxy's wrappers have no `__repr__`, so the real output has no user text. I treated it as tainted anyway because that is the cautious reading, and it is older behaviour. No stock tool does this.
- **(6) `'''${repr(...)}'''` is HIGH.** This is a limit of the configfile lexer, which doesn't track triple quotes. It is older behaviour and errs on the cautious side.
- **(7) The message says "Characters that get through: '"** even when that quote comes from repr. This is cosmetic, and the per-job `breakout` (`()`) is right.
- **(9) A file param's job-check data changes.** `$f` is now a `text` ref with `verbatim=True`, as a text param is. The runtime branch (`tool_security_runtime`) reads it as it reads a text param's value, so expect that on its rebase. It is recorded in `implementation_debrief.md`.
- **(11) `<inputs check_values="false">`.** Galaxy then doesn't wrap the values, so none are sanitized, and the analyser doesn't read the attribute. This is an older gap. No stock tool is affected: all 26 tools with `check_values="false"` run only `data_source.py '$output' $__app__.config.output_size_limit`. Follow-up.
- **Python-to-shell sinks inside configfiles.** `os.system('${v}')` and `subprocess.run(..., shell=True)` are never read as shell. This is an older and wider gap, and a follow-up.
- **Also seen, older behaviour:**
  - The shell reading of a scalar `repr()` is unchanged on purpose. `echo '${repr(str($p))}'` gets only a LOW, even though repr's `'` closes the shell quote. `echo ${repr(str($p))}` gets a MEDIUM, even though repr's quotes make it one word.
  - `f'${json.dumps(v)}'` / `f${json.dumps(v)}` are skipped by the f-string check's `quoted != "json"` exclusion.
  - Merging branches of `#if` that give a `pystr` value and a raw one drops the escaping, and the finding then names both sources.

<details>
<summary>Full review</summary>

**Checks run:** 814 tests pass. mypy, ruff and black are clean on the changed files. The generated doc section matches the `spec.docs` output, and every spec tool is in MANIFEST.in.

**Issues, highest priority first:**

1. **Bug (med-high): a slice keeps `pystr`.** `interp.py` returned `base` unchanged for a slice. Now silent, where the parent flagged all three HIGH:
   - `x = ${repr($v.value)[1:-1]}`
   - `${repr($v.value)[::-1]}`
   - `#set r = repr($v.value)` followed by `${r[1:-1]}`

   `json.dumps(...)[1:-1]` and `shlex.quote(...)[1:-1]` were already silent. Fix: drop `quoted` on a slice.
2. **Bug (medium): the early return ignores code that opens a string.** That is `_EVALUATED_STRING` and `_FSTRING_PREFIX`. Now silent:
   - `eval(${repr($v.value)})` and `exec(${repr(str($v))})`
   - `x = f${repr($v.value)}`
   - `os.system(${repr(...)})` and `subprocess.run(..., shell=True)`

   `eval(${json.dumps(...)})` already had the gap. Python-to-shell sinks are a wider gap that predates this branch.
3. **Inconsistency (medium): repr of a value built from parts.**
   - False positive: `x = ${repr($v.value + ".txt")}` stays HIGH.
   - False negative: `'${repr(" " + str($v))}'` is silent.

   Fix: collapse the parts into one AV marked `pystr`.
4. **False positive (low): a new LOW "can escape the closing quote".** It appears for `'${json.dumps(str($v))}'`, although json output always ends in `"`. Fix: drop the added `\` before the code check.
5. **False positive (low):** `'${repr($v)}'` of the wrapper is HIGH, although there is no `__repr__` (older behaviour).
6. **False positive (low):** `'''${repr(str($v))}'''` is HIGH (an older lexer limit).
7. **Wording (low):** "Characters that get through: '", where the `'` comes from repr.
8. **Test gap:** nothing pins the job-check data for the new configfile findings.
9. **Downstream (commit 3):** `$f` is now a `text` ref with `verbatim=True`. Confirm with the runtime branch.
10. **Style (commit 3):** the file param comment sat inside the branch that now excludes `file`.
11. **Older gap:** `check_values="false"` makes Galaxy skip `wrap_input`, so no param is sanitized, and the analyser never reads `check_values`.

**Checked and found correct:**

- **Commit 1:** no reference to the judge remains, and `replace` and `Any` are still used in `report.py`. The deterministic judge-named methods are intact, the CLI help and docs are updated, and the `anthropic` pin predates the branch.
- **Commit 2, against real Python:**
  - repr chooses its quotes and escapes characters as the model assumes.
  - `_can_escape_config_quote` returning False is right.
  - The added characters are right for `'...'` and for `"..."`.
  - json.dumps does not escape `'`.
  - r, u and b prefixes are harmless.
  - Case methods and a no-argument strip can keep `pystr`.
  - Joining repr with a raw value drops the escaping, and repr + repr keeps it.
  - A repr in a comment is cleared.
- **Commit 2, shell path:** the shell job-check JSON is identical to the parent on 6 probes. The `_ESCAPING_ADDS["pystr"]` entry repeats what `introduced(..., escape=True)` records, and maf_filter's 4 HIGH findings clear.
- **Commit 3, against Galaxy's rendering:**
  - `FileToolParameter` has no `to_param_dict_string`, so it renders through `ToolParameter.to_param_dict_string` and is sanitized.
  - A tool or param with `sanitize="false"`, and a permissive custom sanitizer, all stay flagged. A file param in a repeat works.
  - The ftpfile, color and directory_uri overrides do write their value as it is.

</details>
