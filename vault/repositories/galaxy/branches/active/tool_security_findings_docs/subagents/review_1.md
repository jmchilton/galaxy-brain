# Review 1: findings docs (normal review)

**What I acted on.** I fixed everything in must-fix and should-fix except one point of #13, the Python 3.9 typing. That only matters on the spec branch, so it is a port note. I also acted on most of the nits. Both commits were amended (`4f5b3fbb58c`, `9e7076ae5c8`) and pushed.

Must-fix:
1. **`template-app-access` prose.** It now says that every read of `$__user__` is flagged, whatever the sanitizer setting.
2. **`template-app-access` fix.** The fix now advises reading a preference by name through `shlex.quote()`. It says the medium finding stays. The new case `user_preference_shlex_quoted` backs it.
3. **`uncheckable-untraced-value`.** The fix pair is now `untraced_value` to `user_preference_shlex_quoted`, which gets no vulnerability. I dropped `user_preference_stays_quoted` as its example.
4. **`template-file-io`.** `os.path.exists` is replaced by `os.stat`, with the new case `template_stat`, which is medium.
5. **`template-model-access`.** `.dataset` is dropped.
6. **The `head_in_job` "after".** I removed it, along with its tool and case. The server-injection and uncheckable-template-code fixes now go to `dataset_first_line_in_job`: declare the file as a data input.

Should-fix:
7. **"Not flagged" headings.** They now read "Not flagged with `<code>`". The generator adds a line after any not-flagged or after example that still has a medium-or-worse finding or an uncheckable code: "The review does not report X here, but it does report ...".
8. **Positional afters.** `nested_shell_positional` and `pipe_to_shell_positional` now write `'$word'`, which is sanitized, not `'${word.value}'`.
9. **INTRO severity text.** It now says "mostly" and is scoped to vulnerabilities. Capability severities are explained per code.
10. **INTRO claim about tests.** It now says what the tests check and that the prose is not checked.
11. **Severity is structured.** `severity` is a map from severity to text. `doc_problems` now requires:
    - every severity the docs name to have an example at that severity;
    - every severity seen in the examples to be named;
    - uncheckable codes to have no severity.

    New cases cover the tiers that had no example: `nested_interpreter_backslash`, `configfile_fstring_braces`, `configfile_data_file`, `argument_plain_words`, `server_open`, `template_object_reflection`, `include_fixed_file`, `template_stat`.
12. **Isolation and CLI format.**
    - Line formatting moved into `Reviewed.lines()`. It uses the CLI's widths (22/18) and its `(+N)` for more lines.
    - The isolation comment now reads: SECTIONS, DESCRIPTIONS and Reviewed follow the analyser; the rest reads only the YAML, the tool files and Reviewed.
14. **Meanings.** The `uncheckable-template-code` and `uncheckable-letters-are-code` meanings were rewritten to stand alone.
15. **Fix prose.**
    - `capability-background`: the fix says the finding stays.
    - `uncheckable-review-failed`: the prose now describes the CLI's `ERROR` line and exit 1. The section intro no longer claims a `NOTE` line for it.

Nits I acted on:
- Dropped the `capability-privilege` claim about output owners.
- Added advice for `import_csv` (a medium finding for a module that only computes).
- Added an INTRO paragraph on the low `option-injection` that many afters get.
- The negative tests now assert exact problem lists, with more cases (severity problems, uncheckable severity).

**What I did not act on, and why:**
- **#13, `str | None` in a pydantic model fails on Python 3.9.** Branch 1 is Python 3.11 or later, and ruff's UP rules flag `Optional`. It is a port-back step in the debrief.
- **Diff noise from the `<tool id/name>` and `<description>` lines in fix diffs.** A full-file diff is honest and simple. Trimming headers would make the generator guess the XML structure.
- **`argument_injection` after changing meaning (plural to one quoted operand).** The fix prose covers repeats and multiple selects.
- **Folding the packaging test into `test_spec.py`.** It stays separate so the port adds a file without editing `test_spec.py`.
- **The analyser gaps the reviewer found.** They are not caused by this branch and are out of scope (docs only). They went to private reports, which the coordinator has.
- **`rules.DESCRIPTIONS` names `os.path` for `template-file-io` (pre-existing).** That is the analyser's text and belongs on the spec branch.

<details><summary>Full review</summary>

Must-fix: (1) template-app-access overstated sanitizer-off; any `$__user__` read is MEDIUM. (2) app-access fix advice cannot be met; `user_preference_stays_quoted` still MEDIUM + HIGH. (3) untraced-value fix trades the code for a HIGH shell-injection; `shlex.quote` of the get() leaves MEDIUM app-access + LOW. (4) `os.path.exists` gets no finding (in the harmless list); `os.stat` is MEDIUM. (5) `.dataset` is not flagged (nodes.py treats it as sanitized). (6) `head_in_job` after teaches reading a user-named path as clean; use a data input.

Should-fix: (7) six not_flagged cases carry HIGH shell-injection; heading reads as "clean". (8) positional afters rely on the validator with raw `${word.value}`; `'$word'` works. (9) INTRO severity paragraph overclaims for capabilities and low findings. (10) INTRO overclaims what tests check. (11) severity prose unchecked; many tiers have no example; suggest structured severity checked against examples. (12) isolation comment inaccurate; `_review` reads report internals and copies the CLI format with different widths and no `(+N)`. (13) `str | None` pydantic field fails on 3.9 for the port. (14) uncheckable-template-code meaning hard to parse; letters-are-code meaning depends on the description before it. (15) background fix keeps the finding without saying so; review-failed prose wrong about `--fail-on` and NOTE lines.

Nits: diff noise from header lines; argument_injection after changes meaning; capability-privilege fix overclaims; head_in_job case doc ambiguous; no advice for harmless unknown modules (csv); unexplained low option-injection on afters; negative tests use substring matching; packaging test overlaps test_spec.

Checked and fine: severities and trigger lists of all capability rules, tool-code-file/dynamic_options, tool-sanitize-off, output-path, template-exec/network/import module lists, template-include critical/high split, template-compile-exec directives, template-lambda, the output_size_limit allowance, the uncheckable-section claim; fix advice for shlex.quote, `--`, validators, repr() as code, export NAME='$v', select for the program, `\$HOME`, sed --sandbox, awk -v. Design (separate YAML keyed by code) is right for the port; staleness + claims tests suffice; duplication with the generated Rules/Uncheckable sections acceptable. New case docs accurate apart from the above; their expectations are weak alone, but the docs checker pins absences. No third-party tool names.

</details>
