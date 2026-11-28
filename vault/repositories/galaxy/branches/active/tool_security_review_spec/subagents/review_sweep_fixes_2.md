# Review debrief: sweep fixes batch 2 (FN-5, FN-6, FN-7)

I acted on every non-sensitive should-fix and on most nits of the normal review, folding each fix into its cause commit: `f2aa50e9814` (FN-5), `239c63c9f1a` (FN-6), `dfb75acaf62` (FN-7). The review, and the FN-7 fix, also found sensitive issues. Those are older than this batch and sit in code this branch builds on. They went to the private security process and are not recorded here; John has them.

Not acted on:
- Sensitive findings: handled privately. Their fix is planned as a separate commit.
- FN-5 known misses, listed in the commit message: pipes through commands that rewrite lines (`tr`, `sed`, `awk`), `awk` or `sed` reading the dataset, `cut --output-delimiter`, `&>`, and uniq's output operand.
- FN-6 known misses, listed in the commit message: `"%r" % value` and `"{!r}".format(value)`.
- Nit, FN-7: `build_model` still takes `keeps_undeclared_job_parameters` as its one flag. The reviewer confirmed it is exactly `not check_values` (data source tools set `check_values` to false), and renaming it would touch call sites in the runtime caller. A docstring now says it drives both behaviours.
- Out of scope: heredocs, and command substitutions run by an inner shell.

<details>
<summary>Full review (non-sensitive part)</summary>

Reviewer: general-purpose subagent (Claude Opus 5.5). It reviewed `6994d9dcfab..9ec9487c38d` read-only and re-ran the regression diffs, which match.

1. should-fix, FN-7: without parameter wrappers, `.unsanitized` of the SafeStringWrapper is the raw value, but the new rule read it as clean. Done: it is read as raw, string methods as sanitized, and any other attribute as clean. A baseurl param of such a tool is now read as default-sanitized text, which a render test confirmed.
2. should-fix, FN-5: `sort`, `uniq`, `grep` and `tac` were recognised only when reading stdin. Done: they now read file operands too, and grep's pattern, `-e`, `-f` and `--` are handled.
3. should-fix, FN-5: dataset paths written through `.file_name` or `.path` were not recognised. Done: a shared `_dataset_path` helper, also used by `open()`.
4. should-fix, FN-6: repr's quotes were not read inside `sh -c`. Done, along with `.__repr__()`.
5. nit, FN-5: a declaration operand now gets the same "older dash splits it" verdict as a template value.
6. nit, FN-5: a path that is only the start of a word no longer counts. Grep's counting and listing options, `sort -o` and redirects now end the content whatever their order. `grep -e -c` and `grep -- -c` now keep it.
7. question, FN-5: a quoting flip around a substitution in double quotes. The answer: the writes record holds only high-severity harm, and a flip can expose the output only to splitting, which is medium. So this is as sound as the model is for template values.
8. Question on reusing `keeps_undeclared_job_parameters` for FN-7: the reuse is correct. Data source tools set `check_values` to false, so every such tool skips `wrap_input`.

Checked and found fine: the verdicts of FN-5 by place (unquoted, double quotes, command word, nested interpreter, `env`, redirects, separators); the refactor of `placeholder` into `context()`; FN-6's `_repr_verdicts` against how repr() picks its quotes, with the removal of `_ESCAPING_ADDS["pystr"]` equivalent; FN-7's `.value` as clean and string methods as sanitized. Each cause has a fixed case and a neighbour case, all with synthetic tools.

</details>

## Commits and regression (per commit, against the previous run)

| commit | cause | removed | added | changed | tool events |
|---|---|---|---|---|---|
| `f2aa50e9814` | FN-5 | 0 | 4 in 4 tools (1 medium argument-injection, 1 high nested-interpreter, 2 low option-injection) | 0 | 3 |
| `239c63c9f1a` | FN-6 | 0 | 0 | 0 | 0 |
| `dfb75acaf62` | FN-7 | 0 | 0 | 0 | 0 |

FN-5 adds findings in only 1 of the catalogue's 10 grep matches, the confirmed one. The other 9 count lines, assign, use awk, or quote an output, except one real hole whose content passes through `tr`/`sed`, which is a known miss. The other 3 additions are explained: one is a true-positive nested-interpreter finding in a functional test tool, and two are low option-injection findings at the first operand of `[`.

At `dfb75acaf62` these pass: 1021 security unit tests, 2988 spec job tests (run alone) and the 119 tests of `test_security_review.py`. Pushed as a checkpoint, fast-forward from `1452f233609`.
