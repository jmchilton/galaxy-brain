Run via Claude Opus 5.5 at low effort.

**Recommendation: expand modestly. Fold the `element_text_is`/`attribute_is` missing-`^` fix into this branch, keep everything already implemented, and stay on `release_26.1`.** The fix is two one-line code changes in `xml.py` (`re.escape(text) + "$"` becomes `"^" + re.escape(text) + "$"`). It needs no artifact regeneration, because both docstrings already promise exact equality. It adds a few baseline and fix test cases. It is the same class of bug as the `has_line_matching` grouping fix, a regex wrapper that anchors only one end, and it sits in a file the branch already edits. The branch's new `ElementExpression`/`AttributeExpression` text tells users to "use `^` and `$` to match the whole text", while Galaxy's own `*_is` wrappers use only `$`. I confirmed on the worktree that `text="blastp"` passes on `xblastp` and `text="bar"` passes on attribute value `xbar`. Galaxy's existing `test_element_text_is_failure` even says it tests "that prefix is not accepted", which shows exact match was always the intent. The risk is small: the shallow corpus has only 4 `element_text_is` uses (bgruening `jbrowse2.xml`, `session_name`) and no `attribute_is` uses. The one real hazard is element text with leading whitespace (for example, pretty-printed XML), which passes today and would fail. Do not contract back to the docs-only alt. The corpus check behind the grouping fix still holds (about 1,050 uses, 3 accidental `gi|…` hits), and the alt stays available if a reviewer rejects behavior changes on a release branch.

## Possible Decompositions

As implemented, the branch has about 98 changed lines of non-generated code (`text.py` 46, `test_asserts.py` 36, `xml.py` 9, `tabular.py` 7), and the recommended expansion takes it just past 100. The generated artifacts (`galaxy.xsd`, `assertions.py`, `schema.ts`, `ToolSourceSchema.json`) follow whichever source they come from.

1. **Docs only:** baseline tests, the `TextExpression`/`LineExpression` docs, the `xml.py` description text and the `has_n_columns` note, with all artifacts regenerated. This is essentially the `_alt_original_scope` branch plus commit `961b6d0450e`. It lands first and has no behavior change.
2. **Anchoring behavior fixes:** `has_line_matching` `^(?:e)$`, plus `element_text_is`/`attribute_is` `^…$` if folded in, the flipped test counts, and a docstring tweak to `has_line_matching` with its regeneration. This lands second. It carries the behavior-change label and the courtesy galaxytools fix.

A three-way split, with the `*_is` fix as its own PR after (1), is also possible. It needs no regeneration, so it is independent of (2).

## As implemented (re-scoped)

Baseline tests come first. `has_line_matching` gets its own `LineExpression` text and docstring, and `has_text_matching` documents unanchored search and `(?m)`. `has_line_matching` now wraps the expression as `^(?:e)$`, so alternation can't escape the line anchors. The `element_text_matches`/`attribute_matches` descriptions say the search is unanchored, and `has_n_columns` gets a header-width note and a typo fix. All 4 artifacts are regenerated.

| Pros | Cons |
| --- | --- |
| - Covers the issue fully, plus its stated leftovers (grouping, `has_n_columns`).<br>- Fixes the alternation leak instead of documenting it as a pitfall, so the docs describe a clean contract.<br>- The corpus check found no intentional reliance on the leak. | - It is a behavior change on a release branch: 2 live bgruening tests (`tRNAscan.xml:82`, `aragorn.xml:158`) and 1 deprecated IUC tool will fail. Those tests are already vacuous.<br>- It leaves a sibling anchoring bug in `xml.py`, which the branch's own new text now contradicts.<br>- The commit history first says "group alternatives" and then retracts it (see `baseline_refactor.md`). |

## (a) Also fix `element_text_is`/`attribute_is` start anchoring — recommended

Prepend `^` in both wrappers, keeping `$` as is. Add baseline cases that pin today's behavior first: `element_text_is text="blastp"` passes on `xblastp`, and `attribute_is text="bar"` passes on `xbar` (`attribute_is` has no unit tests at all today). Flip those cases in the fix commit. The expected message in the existing `test_element_text_is_failure` changes from `'BA$'` to `'^BA$'`.

| Pros | Cons |
| --- | --- |
| - It is a real correctness bug: an "is" assertion accepts any value that ends with the text.<br>- It is in a file the branch already touches, and it is the same bug class as the grouping fix. Reviewers usually want both fixed together.<br>- It makes the branch's new "use `^` and `$`" advice consistent with Galaxy's own wrappers.<br>- No docs or artifact regeneration is needed, so the diff is about 2 code lines plus tests.<br>- The corpus blast radius is tiny: 4 uses, all `jbrowse2.xml` `session_name` exact strings, plus Galaxy's own unit tests. | - A second behavior change on a release branch, in a different assertion family.<br>- Element text with leading whitespace (`<b> blastp</b>`, or pretty-printed text nodes) passes today and would fail. I confirmed that `" blastp"` passes `text="blastp"` today. This was not checked against real `jbrowse2` outputs.<br>- It adds a little to the PR's behavior-change note. |

<details><summary>Details</summary>

Probe on the worktree (`PYTHONPATH=lib .venv/bin/python`): `assert_element_text_is(<b>xblastp</b>, "blastp")` passes, `assert_attribute_is(x="xbar", "bar")` passes, and `assert_element_text_is(<c> blastp</c>, "blastp")` passes.

A more lenient variant, `^\s*{escaped}\s*$`, would close the prefix leak without breaking whitespace-padded text. However, it loosens trailing whitespace, which fails today unless it is a single final newline, and it is harder to describe as "is". I prefer plain `^…$`, with the lenient form as a fallback if a reviewer raises pretty-printed XML. Python's `$` without MULTILINE still accepts a single trailing `\n`. That is pre-existing and harmless, so `\Z` is not worth the extra behavior change.

Other regex wrappers I surveyed in `asserts/`:
- `has_line` uses `^{re.escape(t)}$` with MULTILINE, which is correct.
- `archive.py` `re.match` prefix semantics are documented.
- `tabular.py` `get_first_line` puts `comment` into `[^{comment}]` unescaped, so a `]`, `^` or `\` comment character would break or change the class. That is a separate latent bug in a file this branch only touches for docs. No one has reported it, and fixing it means changing the meaning of a "comment character(s)" class. Leave it out, or queue it if wanted.

</details>

## (b) Contract back to docs only (`_alt_original_scope`)

Drop `16cfad00004`, so there is no behavior change, and keep the docs telling authors to group alternatives by hand. Optionally keep `961b6d0450e`'s description and `has_n_columns` notes.

| Pros | Cons |
| --- | --- |
| - Exactly the issue's proposed approach.<br>- No behavior change on a release branch, and no galaxytools breakage. | - Documents a plain bug as a user pitfall.<br>- The 3 vacuous corpus assertions keep passing for the wrong reason.<br>- Narrower than Galaxy reviewers usually want, and it reverses a re-scope the first evaluation and the rescope review both supported.<br>- The alt already exists as a fallback, so contracting now gains nothing. |

## (c) Search within each line, without implicit anchoring

Rejected again. It would silently loosen most of the roughly 1,050 existing `has_line_matching` assertions, and it duplicates `has_text_matching` with `(?m)`. The issue and the first evaluation both rejected it.

| Pros | Cons |
| --- | --- |
| - The natural `^I\t` prefix would work. | - Tests would pass for the wrong reason.<br>- A huge behavior change, unsuitable for any release branch. |

## (d) Retarget to `release_25.1`

Rejected again. 25.1 has the bug in `text.py`, `galaxy.xsd` and `assertions.py` but lacks the client artifacts, so the PR would not be self-contained.

| Pros | Cons |
| --- | --- |
| - Follows the "oldest supported release" policy literally. | - Puts two behavior changes on the oldest supported release, which maximizes their exposure for a low-severity issue.<br>- The 26.1 client artifacts would need regenerating again after the merge forward. |

## (e) Normalize CRLF in `has_line_matching`

From the first normal review's probe: `^b$` doesn't match `b\r\n` lines. The problem is pre-existing, and `.*` absorbs the `\r` in practice.

| Pros | Cons |
| --- | --- |
| - Would fix exact-line matches on Windows-style outputs. | - No one has reported it.<br>- Changes counts for any pattern that already handles `\r`.<br>- Not the issue's topic. Leave it out. |

## Follow-ups that stay outside the code scope

- A courtesy bgruening/galaxytools PR escaping `|` in `tRNAscan.xml` and `aragorn.xml` (and fixing `aragorn.xml`'s unescaped `+`). This is a user to-do; workhorses don't open external PRs.
- If (a) is not folded in, queue it per `GX_QUEUING_ISSUE_CREATION.md`. No incubator entry exists yet.
- The PR body needs a behavior-change note, `kind/bug`, and a migration hint to escape a literal `|` as `\|`. If (a) lands, add one more hint: `*_is` now requires an exact match.
