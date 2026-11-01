Run via Claude Opus 5.5 at low effort.

**Acted on (coordinator):** fixed the `has_n_columns` nits in a fixup of `961b6d0450e`: the comment-skip caveat, "one field fewer", and the stray backtick. Artifacts were regenerated.

**Not acted on:**
- Low 1 (behavior-change note and labels) and Low 4 (`40db279e2bf` message mentions grouping by hand): these belong to PR text and the autosquash reword at polish time. I recorded them in `implementation_debrief.md`.
- Low 2 (courtesy galaxytools PR) and Low 3 (`element_text_is`/`attribute_is` issue): workhorses don't file issues or external PRs directly, so I raised both as decisions for John.
- The `(?x)` Python 3.10 nit: no realistic impact.
- The `("I\t.*|II\t.*", 3)` case is non-discriminating: the other two flipped cases already pin the fix, and this one documents the recommended form.

**Top line:** I found no blockers or medium code findings. The `^(?:e)$` change is correct and minimal, and every doc claim I checked matches the code. The four generated artifacts agree with the sources, with no stale strings left. Tests pass: 128 passed. The low findings are all process and PR-hygiene items that follow from putting a behavior change on a release branch: the PR needs a visible behavior-change note and labels, the `element_text_is`/`attribute_is` follow-up is not tracked anywhere yet, and the 2 galaxytools tests that will break deserve a courtesy fix. The rest are wording nits.

## Findings

- **Low 1. The behavior change needs to be visible in the PR.** Galaxy has no changelog file; release notes come from PR titles and labels. The PR title and body should say outright that `has_line_matching` now groups alternation, which can make previously passing tests with an unescaped `|` fail. Use `kind/bug` (not `kind/enhancement`), consider `highlight`, and give a one-line migration hint (escape a literal `|` as `\|`). Also name the known affected tests: bgruening/galaxytools `tRNAscan.xml:82` and `aragorn.xml:158`, plus the deprecated IUC `ebi_metagenomics_run_downloader.xml`.
- **Low 2. Courtesy fix for galaxytools.** `scope_evaluation.md` recommends one, but no branch record tracks it. Either queue it, or list it in the hand-off as a user to-do.
- **Low 3. The `element_text_is`/`attribute_is` start-anchor bug is not tracked.** These assertions use `re.escape(text) + "$"`, so `text="blastp"` passes on `xblastp`. The scope evaluation said to file it via the queuing process, but I found nothing in the branch records or `issues_incubator/incubating/`. This matters more now: the new xml parameter text tells users to "use `^` and `$` to match the whole text", while Galaxy's own `*_is` wrappers use only `$`. Queue it per `GX_QUEUING_ISSUE_CREATION.md`.
- **Low 4. The PR description needs to cover the commit sequence.** After autosquash, commit `40db279e2bf`'s message still says it explains "the need to group alternatives", and `16cfad00004` then reverses that. Each message is accurate for its own commit, but a reviewer reading the series could be confused. Two fixes would work: reword `40db279e2bf` when squashing, or say in the PR body that the second commit replaces that advice. Also consider moving `Fixes #24350` so it stays on whichever commit or PR body gets merged; it is fine as is.
- **Nit 1. The `has_n_columns` claim is slightly too broad.** "The header is what is counted" holds only when the header is the first non-comment, non-empty line. A `#chrom…` header with `comment="#"` is skipped. Suggested wording: "...if that header is the first non-comment line, its width is what is counted". "One field less" should also be "one field fewer".
- **Nit 2. The stray backtick is still there.** The scope evaluation suggested fixing the pre-existing "`` `and comment character(s)``" typo in the `has_n_columns` docstring while touching it. That was not done. Fixing it is a one-character source edit, but it costs another artifact regeneration.
- **Nit 3. One new edge-case regression (informational only).** On Python 3.10, a mid-expression verbose flag with a trailing comment (`(?x)foo  # c`) worked before, because the `#` comment swallowed only the `$`. It now fails with "missing )", because the comment swallows `)$`. On 3.11+, any inline global flag that is not at the start was already an error under both wraps. The realistic impact is nil, and I recommend no action.
- **Nit 4. One test case does not discriminate.** `("I\t.*|II\t.*", 3)` counts 3 under both the old and the new wrap. It is a fine positive example for the docs, but only `("I\t|II\t", 0)` and `("I\t|\t5", 0)` (2 and 3 before the change) pin the fix. That is sufficient.

## Verified OK

- **Code.** Both lambdas use `^(?:{e})$` with `re.MULTILINE`. The group is non-capturing, so the group numbers of user backreferences are unchanged (`(a)\1` behaves the same).
- **xml.py claim.** `assert_element_text_matches` and `assert_attribute_matches` both build a `has_text_matching` sub-assertion and run it on the element text or attribute value (xml.py:126, :167). That search is unanchored with no flags, so "not anchored (as in `has_text_matching`), so use `^` and `$` to match the whole text/value" is accurate.
- **tabular.py claim.** `get_first_line` returns the first line matching `^(.+)$` (or `^([^{comment}].*)$`), and `assert_has_n_columns` counts only that line. The claim holds, subject to Nit 1.
- **text.py claims.** The prefix examples, the alternation example `chr1\t.*|chr2\t.*`, the cross-line `\s` caveat, and the `(?m)` workaround for `has_text_matching` all check out (probes below).
- **Artifacts.** There are no remaining hits for "regular expressions to attempt match", "regular expressions to apply against", "group alternatives" or "does not group". The new strings appear the expected number of times. galaxy.xsd has 1 per element. assertions.py has 1 description plus docstrings for both the model and the relaxed model. schema.ts and ToolSourceSchema.json have one copy each per base, model and docstring entry. `ToolSourceSchema.json` parses with `jq`. Docstring `\\t` renders as `\t` in the XSD and in the raw-string models. Commit `16cfad00004` updates all four artifacts together with the source, so each commit is self-consistent.
- **Commit messages.** `16cfad00004` describes the leak and the fix accurately ("'foo|xbar' counted a line 'foo 1'"). `961b6d0450e` is accurate about the delegation and the header note.
- **Tests.** `pytest -q -p no:postgresql test/unit/tool_util/verify/test_asserts.py` gives 128 passed. The flipped counts are correct. Note that `scope_evaluation.md` predicted `("I\t|\t5", …)` would become 2; the real grouped count is 0, and the test is right.
- **Working tree.** Clean. I did not run codegen.

<details><summary>details</summary>

Probes (Python 3.12, MULTILINE, on the test's GFF fixture):

```
'I\t|II\t'       ^{e}$ 2     ^(?:{e})$ 0
'I\t|\t5'        ^{e}$ 3     ^(?:{e})$ 0
'I\t.*|II\t.*'   ^{e}$ 3     ^(?:{e})$ 3
'(?i)i\t.*'      both: ERR global flags not at the start (3.12)
'(a)\1'          both: 0
```

Python 3.10.22:

```
(?x)foo  # c   ^{e}$ ['foo']   ^(?:{e})$ ERR missing ), unterminated subpattern
(?i)FOO        both ['foo']  (DeprecationWarning suppressed)
```

Requirements: `requires-python >=3.10` (pyproject); packages/tool_util `setup.cfg` says `>=3.8`.

On release-branch placement: the scope evaluation's corpus check (about 1,050 uses, 3 accidental `gi|…` hits) supports the change being low risk. The alt branch `_alt_original_scope` keeps a fallback that changes no behavior if a reviewer pushes back. Nothing else is needed in the code. The remaining work is PR text, labels and the two follow-ups (Low 1-3).

</details>
