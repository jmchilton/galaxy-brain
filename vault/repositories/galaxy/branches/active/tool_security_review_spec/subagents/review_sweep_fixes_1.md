# Review debrief: sweep fixes batch 1 (`absent:`, job-parameter reads, FN-3, FN-4)

I acted on findings 1–7 of the normal review and accepted finding 8 as is. The fixes are folded into their cause commits, so each cause is still one commit. The reviewer's pre-existing finding (`$self.getVar`) became its own commit. After the fixes the range is `8fb67a1e997..6994d9dcfab`, and every corpus regression run shows 0 finding changes.

Not acted on:
- Nit 8, FN-4: inside an f-string, `json.dumps` of a dict literal now gets a medium, because the braces come from the dict and not from the user. That f-string also fails when it runs, so real tools are unlikely to have it.
- Known FN-3 gaps, listed in the commit message: a command built by concatenation, `%` or `.format`, or held in a variable; aliased imports; `shell=True` itself (any string first argument of `subprocess.run`/`Popen`/... reads as shell); and the command-position, option-injection and nested-interpreter verdicts inside the sink string (only the quoting verdict is applied).
- In a `#def`, `$KWS` still reads as a job parameter through the interpreter's written refs. That predates this branch and is on another path.

<details>
<summary>Full review (non-sensitive)</summary>

Reviewer: general-purpose subagent (Claude Opus 5.5). It reviewed `1452f233609..fd3fb9fdf98` read-only, ran probes and runtime Cheetah checks, and confirmed the regression diffs.

1. should-fix (soundness), job-parameter reads: the filter dropped every name in `template_attributes()`, which includes TreeDict's attributes (`data`, `clean_copy`). Cheetah tries a namespace's key first, so those names do reach job parameters. Done: a narrower `template.answered_before_namespace()` (`dir(Template)`, `dir({})`). The shared set is unchanged.
2. should-fix (soundness), FN-3: in a non-raw Python string, a backslash in the value becomes an escape that can write any character the shell reads. Done: such values are judged with every probe character, with a new job-check mark `charsets.ESCAPE`, and the spec case `python_os_system_escapes`.
3. should-fix (FN breadth), FN-3: f-strings, a sink string on the next line, and `args=` were not matched. Done, with unit rows. The data-flow forms are left as known gaps.
4. nit, FN-3: escapes were decoded in raw strings, and `\xNN` and octal escapes were not decoded. Done: `_Text.raw`, and fuller decoding.
5. nit, job-parameter reads: `self`, `trans` and the preamble locals were still read as job parameters. Done: `Method.preamble` seeds the frame.
6. should-fix (abstraction), job-parameter reads: the new walker repeated `_Purity`'s frame rules. Done: one `lambdas.scopes()` walker serves both. The new audit set is now `unbound_lookups`.
7. should-fix, pre-existing: `$self.getVar("x")` was not read as getVar. It got no finding and no read, but the job value reaches the command. Done: `6994d9dcfab`, with spec cases `getvar_self` and `getvar_self_sanitized`.
8. nit, FN-4: dict-literal braces. Accepted.

The reviewer found these sound: `absent` matching; reads after `#set` inside `#if`, `#try` and `#while`; loop variables after the loop; `#def` and `#block` reading template-level names; `#set global`; getVar with defaults; comprehension and lambda frames; extracting `_quoting_verdict`; the FN-4 f-string forms.

</details>

## Commits and regression (per commit, against the previous run)

| commit | cause | removed | added | changed | tool events |
|---|---|---|---|---|---|
| `8fb67a1e997` | spec schema `absent:` | 0 (no analyser change) | 0 | 0 | 0 |
| `0e088d32d46` | job-parameter reads (t26) | 0 | 0 | 0 | 0 (102 strict reads gone in 8 corpus tools, none added) |
| `4dcdd58694f` | FN-3 | 0 | 0 | 0 | 0 |
| `66ad30e7ab5` | FN-4 | 0 | 0 | 0 | 0 |
| `6994d9dcfab` | `$self.getVar` (review) | 0 | 0 | 0 | 0 |

At `6994d9dcfab`: 982 security unit tests, 2674 spec job tests (run alone) and the 119 tests of `test_security_review.py` pass, and lint is clean.
