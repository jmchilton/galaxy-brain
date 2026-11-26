# Review: static findings port

Acted on in `e9e1d8eb1a5`: bug 1 (stale `judge.py` comment), nits 1 (py3.8 leftovers; kept `Optional["AV"]` alias), 3a (`added_by_rewrites`), 3b (docs define `checkable`), 4, 5 (docs), 6 (`path_like_name` doc), 8 (`galaxy-tool-security-review` console script).

Not acted on:

- Nit 2, ~20 "job check" comments in the analyser: comment-only, mvdbeek's code; fold into the history squash/reword pass.
- Nit 3, keep job-check data in reports: kept (recommended), decision noted for John.
- History hygiene (~40 messages describe runtime; squash plan): needs John's decision — squash vs keep 84 cherry-picks.

<details><summary>Full review</summary>

# Port review: static tool security findings — 2026-11-25

**Verdict: ready after cleanup. No blockers.** Nothing in the diff wires the review into Galaxy at runtime: no app, config, evaluator, job runner, galaxy_mock or API test changes. No static analyser code or test was lost. `security/` differs from source `d5f7cb05e91` only by the two final commits, and the analyser modules differ only by lint. That backs the byte-identical claim; I did not rerun the 386 tools. Removing the 4 tests, 4 cases, `codes.py` and `enforced*()` is justified. What remains: job-check vocabulary in comments, dead py3.8 shims, and a commit history that still tells the story of runtime enforcement. The history needs a squash/reword before a PR.

Checks run in WORKING_DIRECTORY:
- `pytest -q test/unit/tool_util/security`: 535 passed in 8.5 s.
- CLI on `stray_quote.xml`: 2 HIGH shell-injection and 2 LOW option-injection, exit 0.
- ruff, black, isort: clean.
- mypy from `lib/` on the security package, `sanitize.py` and `basic.py`: no errors in branch files. The 22 errors are in unrelated modules (env stubs).
- `uv build` of `packages/tool_util`: the wheel ships `cases.yml`, all 39 spec XMLs and `parser/sanitize.py`. I removed the build artefacts afterwards.

## Bugs

None functional. Closest to a bug:

1. `lib/galaxy/tool_util/security/judge.py:67`: the comment says "Optional rather than `str | None`: pydantic evaluates…". The lint commit changed the line below it to `str | None`, so the comment now contradicts the code. Fix: delete the comment. Pydantic on 3.11 handles `X | None`.

## Nits

1. **py3.8/3.9 leftovers, dead on dev's 3.11 floor.**
   - `test/unit/tool_util/security/conftest.py` (whole file: collect-ignore under 3.9). Delete it.
   - `lib/galaxy/tool_util/security/values.py:463`: the "typing.List … supports Python 3.8" comment is stale. Delete the comment and keep `Optional["AV"]`. `BoundCall` is a runtime alias, not an annotation, so `"AV" | None` would raise `TypeError` at import.
   - `lib/galaxy/tool_util/security/charsets.py:28-33`: the `sre_constants`/`sre_parse` fallback for Python < 3.11. Import `re._constants` / `re._parser` directly.
   - `lib/galaxy/tool_util/parser/sanitize.py:5`: `from __future__ import annotations` came from the py3.8 commit `1b7c00452cd`. On 3.11 `list[str]` needs no future import. Drop it so the move stays a pure rename.
2. **"Job check" vocabulary in analyser comments and docstrings.** These name a component that is not in the tree:
   - `values.py:59,97`
   - `charsets.py:80`
   - `report.py:60,183,197,300`
   - `capabilities.py:134`
   - `nodes.py:94,162,200,357`
   - `interp.py:136,138,458,562-563,581,593,1148,1853`
   - `patterns.py:59`

   Reword them neutrally, e.g. "a check of a value's concrete characters". The framing commit fixed only `patterns.py`'s module docstring and the `tool_security_review` mentions.
3. **Job-check data still kept and emitted (decision for John).** It is still computed, and `--json` emits it:
   - `Report.writes`, `closers`, `reads`, `rewritten`
   - `Finding.breakout`, `requires`, `closes`, `needs_closer`, `unchecked`, `level`, `data_requires`, `checkable`
   - `charsets.LEVELS` / `DATA_HARM` / `level_of`

   No static caller reads them beyond tests and the spec's `checkable`/`unchecked_locations`. Keeping them preserves output identity and lets mvdbeek's runtime piece stack later, so I recommend keeping them.

   Caveat: these fields were pinned mainly by the dropped runtime tests (`test/unit/app/tools/test_security_review.py`, whose `refused()`/`check_job` cases exercised them). In this branch, tests reference `needs_closer`, `closes`, `closers`, `level` and `data_requires` 0 times, and `rewritten` 2 times. They ship in `--json` with no test behind them. If they stay, add a few `test_sources.py` assertions on them, which needs no runtime.

   Two changes regardless:
   - (a) Remove `Report.added_by_rewrites` (`report.py:240`). It has zero callers in lib or tests; its only callers were in `galaxy/tools/security_review.py`.
   - (b) In the docs page, define "checkable" and the JSON keys, or say they are inputs for a value-level check. Right now `checkable: true` shows up in many generated cases with no definition.
4. `doc/source/admin/tool_security_review.md:15-16`: `--judge` sends only *vulnerability* findings at medium or above (`judge.py:275-284`), never capabilities. Say "each vulnerability finding". Also add one line on offline install: `pip install galaxy-tool-util` gives the CLI and spec. `anthropic` is optional, only for `--judge`.
5. `doc/source/admin/tool_security_review.md:33-35` (Findings section): "templates whose values no character test can judge" is job-check phrasing. Suggest "templates the review could not fully follow, or that pipe text into a shell to run (`unchecked_locations`)".
6. `cases.yml` `path_like_name` (around `cases.yml:144`): the doc claims "a slash or a leading dash in it gets no finding", but nothing pins that. `findings` is a must-match list and `serious_rules` covers only high/critical. This is acceptable, since a future path-traversal finding would be an improvement, but the doc would then be wrong and nothing would catch it. Option: drop the sentence, or add an exact-rules expectation.
7. Sanitizer move:
   - Content matches dev's latest apart from the future import and one deleted TODO.
   - Importers: only `basic.py`. The `interface.py` docstring, `mypy.ini` section and both `doc/source/lib` stubs are updated.
   - No hits for the old path in local clones of planemo, pulsar, ephemeris, gxformat2, bioblend, galaxy-language-server or tools-iuc.
   - `galaxy.tools` ships in `galaxy-app` on PyPI. Still, this is an internal module with no importers in any downstream clone searched, so **no shim needed**. If a reviewer asks for one, add a one-line re-export at `lib/galaxy/tools/parameters/sanitize.py`.
   - Stubs: `doc/source/lib` is stale wholesale (last regenerated 2022, missing several tool_util subpackages), so no new `galaxy.tool_util.security` stub is needed.
8. `MANIFEST.in`: complete. All 39 spec XMLs and `cases.yml` are listed in dev's explicit style, with the `src/` prefix. The source branch's two globs had no prefix, but neither did any other line there (release_25.1 layout), so this adapts to dev's layout rather than fixing a bug.
9. Reuse and consistency:
   - Every other `galaxy-tool-util` CLI is a console script in `packages/tool_util/pyproject.toml` `[project.scripts]`: `galaxy-tool-format`, `galaxy-tool-test`, `galaxy-tool-upgrade-advisor`, `galaxy-tool-data-lint`, ... This one is only `python -m galaxy.tool_util.security`. Suggest `galaxy-tool-security-review = "galaxy.tool_util.security.__main__:main"` and use that in the docs page.
   - Observations, not blockers:
     - The spec runner (pydantic case models + `cases.yml` + completeness tests) mirrors `test/unit/tool_util/parameter_specification.yml` and its test without sharing code. That is reasonable at this size.
     - Findings are not surfaced through `galaxy.tool_util.lint`, which keeps the static module decoupled. A linter adapter would be a natural follow-up for Planemo.
10. Typing and imports are fine. All imports are at module top except the optional `anthropic` try-import (justified). `template.py:103,110`: `src: str = self._src` is a workaround for untyped Cheetah. `cast(str, self._src)` would say so more plainly; optional.

Removed tests, each judged:
- `test_every_case_has_jobs` and `test_every_code_has_red_and_green_jobs` asserted only the job halves and `RefusalCode`. Both are gone with that model, so removal is justified. They are replaced by `test_every_case_expects_something`.
- `test_known_bypasses_are_documented_as_such`: no case at source head had `known_bypass: true`, so it only checked absence. Justified.
- Cases `review_failed`, `check_failed`, `strict_check_failed`: job/fault only, with no static expectation. Justified.
- Case `refused_when_unsure`: its one static expectation (`search_list.xml` → `unchecked_locations: {command: parts of it were not analysed}`) is still pinned by `not_analysed_strict`. Justified.
- `path_like_name`: rewritten to assert its static findings. That is a strengthening.

## History hygiene

There are 84 commits: 63 by mvdbeek, 21 by John, all `-x`. Many commit messages describe behaviour that is not in the tree.

**Messages describing runtime that is gone:**
- `a1e5e4f0b78` "Review a tool in the process that prepares its jobs…": what remains is the `ANALYSER_VERSION` removal.
- `61ad065311b` (CPU-time timeout, framed around job handlers) and `cbf7a803f54` (drop timeout): together they remove the timeout `e6bc9ab1138` added, so fold both into the analyser squash.
- `1b7c00452cd` and `ab7e799a712`: py3.8 support for Pulsar. Undone by `2709679ab68`.
- `01ee2bd184c` "Baseline tests: declarative spec…": describes the job runner, ToolEvaluator, `harm:` and red/green jobs. It is also not a real baseline: nothing exists on dev to pin.
- `76eadf37df5` "Give each refusal … a code": `codes.py` is created here and deleted in `96ccf8ac160`, so the net is zero.
- `8abdcf9a0c8` "Document … and its refusal codes".
- `17483b114c6` "Put refusal codes first…".
- `fdfb04a1060` (mentions enforce/refusal).
- `cc2190dfd31` "…; refuse untraced values".
- `db80c75ba42` "Classify access patterns the job check cannot see".
- `d758860728e` "Check literal rewrites … per job".
- `15c5d035567` "Refuse a pipe into a shell only when…": the static change is when `capability-pipe-to-shell` fires.
- `5d037af03fc` "Replace enforce and strict_when_unsure with enforcement levels…": touches only docs, `codes.py`, spec models and cases, all rewritten or deleted later. No static content survives.
- `50b49ca0549` "Enforce findings by level": the static part is `Finding.level`/`data_requires` plus the 3 sort/copy spec tools.
- `987a652879f`: strict-check reads.
- `514fb3bb4fd` "Refuse path-like element identifiers … from enforce_data on": the static residue is `sort_to_named_file.xml` and its case.
- `42442a73b99`: mentions enforce_data.
- `b0828245449` "Refuse reflection; check … per job instead".
- `af921e94693` "Stop refusing jobs for reflection outside the command; …".
- `bc939de6f95`: one "refused".
- The analyser-series commits mentioning "job check" / "refused": `e6bc9ab1138`, `e008923e992`, `ffde22a4e2e`, `c3de759c01c`, `dca0f9a64e3`, `599715ce3d3`, `b6825bdca54`, `7e1cec9d793`, `f7ceae5dbf3`, `3349aec2e98`, `c7995ef45d5`, `1428b1c6414`, `440d84d8f0f`, `0c865b8c22a`, `9ae2ad55b38`, `a2d768d6649`, `4c1fceb0154`.

Also, `516aa1eb122` and `01ee2bd184c` carry the "Baseline tests:" prefix. That prefix tells PR splitting to pull them first, which is impossible here because they test a package that does not exist on dev.

**Suggested plan (not executed).** Squashing across authors needs `Co-authored-by:` trailers.
1. Keep `7ea120eef20` (sanitizer move, mvdbeek) alone. Fold in the removal of the future import from Nit 1.
2. Squash the mvdbeek analyser series `e6bc9ab1138`..`59c83af9a87`, together with `1b7c00452cd`, `ab7e799a712` and the analyser hunks of `2709679ab68`. Result: one commit, author mvdbeek, "Add a static security review of tool command and configfile templates", with a message describing only static behaviour.
3. Squash John's analyser changes into 3–4 topical commits with static messages. Each takes only its analyser/test hunks:
   - user preferences: `cc2190dfd31`
   - literal rewrites: `d758860728e`
   - pipe-to-shell: `15c5d035567`, `b87da9f4ac8`
   - finding levels: `50b49ca0549`
   - reads: `987a652879f`
   - variable assignments: `42442a73b99`
   - reflection/model: `b0828245449`, `af921e94693`
   - getVar helpers: `516aa1eb122`, `bc939de6f95`
4. Squash all spec, docs and pattern work into one commit, "Add a declarative spec, access patterns and admin docs for the static review": `01ee2bd184c`, `76eadf37df5`, `8abdcf9a0c8`, `17483b114c6`, `fdfb04a1060`, `db80c75ba42`, `5d037af03fc`, `514fb3bb4fd`, the spec/doc hunks of step 3, and `96ccf8ac160`. Drop the "Baseline tests" prefix.
5. Leftover lint (the Nit 1 and Nit 2 fixes) goes into a final small commit, or into step 4.

Alternative if keeping per-commit granularity matters more: keep the 84 commits and reword only the ~40 listed above. That is noisier, and messages would still describe code that was added and then removed (timeouts, `ANALYSER_VERSION`, `codes.py`).

<details><summary>Details</summary>

- Runtime-leftover sweep. Outside `security/`, the diff touches only:
  - `doc/source/admin/{index.rst,tool_security_review.md}`
  - `doc/source/lib/{galaxy.tool_util.parser,galaxy.tools.parameters}.rst`
  - `parser/interface.py` (docstring), `parser/sanitize.py`, `tools/parameters/basic.py` (import)
  - `mypy.ini`, `packages/tool_util/MANIFEST.in`

  It does not touch `tools/security_review.py`, `tools/evaluation.py`, `tools/__init__.py`, `app.py`, `structured_app.py`, `galaxy_mock.py`, `jobs/*`, config schema/sample, `galaxy_options.rst`, `app_unittest_utils/security_review_spec.py`, `test/unit/app/tools/test_security_review*.py`, `test/integration/test_tool_security_review.py` or `galaxy_test/api/test_tools.py`. Nothing outside `tool_util/security` imports `galaxy.tool_util.security`.
- `git diff jmchilton/tool_security_review_spec HEAD -- lib/galaxy/tool_util/security test/unit/tool_util/security`:
  - Lint only: `__init__` (py3.8 guard), `capabilities`, `interp`, `judge`, `nodes`, `shell`, `template`, `values`, `test_sources` (import order).
  - Framing: `codes.py` deleted, `charsets`/`report` lose `enforced`/`enforced_findings`, `patterns` comments and `StrEnum`, `known_helpers` docstring, and spec `__init__`/`cases.yml`/`docs.py`/`test_spec.py`.
  - Source `cases.yml` has 43 cases, HEAD has 39.
- I also checked the dropped `test/unit/app/tools/test_security_review.py` and `test_security_review_spec.py`. Every test goes through `check_job`/`refused()`/the job runner (MockApp, evaluator stubs), so no purely static test was lost. Their indirect pinning of the per-value Report/Finding fields is covered in Nit 3.
- `sanitize.py`: `git diff origin/dev:lib/galaxy/tools/parameters/sanitize.py HEAD:lib/galaxy/tool_util/parser/sanitize.py` shows only the future import and the removed TODO. HEAD contains origin/dev `ce63095e7a8`.
- Packaging: `galaxy-tool-util` already depends on `pydantic`, `PyYAML` and `galaxy-util[template]` (Cheetah). `anthropic` is an optional lazy import (`judge.py:44-47`). `packages/tool_util/tests/tool_util` symlinks `test/unit/tool_util`, so the package tests run the security tests, and the docs freshness test skips outside the Galaxy tree.
- Docs page (958 lines): the intro states static/offline, with no galaxy.yml options or refusal codes. The generated section matches `spec_cases_markdown` (the test passes).

</details>

</details>
