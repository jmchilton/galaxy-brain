Hardening-3 refactor pass: two more base-level commits added (BreadcrumbHeading ellipsis fix, and P1 split into a standalone `tool_version` response fix plus a `copied_from_job_id`/filter commit), the CitationsList baseline moved into the baseline group, and the iteration-3 fixups folded into the commits they amend; seven that couldn't fold cleanly now sit as their own commits at the end of their layer. Tree identical to `9b082b9f340`; pushed as `acc53a702b2` (backup `jmchilton/compare_runs_pre_refactor3`).

## What changed

**Base (positions 1–20)**
- Baselines 1–8: the 7 existing ones plus `228ff1e837a` (CitationsList BibTeX download, formerly `1c9c098fbee`). The message now names the downloadBlob commit by subject, not by SHA.
- Refactors 9–17: the 8 from the previous pass, with these folds:
  - `e1631c4dbca` (objectstore Selenium selector) → ItemPopoverLink `1d487feeeb0`. That commit no longer breaks `test_objectstore_selection.py`.
  - `b87aa7bd666` split by hunk. Its batch-request asserts on the 958574 tests → `ce8ce0b3766`. The one assert on the reused-badge test → `6ef0ac78231`.
  - `3dab9bcb56a` (failed-load test) → `bbbcd967def` (useMappingJobs).
- Base fixes:
  - **18 `659d3c621be`**: BreadcrumbHeading ellipsis/tooltip (`a1c7219263a`). It touches only base files and nothing else in the branch touches them, so it stands alone.
  - **19 `eed9a99f125`**, P1a "Declare tool_version on job responses": the JobBaseModel field, plus the key-set and value asserts in the baseline test. This is the released display fix.
    - The base `JobInformation` already renders the row when the `tool_version` key is present (`"tool_version" in job`), so the server change alone fixes it.
    - Retargetable to a release branch.
  - **20 `26f722c4703`**, P1b: `copied_from_job_id` on JobSummary/index, and the consumer-less `GET /api/jobs?tool_version=` filter. Also folds `65e7a8d4687`'s test_jobs part (`__jobs_index` swap, cache-hit `copied_from_job_id` assert).
  - The typed `JobInformation` toolVersion hunk stays in the feature (`6961d64aada`): it needs the regenerated schema types, and P1 doesn't need it.

**Server (21–43)**
- `493d37384e1` (Decompose) absorbs `c6e860e716d`, `c51da628af0`, `a2e33ef6952` and `9b082b9f340`. Its message is rewritten: it now names the unset-invocation-state fix (no longer "behaviour unchanged"), the SQL/guard moves and the module-function metadata helpers.
- Left as own commits after it, before the single regen `7d44e052262`. Neither amends a single earlier commit (they span many API test commits):
  - `842c444e9bb` (`65e7a8d4687` API/populators part, message trimmed to API-only);
  - `32ff71bf186` (`c821d24a686`).

**Client (45–71)**
- Folded:
  - `a16cb310480` → JobParametersDiff `78a91993b4d`.
  - `4e223ba67bb` → `/comparisons` page `95829ff1663`.
  - `b87aa7bd666` StepRunsTab part, `3c4ac3214cd`, `014bafa0f50`, `8696162134b` and `6762e9314fb` → step card links `6961d64aada`. The message now describes the subworkflow-disabled All runs tab.
  - `b87aa7bd666` NodeInspector part → `b1c0ef9aebd`.
- Messages fixed for stale SHAs: `6ef0ac78231` and `6fe0616aad5`.

**E2E (72–73)**
- `65e7a8d4687` Selenium part → `509833ce0ec`.
- `a1d7400f0f4`, `18c102cc1c8` and `fc43f60ee4b` → `acc53a702b2`, retitled "Settle comparison screenshots and widen comparison E2E coverage". They conflicted at `3cd60c9cb57`, since `565950820cd` edits the same module.

## Folds left in place (conflicted at the commit they amend)

These are now own commits 67–71, after `5f249597bc5` and before the E2E:

| Commit | Amends | Conflict |
|---|---|---|
| `73d3f245021` (`67d00de887e`) | noJobReason tests | at `a87aab75775` (comparisonUtils.test.ts) |
| `c0a67a21da4` (`7b37c68302a`) | state filter | at `924465305a1` (comparisonQuery/Utils) |
| `55d2f9ab86b` (`1b37f64ffc7`) | state filter | at `924465305a1`; follows `7b37c68302a` |
| `32d6ec6682d` (`5a01b02a80e`) | — | at `bbea06b4860` (ComparisonTable.vue) |
| `36a847b992b` (`9c293cd2892`) | spans 8ac6/3f1a/924 | no single target |

All of them fold cleanly into `1a871a0cdf7`/`5f249597bc5` (the latest commits touching those files), but those commits are unrelated, so they weren't folded there.

## Not moved to base
`e15ba92a4e5` (reuseOnQueryChange) is kept where the previous pass put it.

## Verification
- `git diff 9b082b9f340 HEAD`: empty. No `schema.ts` change outside `7d44e052262`.
- **Baseline tip `228ff1e837a`:**
  - vitest DatasetPopoverLink/ToolExecutionJobs/handlesMappingJobs/CitationsList: 20 passed.
  - `test_HDAManager -k metadata`: 6 passed.
  - API `test_index_and_show_job_field_sets`, `test_show_io_association_names`, `test_show_metadata_key_expands_every_element`: 3 passed.
- **Refactor commits at their own tips:**
  - `ce8ce0b3766` ToolExecutionJobs: 9 passed.
  - `bbbcd967def` handlesMappingJobs + ToolExecutionJobs: 14 passed.
  - `eed9a99f125` API field sets: passed.
- **Refactor tip `26f722c4703`:**
  - `vue-tsc --noEmit` rc=0.
  - vitest across 14 files: 105 passed. These are DatasetPopoverLink, ItemPopoverLink, api/index, download, CitationsList, ToolExecutionJobs, handlesMappingJobs, routerViewKey and BreadcrumbHeading, plus the totalMatches callers pages/visualizations/histories/invocations grid, and JobInformation.
  - `test_HDAManager`: 32 passed.
  - API test_jobs field sets/tool_version filter/io names and test_datasets metadata: 6 passed. test_workflows `-k default_file`: 3 passed.
- **Feature fold targets:**
  - `95829ff1663` ComparisonView: 22 passed.
  - `6961d64aada` StepRunsTab/StepAllRunsTab: 15 passed.
  - `b1c0ef9aebd` NodeInspector: 5 passed.
  - `6ef0ac78231` ToolExecutionJobs: 10 passed.
  - `78a91993b4d` JobParameters: 16 passed.
  - `493d37384e1` comparison unit suites: 43 passed.
- **Not run:** integration Selenium (`test_objectstore_selection`) and the Playwright E2E. Neither file's content changed, only its placement.
- **Push:** `git push --force-with-lease=compare_runs:9b082b9f340 jmchilton compare_runs` → `acc53a702b2`.
