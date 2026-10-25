# Codex review (round 2)

Acted on both findings (P2, confirmed). Each was a linter false positive, and planemo lint fails on warnings by default. Both are fixed red-to-green and folded into the linter commit `3e07ada26ac`:
1. A short test-param name shared by several inputs no longer warns. For example, a single select `other|dup` next to a multiple `dup`: the linter now skips names that more than one input uses.
2. A selection made only of ordinary options no longer warns. For example, `value="c,d"` on a multiple select that also has an `x,1` option: the linter now warns only when a comma-split part isn't an option value or label.

Also fixed while at it: the linter now skips nameless input params instead of crashing in `_parse_name`. It also no longer warns on empty parts (`value=""`, an empty multiple selection). The `value=""` fixture case only guards against a regression: the committed linter didn't warn on it either.

Not acted on: nothing.

<details>

Scope `git diff origin/release_25.1...HEAD` at `09d4aa1e11b`, read-only `codex exec`. Files reviewed: verify/parse.py, interactor.py, linters/tests.py, linters/_util.py, lint.py, parser/interface.py, parser/util.py, parser/xml.py, parameters/case.py, tools/parameters/basic.py, galaxy.xsd, the new tool and its conf entry, both unit test files. Codex ran 98 targeted unit tests (passed); it didn't run framework tests.

- "Match test parameters by their full input context" (P2, certain). Section `s` has a multiple `mode` with option `x,1`; a top-level single `mode` has option `a,1`. `<param name="mode" value="a,1"/>` warned, but parsing gives `['a,1']`. CONFIRMED. Fixed by skipping names that aren't unique, a conservative choice that avoids building qualified-path matching.
- "Avoid warning for unambiguous selections of comma-free options" (P2, certain). A multiple select has options `x,1`, `a` and `b`; `value="a,b"` warned. CONFIRMED. Fixed by checking the split parts against option values and labels.

Round 1 is in `earlier_drafts/1/codex_review.md` (ftpfile default; fixed).

</details>
