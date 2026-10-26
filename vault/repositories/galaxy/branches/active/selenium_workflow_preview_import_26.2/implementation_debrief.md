READY: extracted the workflow launch/preview FAQ batch into one reviewed branch targeting `release_26.2`, as John requested. The scope evaluation retains this combined scope. gxui CLI changes and GTN findings are outside it; no PR was opened.

The branch restores `trs_version` launch-link compatibility while retaining `trs_version_id`, and restores import-on-load for query TRS URLs. Existing integration tests now wait for automatic import without clicking Import. New run-page cases cover both registry URLs and both version spellings, checking the destination workflow ID and imported version provenance. The query alias stays inline; browser tests cover the import behavior instead of copying duplicate unit tests from the driver branch.

The first commit is passing baseline coverage for a second user previewing a public workflow, opening its run form and importing a distinct copy, plus the already-supported `trs_version_id` launch path. Shared fixture fields live on the test class so the public-workflow file passes together. Implementation extracts `workflow_preview_open(name, tab=None)` and uses it in public and owned workflow tests, preserving the release branch's existing card lookup. Manual TRS imports use the existing navigation wait instead of a fixed sleep and raw selector.

Validation details:

- Baseline public-workflow file: 2 passing tests per backend before helper/client changes. The compatibility case passed with both client fixes temporarily removed; baseline history contains its standalone form.
- Public-workflow and owned-preview coverage, plus the full TRS integration file, were exercised on both browser backends. Final results are recorded below.
- `make format` left all 2,781 Python files unchanged; commit hooks, including client ESLint, passed. Final focused fixes also passed formatting and whitespace checks.
- Scoped mypy with `MYPYPATH=lib:test` reports the same 23 errors in 12 imported files with the original TRS file and the extracted code; none is in the four touched Python files.
- Vault validation: 126 files, 0 errors, 15 advisory warnings. No validated-note frontmatter changed, so index/dashboard regeneration was unnecessary.

Normal review, test challenges, E2E polish, code-quality review, baseline refactoring and scope evaluation are recorded alongside this debrief. The two screenshots are verified and indexed in `screenshot_debrief.md`; they show the public preview controls and actual run form with the import action. Remote TRS workflows have unavailable Tool Shed tools on the standard test server, so their tests validate redirect/identity/provenance, while the local public fixture covers rendering the actual run form.

Local verification required two setup corrections: a task-only copy of the E2E launcher disables Gunicorn preloading (preloaded workers dropped during outbound fetches), and its registry labels match the integration fixture's lowercase names. Neither changes tracked Galaxy configuration. Two initial Dockstore assertions parsed an outer-query-decoded `#` as a URL fragment; the final reviewed correction reads the trailing version from the embedded URL string. The affected tests were rerun on both backends.

The upstream extraction ledger identifies source commits 57169998d11, 98da06986fb and 904094dc011 and the standing-driver restack action. Its source branch was left untouched. The issue remains queued/unfiled; there is no issue number to post an implementation notice to. The suggested 26.1 backport remains separate from John's explicit 26.2 target for this combined batch.

Final browser evidence (18 distinct cases verified per backend, with focused reruns after the test-only correction):

| Backend | Results |
| --- | --- |
| Playwright | First 7 passed before stopping to correct local registry labels; the remaining 11 produced 9 passes plus the 2 faulty Dockstore expectations. Both corrected Dockstore cases then passed (21.93s). |
| Selenium | Complete file selection produced 16 passes plus the same 2 expectations from the already-imported old test code (607.45s). Both corrected Dockstore cases then passed. |

The final four commits are `8512991d4d35` (Baseline tests), `42d7af7114b9` (implementation), `0501935d4c4e` (hardening), and `ef7bf72fdea9` (corrected expected-version parsing). The branch is pushed to `jmchilton/selenium_workflow_preview_import_26.2`; base commit is `7a7c1576f94c`, target `release_26.2`. CI has not been assessed. Scope is retained; ready for branch-management CI and human review under `branches_implemented_needs_ci`.

```text
created /Users/jxc755/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/selenium_workflow_preview_import_26.2/differential-review/snapshots/20261026T182546Z-hardening-ef7bf72fdea9.json
  hardening @ ef7bf72fdea9 vs origin/release_26.2 (merge-base 7a7c1576f94c)
  since 20261026T175638Z-implementation-6fec41cbad24:
    commits: 0 same, 0 rebased, 2 changed, 2 new, 0 dropped
    hunks:   7 carried, 2 changed, 7 new, 1 dropped
    changed 8512991d4d35 Baseline tests for public workflows and TRS version launch (2 differing hunks)
    changed 42d7af7114b9 Restore TRS launch imports and reuse workflow preview navigation (1 differing hunk)
    new     0501935d4c4e Harden TRS redirect assertions and wizard import waits
    new     ef7bf72fdea9 Read the expected TRS version after the decoded Dockstore hash
```
