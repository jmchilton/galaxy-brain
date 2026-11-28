# Review debrief: sweep fixes phase 2 (t28), batch 2 (FP-15, FP-17)

The batch made no analyser change. I dropped the FP-17 commit (`3b63cfbc8f8`) because of the review's blocker, which is a sensitive finding and went to the private security process. FP-15 was skipped before review, because the catalogue's premise is wrong. Its spec pin, which records today's correct HIGH, is held locally as `82236e7fb29` on `tool_security_review_spec_held_t28`, off the branch and unpushed, for John. The branch stays at `e4da83767c8` after this batch.

Not acted on:
- **FP-17, parked for John.** The review found that the "fixed options" reading rests on a Galaxy check that does not always run. The details are in the private notes, with a proposed policy item. Until that is answered, a select narrowed by a `data_meta` filter with a column keeps its finding.
- **FP-15, a design question for John.** No reading of the text before the value can be both sound and narrower. The cheapest sound narrowing needs a sed verdict that waits for the rest of the value's sed line: clear the finding only when that line ends with `/` and holds no other value. Every other shape keeps HIGH. That clears one of the two evidence tools.
- **Catalogue item G (new, pre-existing FN).** A `from_data_table` select with a `data_meta` filter without a `column` is read as admin-defined. Galaxy appends the dataset's metadata values as options. The corpus has 2 such selects, in one shared macros file. This is held with FP-17, whose policy answer decides how these selects are read.
- **Catalogue item H (new, pre-existing FN, nit).** Galaxy strips a filter's `type` attribute, but the analyser compares it exactly, so `type=" data_meta "` reads clean.
- **Wording nit.** The sed HIGH message for an s replacement says the value can "add a command"; the real route is the `e` flag. I left it as is, because changing the wording changes analyser output.

<details>
<summary>Review (non-sensitive)</summary>

Reviewer: a general-purpose subagent (Claude Opus 5.5), read-only, with probes. It reviewed `e4da83767c8..2aea54f30b7`.

1. **Blocker, FP-17:** a sensitive finding about the Galaxy validation the reading relies on. It was recorded privately, with the recommendation to revert and park FP-17 behind a policy item. Done: the commit is dropped.
2. **Question, confirmed:** the new FN of a table select with a column-less metadata filter. It is recorded as item G.
3. **Nit, pre-existing:** the filter type is not stripped. Recorded as item H.
4. **Nit:** the FP-17 commit subject was garbled. Moot, since the commit is dropped.
5. **FP-15 design:** the reviewer reproduced the implementer's GNU sed 4.9 probe matrix on its own:
   - a default-sanitized value in `s/a/V/g` (`/2`, `/gI`, an empty tail, with `-n`/`-E`/`-i`) runs a command through the `e` flag. A `w` flag after it takes the rest of the line as its file name.
   - `--posix` and `--sandbox` refuse it.
   - A tail of only `/` fails with nothing run.

   It corrected one point: the `w` file name runs to the end of the line, not to the end of the s command. That is the basis of the narrowing above.

The reviewer found these fine:
- the sed spec cases (`sed_flags_run_a_command`, `sed_command_position_is_code`): their conventions and harm checks;
- that FP-17's other filter types add no user content;
- the FP-17 regression diff (exactly the predicted single medium);
- code quality.

</details>

## Commits and regression (per commit, against the previous run)

| commit | cause | removed | added | changed | tool events |
|---|---|---|---|---|---|
| `82236e7fb29` (held, off the branch) | FP-15 spec pin (no analyser change) | 0 | 0 | 0 | 0 |
| `3b63cfbc8f8` (dropped) | FP-17 | 1 medium | 0 | 0 | 0 |

Batch 3's analyser baseline is therefore `runs/c-e4da83767c8`. At `82236e7fb29`, the security unit suite and the two app test files pass (1280 tests), and so do 4599 spec job tests run alone.
