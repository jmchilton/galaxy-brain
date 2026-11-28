# Review debrief: sweep fixes batch 5 (FP-11, a job check commit, FN-1)

I acted on every finding of the normal review and folded each fix into its cause commit. FP-11 is `a4329243423` (pushed). Two commits are held unpushed for John, because their details are sensitive: `501c8fefa56`, a job check correctness change, and `4c7840f8806` (FN-1). The review raised sensitive findings on the held commits, and they went to the private security process. All of them are fixed in those commits, except the one listed below.

Not acted on:
- FP-12 (a one-character length validator) was skipped before review. It needs a decision from John, which is in the private notes.
- New catalogue item C, older than this batch: the job check computes a value's leading-dash mark on the whole value. A template that splits the value on a separator (`str($p).split(',')`, or the content of a dataset) writes elements whose own leading dash the check doesn't see. Lines are now covered for dataset content.
- FN-1 still misses a config that another config read by the program includes, and a config the program reads from stdin. Both are named in the commit message.
- Nit, kept on purpose: the job check's content marks use Python's whitespace classes, not the shell's. Templates read content in Python, and Python splits on more characters than the shell does.

<details>
<summary>Full review (non-sensitive part)</summary>

Reviewer: general-purpose subagent (Claude Opus 5.5). It reviewed `a3375c7990f..de3ff47f509` read-only, ran 40 synthetic FP-11 probes, brute-forced the content mark scanner against whole-content marks (759,240 checks, 0 mismatches), and checked the held commits' red jobs against the parent.

1. should-fix, FN-1: a staged-copy consumer overrode content sniffing, so a real Python script was downgraded from high to low. Done: sniffing wins.
2. should-fix, FN-1: options were matched in one spelling only. Done: one or two dashes, prefixes and the `=` form are matched, and the staged rule also matches interpreter scripts.
3. question, FN-1: the reading of evaluated expressions was partial. Done: whole parameter values that can hold `(` and `)`, values that can hold a newline on any line, and continued lines are all read as code. `condition =` is now matched per logical line.
4. should-fix, job check: a raw value was unwrapped only at the top level. Done: list and tuple items are unwrapped too.
5. nit, FP-11: the rewrite record ignored the resolved pattern. Done: a pattern held in a local is now a checkable literal rewrite.
6. nit, job check: whitespace classes. Kept, for the reason above.
7. design nits, FN-1: the consumer kinds were bare strings, and the spec patched a module global. Done: a typed `ConfigConsumer` table with one accessor, which tests extend through a context manager. The spec uses stand-in programs.

Enforcement answer: a tool that gains FN-1's code findings is refused for every job under `enforce_code` with `when_unsure` set to strict or refuse. Perl configfiles are already treated this way.

Checked and found fine: FP-11's single-literal resolution stays unresolved for loops, branches, `+=`, unbound paths, comprehensions and `re.compile`, while `#set global`, `#def` side effects and `exec` correctly can't change frame locals. The job check's scanner is exact across chunk boundaries, the fallbacks carry every mark, and all new red spec jobs fail at the parent.

</details>

## Commits and regression (per commit, against the previous run)

| commit | cause | removed | added | changed | tool events |
|---|---|---|---|---|---|
| `a4329243423` | FP-11 | 0 | 0 | 0 | 0 |
| `501c8fefa56` (held) | job check | 0 | 0 | 0 | 0 (job check only) |
| `4c7840f8806` (held) | FN-1 | 0 | 13 in 4 tools (5 high, 8 medium) | 2 (low to high) in 1 tool | 1 |

FP-11's 2 predicted findings were colour params, which FP-2 had already cleared on this base. A review with `colors_validated=False` shows the fix clears them on older bases. The 20 FN-1 tools in the catalogue are an upper bound. 4 of them gain findings, all on evaluated parts. The rest have no configfile, or pass their configfile to no listed program.

At `4c7840f8806` these pass: 1156 security unit tests, 147 in `test_security_review.py`, and 4136 spec job tests (run alone).
