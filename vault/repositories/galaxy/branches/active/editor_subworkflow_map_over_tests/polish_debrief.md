Run via claude-opus-5-5 (coordinator) at high effort.

**Polished; ready for final review.** Head `a92b870744e` on `release_26.2`, pushed. The branch went into polishing as tests only and came out as a client fix with tests, because hardening found a real editor bug.

## How hardening reshaped the branch

The branch started as five vitest cases plus a fixture step extracted from #23676 (`b8c7a93e57a`, on `dev`). The polish process requires hardening first, so the full [harden process](../../../../../agents/_shared/GX_PROCESS_HARDEN_BRANCH.md) ran:

1. **Test challenges** consolidated the tests (5 → 3) and routed every connection through `canAccept`. See [test_challenges_debrief.md](test_challenges_debrief.md).
2. **Codex review** found the fixture's subworkflow input used `collection_types`, but the server sends the singular `collection_type`. A probe showed the real editor treated the input as "any collection". See [codex_review.md](codex_review.md).
   - John first chose a server fix. I then found that `SubWorkflowModule.get_all_inputs` also feeds scheduling (`map_over.py:_declared_collection_input_types`), and asked again. John chose the client fallback in `terminalFactory`.
   - The fixture switched to the server's shape and the history was rebuilt as baseline tests, then the fix.
3. **Thermo-nuclear review** confirmed the fix is in the right layer and removed duplicated test setup. See [thermo_nuclear_review.md](thermo_nuclear_review.md).
4. **Baseline refactor** found nothing to change. See [baseline_refactor.md](baseline_refactor.md).
5. **Scope evaluation** recommended retargeting to `release_26.2` and dropping `fields`/`column_definitions` from `DataCollectionStepInput`. John approved both. See [scope_evaluation.md](scope_evaluation.md).
6. **Check branch** found nothing to run at that point: the branch had no Python changes yet.
7. **Screenshots:** John approved bootstrapping the worktree. A new Selenium test records before/after pairs for both cases and fails without the fix. **E2E polish** then tightened its assertions. See [screenshot_debrief.md](screenshot_debrief.md) and [polish_e2e_tests_debrief.md](polish_e2e_tests_debrief.md).

## Polishing

- **CI:** on `2885dc64873`, client unit, client lint and client API tests are green. The only reds are the release script's version check, macOS startup jobs and skipped packages, none of them related. On `a92b870744e`, which only adds the Selenium test, Playwright and Selenium are queued.
- **Checklist:** all 9 items pass (general + workflow-related). See [pr_checklist.md](pr_checklist.md). It surfaced that saved workflows with a mismatched connection into a subworkflow collection input are now flagged invalid in the editor, which the description now says.
- **Strengthening round** (one round): every task was a description change, and no branch change was needed.
  - It named the API test that pins the scheduling claim (`test_invocation_map_over_inner_collection_with_tool_collection_input`).
  - It corrected "never read the field". The server has sent the field since 2019 (`c5726c33b27`); the old JS editor stored it but never matched on it.
  - It moved the editor-only, no-payload and existing-workflows answers into a bold paragraph above the screenshots, including that saving still works after the invalid-connections prompt.
  - It reworded an opener that implied the server refuses `paired` (it doesn't check at run time).
  - It moved the mechanism into `<details>`, and fixed "four-line" to three.
- **Check Galaxy:**
  - isort, black and ruff are clean on the Selenium file.
  - mypy adds one `no-untyped-def` on the new test method. That matches the file's 75 unannotated tests; base has 237 errors under the same direct invocation.
  - vitest: all 1042 Workflow/stores tests pass under node 22.20.0.
  - vue-tsc is clean.
- **Titles and tags:** [pr_titles.md](pr_titles.md) (4 options, `[26.2]` prefix) and [pr_tags.md](pr_tags.md) (`kind/bug`, `area/workflows/editor`, `area/workflows/subworkflows`).

## Left for John

- **Optional API test.** It would run the Selenium test's workflow and assert a `list:list` output end to end. The strengthening review didn't think it was needed, since the named API test covers the mechanism.
- **Server-side follow-ups**, out of scope:
  - a run-time check of a subworkflow input's declared collection type (a `paired` currently passes into a `list` input unchecked);
  - datatype filtering on subworkflow inputs (always `extensions: ["data"]`).
- **#23676 conflict.** #23676 will conflict in `parameter_steps.json` until it drops its copy of the fixture step.

## Process notes

- **Auto-mode denials.** The auto-mode classifier denied the first force-push of the rewritten history; John then granted it explicitly. Later pushes were fast-forwards.
- **Node version.** vitest under the default node 26 showed 221 failures, identical on base; under node 22.20.0 (`client/.node_version`) everything passes. `GX_DEVELOPMENT.md` documents this, but I read it late.
- **Host gotchas** for E2E on this host: zsh is missing for `galaxy_e2e.sh`, pytest needs `-p no:postgresql`, and the Vite dev server hit `ERR_INSUFFICIENT_RESOURCES`, so a built client was used.

## Snapshot

```
created /home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/editor_subworkflow_map_over_tests/differential-review/snapshots/20261124T174338Z-polishing-a92b870744e9.json
  polishing @ a92b870744e9 vs origin/release_26.2 (merge-base 09a98b7e2d54)
  since 20261124T173356Z-hardening-a92b870744e9:
    commits: 3 same, 0 rebased, 0 changed, 0 new, 0 dropped
    hunks:   10 carried, 0 changed, 0 new, 0 dropped
```
