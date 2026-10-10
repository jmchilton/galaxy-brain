# Prompt: split jest_readability_batch_01 into per-test commits

You are the orchestrator. Restructure the readability branch so that each originating test gets its own commit. Delegate each split to a Haiku subagent, and check its work before you move to the next iteration. This is the one-time **Splitter** in [PIPELINE_WORKERS.md](PIPELINE_WORKERS.md); the commit invariants are in [PIPELINE_BRANCHES.md](PIPELINE_BRANCHES.md#invariants).

## Inputs

- **Source:** branch `jest_readability_batch_01` at `SOURCE_TIP = <sha, fixed at launch>`. Worktree: `~/projects/worktrees/galaxy/branch/jest_readability_batch_01`.
  - Base `df3932ed4baec0da0f496453b45a48333e7603d4`, then one commit per iteration ("Improve readability of … batch").
  - Iteration commit N corresponds to `readability_batch_NN.yml` and `READABILITY_BATCH_NN.md`.
  - The SHAs recorded in those manifests are from before the latest rebase. Map commits to iterations by order and subject, never by SHA.
- **Manifests:**
  - Every manifest has `selection` (the originators).
  - Later manifests also have `supporting_files`, `supporting_suites`, `helper_files` and `documentation_files`.
  - Each batch report explains which abstractions served which tests.

## Hard rules

- **Never modify the source.**
  - Don't touch the source branch, its worktree (the readability loop uses it) or draft PR #24015.
  - Don't edit `jest_tests.yml` or `LOOP_ITERATION.md`.
- **Build on a new branch.** Create `jest_readability_split` in a new worktree at the source base.
- **Split at file level only.**
  - Every file in an iteration commit lands in exactly one of that iteration's new commits.
  - Content is always taken verbatim from the iteration commit, never hand-edited, and hunks are never split.
  - If a commit hook rewrites content, stop and report.
- **Verify before continuing.** No iteration starts until the previous one has passed your verification.

## Per iteration

### 1. Packet (you)

Assemble the following and hand it to Haiku:
- the iteration commit and its changed files
- the manifest's file lists
- the batch report's reuse section

### 2. Split (Haiku subagent: Agent tool, `model: haiku`)

Haiku first returns a grouping plan, then makes the commits on the split branch. Grouping rules, in commit order:

1. **Shared commit(s):** one per abstraction, holding the helper, fixture or mock file together with the supporting consumers adopted in this iteration. A helper used by only one originator goes in that originator's commit instead.
2. **Originator commits:** one per selected test, holding that test file plus any helpers only it uses.
3. **Docs commit:** any README or guidance change, last.

Haiku flags every file the manifest doesn't account for, along with how it attributed that file.

Commit format:
- Subject: `Improve readability of <TestName> tests`, or `Add <helper> for client unit tests` for shared commits.
- Trailers:
  - one `Test-File: <path>` per test file in the commit
  - `Readability-Iteration: NN`
  - the standard Claude co-author line

### 3. Verify (you)

- **Tree equality (the gate).** After the iteration's last split commit, the tree must be identical to the iteration commit's tree.
- **Plan checks:**
  - Each originator has exactly one commit.
  - No file appears in two commits.
  - Helpers come before their consumers.
  - Your judgment agrees with the attribution of the flagged files.
- **Cherry-pick readiness.**
  - At each originator commit, run only that test file with vitest (`NODE_OPTIONS=--no-webstorage`, as in the manifests).
  - A failure means a dependency is in the wrong commit. Reset the split branch to the end of the previous iteration, correct the plan, and redo the split. You may redo it yourself.
- Record whether Haiku's plan needed corrections and what they were.

## Finish

- **Final check:** the split tip's tree must equal `SOURCE_TIP`'s tree.
  - The full suite and `vue-tsc` were already validated on that tree, so don't re-run them.
  - Run `vue-tsc` only at the end of any iteration whose plan you had to correct.
- **Push:** push `jest_readability_split` to the `jmchilton` fork. Don't force-push the source branch. John decides whether the split replaces it and PR #24015.
- **Debrief:** write `vault/repositories/galaxy/branches/active/jest_readability_batch_01/split_debrief.md`. Include:
  - a table of iteration → commits, with the originator, shared and docs counts
  - files that needed judgment
  - tests whose commits span more than one iteration
  - per-commit test results
  - Haiku's correction rate, as evidence for which model future pipeline workers should use
- **Ask:** use the AskUserQuestion tool to ask John whether to replace the source branch, and whether to record `split_commit` in the ledger.
