# Implementation debrief

```
exists .../tool_patches_static_findings/differential-review/snapshots/20261128T011143Z-revision-152b652559cd.json
  revision @ 152b652559cd vs tool_security_static_findings (merge-base 590a784bd040)
  since 20261127T222331Z-revision-dacf77a87c6f:
    commits: 0 same, 49 rebased, 1 changed, 7 new, 0 dropped
    hunks:   105 carried, 21 changed, 11 new, 5 dropped
```

(The "new" commits in the snapshot include the four branch 2 re-picks from the 2026-11-27 re-sync, which had no snapshot of their own.)

**STATUS: BLOCKED on the same scope decision as before**, the capability-findings switch. This revision (John, 2026-11-27: interactive and CWL exclusions, the red-case move) is done and pushed. Head `152b652559c` on `jmchilton/tool_patches_static_findings` (was `73910eec35c`). The earlier debrief is `earlier_drafts/5/implementation_debrief.md`; everything in it still holds except where this revision changes it.

## Shared commit S''

S'' is `5a893ddceb2` (was `e04753dca51`), on branch 1 `590a784bd04`, byte-identical in `tool_security_runtime`. It adds to `galaxy.tools.security_refusal`:
- `review_exclusion(path, tool_type, *, patched=False) -> str | None`: why the reviews leave a tool out, "it is one of Galaxy's own tools", "it is an interactive tool" or "it is a CWL tool", else None. `patched` lifts only the own-tool case.
- `built_tool_type(tool_source)`: the `tool_type` of the class Galaxy builds the source as. It uses `galaxy.tools.tool_class_for_source()`, which is factored out of `create_tool_from_source` (no behaviour change there). So a `<type>` element wins over a declared `tool_type`. A `CwlToolSource` gives `cwl`. A tool Galaxy cannot build gives None and is reviewed, for example XML that claims `tool_type="cwl"`.
- Tests for every case: the tools on dev, CWL, a `<type>` override in both directions, YAML, the entry-points lookalike, and patched tools.

Both children were rebased with `git rebase --onto <S''> <old S> <child>` with no conflicts.

## This branch

- **`0b5c6d63623` Leave interactive and CWL tools out of static findings refusals.**
  - `with_static_review`, `reviews_tool` and `static_review_is_current` decide through `review_exclusion` on `built_tool_type()`, and log why at INFO.
  - The populator fast path passes the indexed `tool_type`. That is the declared type, so a tool whose `<type>` element picks another class is re-reviewed on each populate. This costs time only; a wrong review is never kept.
  - Docs, the config option, `galaxy.yml.sample` and `galaxy_options.rst` (regenerated) say plainly that interactive tools and CWL tools are not refused, and why. They also say Galaxy does not run CWL tools yet.
  - Effect: the 10 functional-test CWL tools and the interactive tools are no longer refused. Their findings are still reported by `python -m galaxy.tool_util.security`.
- **`9523131bb5b` Move the refusal and tool patch red case to `identifier_single_unsanitized`.**
  - The new tool is a copy of dev's current `identifier_single.xml` with a comment saying it is unsafe on purpose. It is registered in `sample_tool_conf.xml` and `packages/tool_util/MANIFEST.in`.
  - Moved onto it: the refusal integration and unit tests, the `patch_review` CLI tests, and the tool patch unit and integration tests. Their keys, guids and fixture collections were renamed to match (`test/functional/tool_patches/identifier_single_unsanitized{,_validator}`). `identifier_single_fixed.xml` became `identifier_single_unsanitized_fixed.xml`.
  - A unit test pins that the tool is refused at `high`.
  - The refusal integration test now renames its copies' `name` too, because the longer name pushed the tool id past the 255-character job info.
- **`152b652559c` Challenge exclusion tests.** A refusing `kept` review is dropped for an interactive tool. The lookalike and `<type>`-override cases are one parametrized test. The populate test builds its tool with the XML helper.

## Reviews and challenges

- **Normal review.** It found the predicate read the declared `tool_type`, while `create_tool_from_source` lets a `<type>` element choose the class. Fixed with `built_tool_type()` in S'', plus red tests. Its doc nits were also applied: "meant to run in its own container and may get the user's API key", CWL "not run yet", no doubled "either", `_built(path)` instead of a literal. Following the security-reports policy, there is no review debrief in `subagents/` for this round.
- **Test challenges.** See `test_challenges_debrief.md`; the old one is in `earlier_drafts/5/`. Its shared-commit recommendations are applied to S'': the lookalike and YAML cases, one patched test, and the docstring fix.

## Tests (final head)

- **Unit:** 1836 passed, 2 xpassed. The suites are security, tool patches, static findings refusal, toolbox, cached tool, `source_store`, `tool_source` scripts, job wrapper (and user tool), both Pulsar runner tests, prepare refusals, security refusal, user tool source validation and user-defined tool loading.
- **Lint:** ruff, black and isort are clean on the changed files. mypy shows no new errors on the changed files; the remaining ones are pre-existing.
- **Integration, one at a time under the lock:**
  - `test_tool_static_findings_refusal.py`: 8 of 8. The first run failed 2 tests on the name length, and the fix is above.
  - `test_tool_patches.py`: 12 of 12.
- **API:** `test_upload_posix_newline_fixes_by_default` and `test_libraries.py::TestLibrariesApi::test_create_dataset` both pass.
- **CWL:** no quick CWL framework or API test exists to run. Galaxy raises `ToolLoadError` for CWL tools, so they never run jobs; the unit tests cover the exclusion.
- **Merge check:** `git merge-tree` against `tool_security_runtime` conflicts only in `doc/source/admin/tool_security_review.md`.

## Decisions for John

1. **Scope (the BLOCKED reason), unchanged.** The capability-findings switch.
2. **Interactive tool trust.** The exclusion trusts every tool Galaxy builds as an interactive tool once `interactivetools_enable` is on, Tool Shed tools included. A private report covers what that now lets through. Please read it before landing.
3. **Branch 2 drift.** `tool_patches` still uses `identifier_single` and `identifier_single_fixed.xml` as its fixtures. The next re-pick of branch 2 commits that touch them will conflict here, unless the same move is made on branch 2.
4. Items 2 and 3 of `earlier_drafts/5/implementation_debrief.md` are unchanged.
