# Implementation debrief: sweep fixes, phase 1

```
created .../tool_security_review_spec/differential-review/snapshots/20261128T115243Z-revision-f8955682e6d0.json
  revision @ f8955682e6d0 vs origin/release_25.1 (merge-base fa9176afc8f9)
  first snapshot: 146 commits, 165 files, 180 hunks
```

Phase 1 of the planemo-monitor sweep fixes (gx_workhorse-3, t25) is `1452f233609..f8955682e6d`, 18 commits, pushed to `jmchilton/tool_security_review_spec`. Each catalogue cause is one commit, with the review fixes folded in. The snapshot is against `release_25.1`, so it includes mvdbeek's 85 commits.

## Causes fixed

| commit | cause | what the analyser now does |
|---|---|---|
| `8fb67a1e997` | spec `absent:` | A spec case can require that a finding is not reported. |
| `0e088d32d46` | job-parameter reads (t26) | Only names a template looks up in the namespace are read as job parameters. |
| `4dcdd58694f` | FN-3 | A Python configfile string that a shell runs is read as a shell command. |
| `66ad30e7ab5` | FN-4 | The braces of a JSON value reach the f-string it is written in. |
| `6994d9dcfab` | `$self.getVar` (review) | `$self.getVar(...)` is read as getVar. |
| `f2aa50e9814` | FN-5 | A command substitution that reads a dataset gives the dataset's content. |
| `239c63c9f1a` | FN-6 | `repr()` of a string in the shell is a word between its own quotes. |
| `dfb75acaf62` | FN-7 | The inputs of a tool that doesn't check its values are plain strings. |
| `5124a7e3d9b` | FP-2 | A color param is a validated colour where Galaxy checks colour values (25.1 and later). |
| `5840fb222be` | FP-4 | Only the dataset members that hold text are user text. |
| `24f783313cc` | FP-16 | A conditional's selector tested by subscript narrows like the selector. |
| `844721f912b` | FP-3 | Quotes in an unquoted value of plain words only regroup words. |
| `ac382e65772` | `#echo` lines | A finding of an `#echo` is placed on the directive's line. |
| `b7a0af04a24` | FP-14 | A sanitizer mapping that writes a backslash escape is read as the escape. |
| `a3375c7990f` | FP-10 | Single-quote escaping written or kept by string methods is read as escaping. |
| `a4329243423` | FP-11 | A `re.sub` pattern held in a `#set` local is read as its literal. |
| `366093311e2` | test challenge | Drops 24 unit rows that a spec case pins. |
| `f8955682e6d` | test challenge | Pins 15 gaps the mutations found. |

## Regression over the corpus (per commit, against the previous run)

- No finding change: `absent:`, job-parameter reads (102 strict reads gone in 8 tools, none added), FN-3, FN-4, `$self.getVar`, FN-6, FN-7, FP-11.
- FN-5: 4 findings added in 4 tools (3 tool events), all explained.
- FP-2: 86 removed in 31 tools (17 tools high to none, 5 high to medium).
- FP-4: 106 net removed in 36 tools (11 tool events).
- FP-16: 4 removed in 1 tool (high to medium).
- FP-3: 13 findings medium to low in 11 tools (6 cleared).
- `#echo` lines: 93 line moves in 52 tools, no finding change.
- FP-14: 7 findings high to medium in 3 tools.
- FP-10: 7 high removed in 4 tools.

The per-batch tables are in `subagents/review_sweep_fixes_1.md` to `review_sweep_fixes_5.md`.

## Tests

- The unit suites pass at each commit. At `f8955682e6d`, 1250 unit tests pass (`test/unit/tool_util/security` and the two `test/unit/app/tools` security files).
- At the held head (below), 1147 security unit tests and 161 app tool tests pass, and the 4136 spec job tests of `test_security_review_spec.py` pass when run alone.
- Test challenge (`test_challenges_debrief.md`): 119 mutations, 88 red. 17 of the 31 survivors were real gaps and are now pinned: 15 in `f8955682e6d`, 2 in the held FN-1 commit. The other 14 are masked, unobservable, or only over-report. 27 unit rows that repeat a spec case were dropped. The debrief says nothing was pushed; phase 1 was pushed after it.

## Held for John

Two commits are on the local-only ref `tool_security_review_spec_held_t25`: a job check correctness change (`28bb64893ed`) and FN-1 (`a758723250d`). They wait for John's go-ahead before they are pushed.

## Skipped

- FP-1: waits for John's answer on the static default.
- FP-5: waits for John's answer on unvalidated emails.
- FP-12: waits for a decision from John.
- FN-2: has an open question.
- FN-8: a proposal, not a fix.
- POL items: policy, not analyser fixes.
- New catalogue items A (a value that can hold a quote but no command character, inside quoted template operators), B (quotes of an untainted value that isn't literal text) and C (a leading dash after a template splits a value): all older than this phase, left as follow-ups.

## Next

Phase 2: FP-6, FP-7, FP-13, FP-15, FP-17 and FP-18 to FP-22. Then `tool_security_static_findings` is re-synced; its source pin is still `1452f233609`.
