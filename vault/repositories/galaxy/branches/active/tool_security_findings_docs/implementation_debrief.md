# Implementation debrief

**STATUS: READY.** There are two commits on branch 1 (`tool_security_static_findings` at `590a784bd04`), pushed to `jmchilton/tool_security_findings_docs`. The head is `9e7076ae5c8`. The coordinator merges them into branch 1.

## What it does

`doc/source/admin/tool_security_findings.md` is a generated page of about 3,400 lines. It covers each of the 41 codes the review reports: the 9 vulnerability rules, the 27 capability rules and the 5 uncheckable codes.

For each code, the page gives:
- the analyser's one-line description;
- what the code means;
- what each severity means, with the examples at that severity;
- how to fix it;
- examples.

There are three kinds of example:
- **Fix pairs.** The flagged tool and what the review reports for it, then the fixed tool as a unified diff and what the review reports for that.
- **Flagged examples.**
- **"Not flagged with `<code>`" examples.**

Each example is a spec case. The page shows the case's doc, the tool XML and the review's CLI-style output.

When a not-flagged example or a fix's after still has a finding of medium or worse, or an uncheckable code, the page says so in a generated line.

## Commits (port these back to `tool_security_review_spec`)

1. `4f5b3fbb58c` "Baseline tests: spec cases for the findings no case shows, and clean shapes of flagged ones"
   - Adds 46 synthetic spec tools and cases, appended as one block at the end of `cases.yml`.
   - Adds `MANIFEST.in` entries and regenerates the spec section of `tool_security_review.md`.
   - The analyser is unchanged. The cases pin what it reports today.
2. `9e7076ae5c8` "Document each finding of the tool security review on spec cases"
   - Adds `spec/finding_docs.yml` (the prose, and the case ids per code) and `spec/finding_docs.py` (the loader, the claim checker and the renderer).
   - Adds `test/unit/tool_util/security/test_finding_docs.py` and the generated page.
   - Adds the admin toctree entry, a link from `tool_security_review.md`, and the `MANIFEST.in` line for the YAML.

**Regenerate** with `python -m galaxy.tool_util.security.spec.finding_docs > doc/source/admin/tool_security_findings.md`. The command exits 1 and lists the problems if a claim fails.

## How the tests back the docs

`doc_problems()` reviews the tool of every case the YAML names, treating the analyser as a black box (`review_tool_source` and `classify()`). It checks that:
- a `flagged` case and a fix's `before` get the code, and a `not_flagged` case and a fix's `after` do not;
- every code of the analyser's catalog has docs, and every entry in the docs is a code;
- each severity the docs name has an example at that severity, and each severity an example gets is named;
- an uncheckable code has no severity;
- a code without an example says why in `no_example`. Only `uncheckable-review-failed` has none, because a spec case always reviews.

`test_page_is_current` compares the committed page with the generator's output.

Negative tests feed in false claims and assert the exact problem lists.

The prose itself is not checked, and the page says so.

## Design choices

- **The prose lives in a separate YAML keyed by code, not as fields on `cases.yml`.** `cases.yml` keeps the verdicts. The spec branch's `SpecCase` (red/green jobs, refusal codes) differs from branch 1's, and its `cases.yml` is being edited in phase 2. A new file ports without conflicts.
- **The new cases use only expectation fields both branches share:** `findings`, `serious_rules`, `patterns`, `unchecked_locations` and `rewrites`. They never use `codes`, because the docs checker pins the uncheckable codes.
- **The analyser-coupled part is `SECTIONS`, `DESCRIPTIONS` and `Reviewed`** in `finding_docs.py`. `Reviewed` holds the CLI-style lines and the "reports this code" test. The rest reads only the YAML and the tool files.
- **`docs.py` and the generated "Rules" and "Uncheckable codes" sections of `tool_security_review.md` are unchanged**, to keep the port clean. The two pages overlap. The old page links to the new one.

## Port-back notes for `tool_security_review_spec`

These are simulated with `git merge-tree` against `jmchilton/tool_security_review_spec` at `e4da83767c8`.

**Expected conflicts, all mechanical:**
- `cases.yml`: both sides append at the end; keep both.
- `MANIFEST.in`: re-sort the tool lines.
- The generated section of `tool_security_review.md`: regenerate it with the spec's `docs.py`.
- `doc/source/admin/index.rst` merges cleanly.

**The spec branch needs more than a cherry-pick:**
- **No `rules.py` or `classify.py`.** It has `codes.RefusalCode`, and no catalog of capability rules. `SECTIONS`, `DESCRIPTIONS` and `Reviewed` must be adapted there. For example, `Reviewed.reports()` for the uncheckable codes would come from the spec's runtime classification. Or the catalog modules are ported first.
- **`test_every_case_has_jobs`.** Every case must have `green` jobs, and red jobs with a `code` where it refuses. The 46 new cases have no jobs, so the port has to add them.
- **`server_python_command` is a branch-1-only case** (from the rules catalog commit). The `server-injection` and `uncheckable-template-code` docs use it.
- **Python 3.9 typing.**
  - `FindingDoc.no_example: str | None` and `_where(..., line: int | None, ...)` need `Optional`.
  - `dict[str, str]` and `list[...]` in pydantic fields are fine on 3.9.
  - `functools.cache` is 3.9 or later, which is fine.

## Checks

- **Tests.** `test/unit/tool_util/security`: 1,032 pass at the head and 1,017 at the first commit. Each commit passes on its own.
- **Lint.** ruff, black, isort and mypy are clean on `finding_docs.py`. The test file follows the untyped style of the existing security tests.
- **Sphinx build.** A minimal Sphinx build with Galaxy's MyST settings built both pages with `-n` and no warnings. The in-page anchor `#option-injection` resolves.

## Follow-ups (not done here)

- The analyser itself has gaps, which the private reports cover.
- `rules.DESCRIPTIONS` names `os.path` for `template-file-io`, which gets no finding. That is the analyser's text, for the spec branch.
- The fix diffs include the `<tool>` and `<description>` lines, which adds some noise.

**Review.** See `subagents/review_1.md`.
