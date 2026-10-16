# Polish checklist: integration_ci_paths

Fresh checklist subagent reviewed `ec49da686a6e7551c6e9b50f14d948cde87d037f` against `origin/dev`, using `GENERAL.md` and `GX_PR_DESCRIPTIONS.md`. No failing agent-checkable items. Human review remains outstanding.

- [ ] Did a human read every test and every comment? Requires John.
- [x] What does the user see when it fails? Contributors could miss Integration regressions if future shared code imports an excluded suite; existing runtime failures retain their assertions and diagnostics.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? N/A; existing API and integration tests retain behavioral assertions.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? Retained comments explain regression coverage and asynchronous metadata timing.

<details><summary>Evidence from the fresh review</summary>

- Changes cover Integration push/PR path filters and the shared-code relocation needed to exclude other suites safely. No generated files change; `git diff --check origin/dev...HEAD` passes.
- Identical six exclusions apply to push and PR. Shared `lib/galaxy_test/base` remains included; comments explain shared-code placement.
- Independent AST comparison confirms unchanged function/method bodies for `ApiTestCase`, `TestsTools`, `RunsWorkflowFixtures`, `ChangeDatatypeTests`, `BaseHistories`, `ImportExportTests`, `upload_flat_sample_sheet`, and `assert_one_collection_created_in_history`.
- `WORKFLOW_SIMPLE` matches both prior copies. `api/_framework.py` retains its `ApiTestCase` re-export; Integration and shared conftest imports reference `base`.
- The removed private collection helper duplicated the shared helper. No moved test assertions were removed. Existing tests check history export/import contents, deleted/purged states, collection job states, metadata indexes and post-job actions.
- Retained issue #20450 commentary identifies the collection-state regression; `__IMPORT_HISTORY__`/`__SET_METADATA__` commentary explains the asynchronous wait.
- Searching Integration, base, driver and shared conftest finds no imports from excluded packages; the only textual match is a Sphinx reference in `base/populators.py`.
- A future import-rule violation could silently skip relevant CI. John explicitly declined a guard; the description discloses the convention and risk.

</details>

`WORKFLOW_RELATED.md` is not required: its scope is Galaxy editor/scheduler/invocation/mapping/gxformat2 changes. This branch changes GitHub Actions selection and relocates unchanged workflow tests/fixtures. Supplemental answers: scientific workflows retain their behavior; contributors editing excluded suites benefit directly from the filters; the documented allowlist alternative was replaced at John's request, and the import guard was declined.

Coordinator validation: 18 local path-filter scenarios passed (all six exclusions, shared base modules, conftest, integration tests, production navigation/tours, workflow self-trigger, sibling workflow exclusion and mixed paths). Push/PR patterns are identical and Tuesday cron is preserved. Conflict-free rebase preserves both commits exactly (`git range-diff` reports `=` for each). Previous-head runtime CI passed; current-head CI is separately tracked in the index/debrief.
