Run via Claude Opus 5.5 at low effort.

**Recommendation: expand modestly and stay on `release_26.1`.** Fix the ungrouped wrap, so that `has_line_matching` runs `^(?:{e})$` (scope a). Rewrite the "group alternatives" advice to say that alternatives are grouped automatically. Flip the expected counts of the two ungrouped baseline cases in the fix commit. Add the optional `has_n_columns` header-width note (scope c). Sharpen the `element_text_matches`/`attribute_matches` expression descriptions to say they search the element text without anchors (part of scope d). I checked the risk of (a) against a local shallow corpus: tools-iuc, bgruening/galaxytools, tools-devteam, IWC workflow tests and Galaxy's own tests. Of roughly 1,050 `has_line_matching` uses, only 3 have a top-level unescaped `|`. All 3 are accidental, because they contain literal `gi|…` sequence IDs that were never escaped, and they pass today only because the leak reduces each one to the prefix match `^gi`. The fix would turn these 3 vacuous passes into failures: 2 live tests in bgruening/galaxytools (`tRNAscan.xml`, `aragorn.xml`) and 1 deprecated IUC tool. No test in the corpus relies on the leak on purpose. Search-within-line (b) and retargeting to `release_25.1` (e) should be rejected. The start-unanchored `element_text_is`/`attribute_is` bug found during (d) should be filed as a follow-up rather than folded in.

The branch has about 80 lines of non-generated code (`text.py` plus tests), so there is no decompositions section.

## As implemented (docs only)

`has_line_matching` gets its own `LineExpression` description and docstring, which cover the per-line `^expression$` wrap, the `.*` needed for prefixes and grouping alternatives. `has_text_matching` gets a description of its unanchored search and `(?m)`. All 4 generated artifacts are regenerated, and baseline tests pin the current behavior.

| Pros | Cons |
| --- | --- |
| - Matches the issue's proposed approach exactly.<br>- No behavior change, so no risk to tests in the wild.<br>- Fixes every generated schema (XSD, pydantic models, `schema.ts`, `ToolSourceSchema.json`) at once. | - Documents the alternation leak as a user pitfall ("group alternatives") instead of fixing what is plainly a bug.<br>- Leaves the issue's own leftover items (grouping, `has_n_columns`) for another round of review and regeneration.<br>- Narrower than Galaxy reviewers usually want. |

## (a) Group the wrap as `^(?:e)$` — recommended

Change the two lambdas in `assert_has_line_matching` to `^(?:{e})$`. Then replace the docstring's "group alternatives" advice with "the whole expression, including alternatives, must match the line". The baseline cases `("I\t|II\t", 2)` and `("I\t|\t5", 3)` change to 0 and 2, or they become the red tests for the fix commit.

| Pros | Cons |
| --- | --- |
| - It is a two-character bug fix in the code the branch already touches, so the docs describe a clean contract instead of a quirk.<br>- The corpus shows no intentional reliance on the leak: about 1,050 uses, 3 top-level-`\|` hits, all accidental literal `gi\|…` IDs.<br>- It exposes vacuous assertions: `aragorn.xml` also has an unescaped `+` quantifier, so its expression would not match the literal line anyway.<br>- The baseline tests already pin the exact cases that change, so the diff in counts is easy to review. | - It is a behavior change in a release branch. 2 live galaxytools tests (and 1 deprecated IUC tool) would start failing the next time they run against a Galaxy or galaxy-tool-util that includes the change.<br>- Some reviewers may prefer behavior changes to go to `dev`.<br>- The PR needs a changelog-worthy note. A courtesy PR escaping `\|` in the 2 galaxytools tests would be considerate. |

<details><summary>Corpus check details</summary>

Shallow sparse clones of `*.xml` and `*.yml` files, taken 2026-11-01, are in the session scratchpad under `corpus/` and are not committed. I scanned them with a script that parses each `has_line_matching` expression with `re._parser` and flags those whose top level is a `BRANCH`.

- tools-iuc: 834 uses. One real hit, `deprecated/tools/ebi_tools/ebi_metagenomics_run_downloader.xml:123`, with an unescaped `…/2-41|G3DSA:…`. `teloscope.xml:207` was a false positive: `(?:\s|$)` is already grouped and the parser inlines it.
- bgruening/galaxytools: 150 uses. Two hits, `tools/rna_tools/trna_prediction/tRNAscan.xml:82` (`gi|240255695:… \t1\t381…`) and `aragorn.xml:158` (`gi|240255695:…\taragorn\ttRNA…\t+\t…`). Today both reduce to `^gi` OR a line-end suffix, so they pass on any line that starts with `gi`. Once grouped, neither alternative matches a whole real line, so they fail.
- tools-devteam: 10 uses, no hits. Galaxy's own `test/`, `tools/` and `lib/galaxy_test`: no hits.
- IWC workflow tests: about 52 `expression:` lines under `has_line_matching`. Every `|` is escaped (`\|`, for example in SnpEff `EFF=` fields) or sits inside a group (`(LDHB|RPS12)`). No hits.
- Other uses of `|` in the corpus are all inside groups (mothur, iqtree, proteinortho, newfave, clipkit), so grouping does not change their meaning.

Likelihood of breaking tests in the wild: low. About 0.3% of the sampled uses are affected, all of them assertions that are already wrong. Private and non-IUC tool repos were not sampled, but the failure mode is the same: the leak only matters when someone writes an unescaped `|`. In practice that almost always means a literal pipe in an ID, which the test author never meant as alternation.

</details>

## (b) Search within each line (no implicit anchoring)

Drop the wrap and count lines where `re.search(e, line)` matches.

| Pros | Cons |
| --- | --- |
| - The natural prefix regex `^I\t` would then work. | - It silently loosens most of the ~1,050 existing assertions. A bare `foo` that means "exactly `foo`" today would match `foobar`, so tests would pass for the wrong reason, which is worse than failing.<br>- It mostly duplicates `has_text_matching` with `(?m)`.<br>- The issue and proposal already rejected it.<br>- Not suitable for a release branch. |

## (c) `has_n_columns` header-width note — recommended

Add one sentence to the `assert_has_n_columns` docstring. It measures only the first non-comment line, so when the header and data rows differ in width (for example, R `write.table(row.names=TRUE, col.names=TRUE)`) it reports the header's width. While there, fix the stray backtick in "`` `and comment character(s)``". Then regenerate.

| Pros | Cons |
| --- | --- |
| - Proposed in the issue's source note and listed as a leftover in the issue debrief.<br>- Same theme (assertions that quietly measure something other than what the author expects).<br>- The code (`get_first_line`) confirms the claim, and it is accurate.<br>- The same codegen run regenerates the same 4 artifacts. | - Touches a second assertion module, adding a little review surface.<br>- Optional by the issue's own wording. |

## (d) Other assertions with shared or misleading parameter docs

I surveyed the `asserts/` regex parameters:

- `xml.py` `ElementExpression`/`AttributeExpression` ("The regular expressions to apply against the target element"). These delegate to `has_text_matching`, so they search without anchors. Recommended: a one-clause addition to each description saying "searched anywhere in the element text/attribute value (not anchored)", the same treatment `Expression` got.
- `archive.py` `Path` already documents its `re.match` prefix semantics in the docstring. No change.
- `tabular.py` `Comment` is used inside a character class (`[^{comment}]`). "Comment character(s)" is accurate enough. No change.
- Side finding, a behavior bug: `element_text_is` and `attribute_is` call the `*_matches` assertions with `re.escape(text) + "$"` and no leading `^`. As a result `element_text_is text="blastp"` passes on `xblastp`, which I confirmed with Python `re`.

| Pros | Cons |
| --- | --- |
| - The XML description tweaks are one line each, use the same codegen, and continue the "regex semantics are undocumented" theme of #24350/#13145. | - The `element_text_is`/`attribute_is` fix belongs to another assertion family, and adding `^` could break tests whose element text has leading whitespace. There are only 4 uses in the corpus, so its impact is small either way. It is better filed as a follow-up issue (via the queuing process) than folded into this PR. |

## (e) Target `release_25.1` instead of `release_26.1`

25.1 (released 2025-12-12) is inside the 1-year window and has the bug in `text.py`, `galaxy.xsd` and `assertions.py`. It does not have the client artifacts (`schema.ts`, `ToolSourceSchema.json` lack the descriptions there, and so does 26.0).

| Pros | Cons |
| --- | --- |
| - Follows the "oldest supported branch with the bug" policy literally.<br>- galaxy-tool-util 25.1.x users would get the corrected XSD and model docs. | - The PR would not be self-contained, because 26.1's client artifacts would need regenerating again after the merge forward.<br>- If (a) is included, putting a behavior change on the oldest supported release maximizes exposure for a low-severity docs/quirk fix.<br>- This is a docs-heavy, low-severity issue, so the user's preference for intricate or low-severity fixes points to a newer target. Keep `release_26.1`. |
