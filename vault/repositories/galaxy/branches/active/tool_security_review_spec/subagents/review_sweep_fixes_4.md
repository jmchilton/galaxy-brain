# Review debrief: sweep fixes batch 4 (FP-3, `#echo` lines, FP-14, FP-10)

The first review found two blockers in FP-14 and a regression in FP-3. A focused re-review then found one more FP-14 blocker and two gaps in FP-3. All of them are fixed and folded into their cause commits: `844721f912b` (FP-3), `ac382e65772` (`#echo` lines), `b7a0af04a24` (FP-14) and `a3375c7990f` (FP-10). I re-ran the reviewer's synthetic probes at the head. The FP-14 blocker probes now get high findings, and the FP-3 probes stay medium. Nothing sensitive came up in either round.

Not acted on:
- An FP-3 extension that read a value which closes its own quotes as low: dropped. It changed nothing in the corpus and made a known gap less visible.
- New catalogue item A, older than this batch (high per shape, low reach): a value that can hold a quote but no command character flips quoted template text that holds `;`, `|`, `&`, `<`, `>`, `$` or a backtick (and a newline in a script) into command syntax. Example: `echo "$p|$q"`. No level refuses it, because the job check's `stray-quote` refusal frees only values whose own unquoted harm is high. FP-3 now keeps such a value at medium. The proposed fix: record "quoted template operators" per location, and have the job check refuse any value there that can open or close a quote as a stray quote. That fix needs a change to the job check.
- New catalogue item B, older than this batch: an untainted value that is not literal text (`#set o = "'".strip()`) is not fed to the shell lexer, so its quotes do not change the quote state. `echo '${o}$p${o}'` runs with a sanitized-looking `$p` read as quoted. FP-14 now feeds the lexer such a value's possible backslash, but not its quotes.
- The `#echo` line placement is still a heuristic. An expression whose text holds `#` can be misplaced. Placement affects reporting only.
- The cost of being conservative: FP-3 keeps one tool at medium, because an integer the analysis cannot bound is written inside the same quotes.

<details>
<summary>Full review (non-sensitive)</summary>

Reviewer: general-purpose subagent (Claude Opus 5.5), in two rounds. It worked read-only, with synthetic probe tools and the spec job runner.

Round 1, `24f783313cc..fa1a994b250`:
- B1 blocker, FP-14: a backslash the template writes before an escaped value (`"\\" + p`, `%`, `.format`, `join`, `${b}${p}`) undid the escape, and the job ran at every level. Done: no escape credit while a backslash is pending, and joins drop the escaping when the other side holds a covered character.
- B2 blocker, FP-14: escapes were credited inside backticks, where bash strips the backslash and parses again. Done: no `bs-escaped` or `dq-escaped` credit in a backtick frame.
- S1, FP-14: escaped `/` and `-` hid path traversal and option injection. Done: they stay visible to those checks.
- S2, FP-3: a regression in poisoned templates (the medium triggered the strict check, the low no longer did), and the closed-quote extension. Done: such values keep medium, and the extension is dropped.
- N1: `#echo` line placement with several directives on one line, `##` comments and `#elif`. Done.
- N2: a letter mapped to `\` was missed. Done.
- N3: what each escape kind means was spread over six tables. Done: one `values.ShellEscaping` record per kind.

Round 2, `24f783313cc..2876232a474`:
- Blocker, FP-14: a backslash from an untainted value that is not literal text (`"\\".strip()`, `chr(92)`, a dict lookup, an `if` expression) still undid the escape. Done: such a value sets the lexer's backslash flag unless its characters are bounded (Galaxy paths, numbers, the listed texts of booleans and selects).
- Should-fix, FP-3: a newline inside quotes in a script, and operators from untainted values that are not literal text. Done.
- The reviewer confirmed the rest: the B2 shapes nested both ways, FP-3's condition across lines, `#if`, `#def` and loops, the `#echo` shapes, and that the `ShellEscaping` record matches the old single- and double-quote meanings apart from three stricter changes.

</details>

## Commits and regression (per commit, against the previous run)

| commit | cause | removed | added | changed | tool events |
|---|---|---|---|---|---|
| `844721f912b` | FP-3 | 0 | 0 | 13 medium to low in 11 tools | 6 cleared |
| `ac382e65772` | `#echo` lines | 93 | 93 | 0 (line moves only, 52 tools) | 0 |
| `b7a0af04a24` | FP-14 | 0 | 0 | 7 high to medium in 3 tools | 3 |
| `a3375c7990f` | FP-10 | 7 high in 4 tools | 0 | 0 | 3 (1 cleared) |

The catalogue predicted 26 findings in 22 tools for FP-3. The other 12 findings are mediums for values that can close their single quotes, and those params also allow dashes, slashes and globs, so medium is right. The catalogue's "3 tools only lose `\"`" under FP-14 did not happen, correctly: those tools write the value inside single quotes, or use a single-quote escape. FP-10 removes 2 findings the catalogue did not predict, through the new concatenation rule. Both are false positives.

At `a3375c7990f` these pass: 1115 security unit tests, 3904 spec job tests (run alone) and 119 in `test_security_review.py`. Pushed as a checkpoint.
