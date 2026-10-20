# toolshed_repository_contents

Status: `branches_ready_for_final_review` — retargeted to `dev` and listing `size` dropped after mvdbeek's review; new-head CI pending; [reply draft](review_response_draft_2026-10-20.md) unposted. Base: `dev`. [PR #24167](https://github.com/galaxyproject/galaxy/pull/24167), head `66f8d7c3769bd633572ebfc0511c24a9442af950`.

Adds a bounded repository-files API and Tool Shed contents browser (#22598).

**Final review:** [PR description](pr_description.md) · [titles](pr_titles.md) · [polish debrief](polish_debrief.md) (open questions at the bottom) · [checklist evaluation](checklist_evaluation.md)

[Implementation](implementation_debrief.md) · [initial implementation](initial_implementation_debrief.md) · [plan](plan.md) · [Tracking history](tracking_history.md)

Process: [test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Codex review](codex_review.md) · [thermo-nuclear review](thermo_nuclear_review.md) · [scope](scope_evaluation.md) · [screenshots](screenshot_debrief.md)

## TICK — 2026-10-11

Live fork head `682b8a68fbf51e5405d3cf84ceaf4818d6523305`: Tool Shed/API/unit/lint and Playwright/integration-Selenium checks pass. The sole red Selenium workflow failed pulling its job container (`toomanyrequests`), before tests; [run 37950058968](https://github.com/jmchilton/galaxy/actions/runs/37950058968) failed jobs rerun. Relevant Tool Shed coverage ran; promoted on diagnosed unrelated CI red.

## TICK — 2026-10-13 evening

Requested failed-job reruns for recorded unrelated failures: [run 37950058968](https://github.com/jmchilton/galaxy/actions/runs/37950058968). All requests accepted. These reruns are pending coverage, not passing results; branch classification is unchanged.

## Recovery — 2026-10-15

Ran the missing after-plan steps. Scope kept as implemented. Pushed 10 fast-forward commits, `682b8a68fbf..8da4d6854a9`, including a fix for the `RepositoryPage` revision regression Codex found. The TICK CI evidence above covers `682b8a68fbf` only, so the branch is back in `branches_implemented_needs_ci` until the new head's CI runs.

## Retarget to release_26.2 — 2026-10-15

Rebased the 26 commits cleanly onto `origin/release_26.2` and force-pushed with lease (`8da4d6854a9` → `2effc539aff`). Added `6521d02fde2` (`Vary: Origin` from `APICorsRoute`), because the files routes are the first ones that are both CORS-enabled and publicly cacheable. After the [review](subagents/vary_origin_review.md), the head is `7fe3b228ee7`. No CI has run on it yet. Details: [implementation debrief](implementation_debrief.md).

## Polish — 2026-10-15

Polished, and pushed 3 fast-forward commits (`7fe3b228ee7..f4b0af72e73`):
- a stale comment fix;
- a test that unbounded revisions 404 without opening hg;
- an hgweb comment correction.

John decided to keep the install-count icon swap and call it out in the description. Fork CI hadn't reported on either head when polishing ended. See the [polish debrief](polish_debrief.md).

## Draft PR — 2026-10-15

At John's request, opened draft [#24167](https://github.com/galaxyproject/galaxy/pull/24167) at `f4b0af72e73` against `release_26.2`.
- Title: "[26.2] Let anonymous users browse Tool Shed repository contents", the first option in `pr_titles.md`, since none had been chosen.
- Body: `pr_description.md` verbatim, except that the screenshots are hosted on the `pr-assets-toolshed_repository_contents` branch of the fork.
- The open questions in the polish debrief are still unanswered, including the reason for targeting the release branch.

## TICK — 2026-10-15

CI has relevant mypy failures in the newly added `test/unit/tool_shed/test_repositories_manager.py:90`: `repositories_manager.hg_util` is not explicitly exported by `tool_shed.managers.repositories`. Both Python lint and package jobs report it. This belongs to this branch, not the prior unrelated Docker-pull failure. Move to `author_work`; no implementation change inferred by TICK.

## Related CI fixes — 2026-10-15

Fixed the reported branch-related mypy errors in `8d3dbaa0f7ea67d69ac4d17f71f67dfb8945b28f` and pushed normally to jmchilton. [Diagnosis, unrelated-red boundary and verification](ci_type_fixes_2026-10-15.md). Full pinned-dependency mypy passes (2526 files), 29 regressions pass, and commit hooks pass. Unchanged expression-test import ordering is the only diagnosed unrelated failure in the linked lint job. GitHub confirms the new head and mergeability; fresh CI is pending. Track in `branches_ready_for_final_review` under the changed-SHA rule; preserve draft state and require a fresh human read.

## Review response — retarget to dev — 2026-10-20

mvdbeek [reviewed](https://github.com/galaxyproject/galaxy/pull/24167): the listing opened one filelog per file for a `size` the UI never shows, a shared cache plan was needed, and the 26.2 target was questioned, then a follow-up comment said 26.2 is fine if the shed is safe. John asked to retarget to `dev`.
- Rebased the 32 commits onto `origin/dev` (`8d3dbaa0f7e` → backup branch `backup/toolshed_repository_contents_pre_dev`). Three conflicts with dev's README work on `RepositoryPage` and `test_frontend_repositories.py`; both sides kept.
- `99053330762` drops `size` from `RepositoryFileEntry`. A red-first unit test fails if a listing opens any file. A 3000-file revision went from 390 ms with 3000 filelog opens to 3.1 ms with none. The shed TS schema was regenerated, and only `size` changed.
- Force-pushed with an explicit lease, then `gh pr edit --base dev` and dropped "[26.2]" from the title.
- Verified locally: shed vitest 218/218, vue-tsc, prettier, ruff/black/isort, both shed unit modules, and `test_shed_repository_files.py` (8 passed). Local runs needed `pnpm install` to refresh galaxy-ui and `pytest-xdist` (new on dev).
- `pr_description.md` now has the new core SHAs, the listing cost, the `proxy_cache` recommendation and an uncached-crawler risk. The live PR body is not yet synced.
- Not built: the old `/repos/.../file/` redirect (nginx 403s before the app, and it touches the `hg clone` route) and a 26.2 login prompt. Both are offered in the reply draft or to John. John then asked for the login prompt, which is built as [`issue_22598_login_prompt_26.2`](../issue_22598_login_prompt_26.2/index.md). Its PR isn't open, and the live body was synced at `66f8d7c3769`.
- `66f8d7c3769` asserts anonymous files responses set no cookie, which backs the `proxy_cache` claim (8 passed). The description also drops two claims dev made stale: the `readme_util` follow-up and the README-on-mount fix, both of which dev already did.

## TICK — 2026-10-20

#24167 is out of draft, so it is a live PR while still listed under `branches_ready_for_final_review`. The dev retarget above is in progress in another session, so TICK did not rebase or reclassify it.
