# Galaxy PR #24132 — Don't send X-Frame-Options twice on WSGI-served pages

- PR: https://github.com/galaxyproject/galaxy/pull/24132
- Latest review: 2026-10-14
- Reviewed commit: `fb8480eeadff0c678cf8448ec423c1fea2852040` (latest head rechecked after validation)
- Base: `release_26.2`
- Delivery: **UNPOSTED** — review draft prepared; nothing submitted to GitHub.
- Recommendation: **Approve**, subject to normal completion of CI.
- Findings: no actionable defects found.
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24132` (clean after validation).

## Review

Reviewed the complete two-file diff, middleware installation, `GalaxyWebTransaction` header generation, shared embed predicate, Starlette `MutableHeaders.setdefault` implementation, a2wsgi response handling, API test request routing, and current PR discussion. There were no reviews or discussion comments when checked.

The existing WSGI transaction and FastAPI middleware both use the same configured `x_frame_options`. Replacing `append` with `setdefault` preserves the single WSGI value and supplies the configured value on responses without it. The mounted WSGI adapter lowercases the header name, matching Starlette's case-insensitive lookup. This keeps the standalone WSGI behavior intact and avoids adding a second header at the outer layer. Existing middleware and WSGI embed predicates are unchanged.

The tests strengthen the existing published-page assertion to exact equality, add successful root and history-page requests with exact equality, and retain the FastAPI and embed coverage. This checks real server responses rather than duplicating middleware internals in a new unit test.

The PR description explicitly identifies a pre-existing prefix/embed issue and leaves it out of scope; that is not a regression introduced here.

## Validation

Focused Galaxy API run against the PR worktree using the repository's existing Python 3.13.12 virtual environment:

```sh
GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false \
GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES=true \
GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS=true \
GALAXY_TEST_TOOL_CONF=lib/galaxy/config/sample/tool_conf.xml.sample,test/functional/tools/sample_tool_conf.xml \
PYTHONPATH=lib \
/Users/jxc755/projects/repositories/galaxy/.venv/bin/python -m pytest \
  lib/galaxy_test/api/test_framework.py -k xframe -v --tb=short \
  -o cache_dir=/tmp/galaxy-review-24132-pytest
```

**4 passed, 5 deselected** in 34.56 seconds. The four selected cases cover FastAPI default headers, non-embed published WSGI pages, both root/history WSGI routes, and embed omission. Only two dependency deprecation warnings occurred.

An additional disposable check used actual a2wsgi responses through the exact middleware class/helper extracted from the reviewed source with Python AST. All four combinations of configured `SAMEORIGIN`/`DENY` and existing/missing WSGI header passed, with exactly one resulting header. This independently checks the adapter/header representation for a non-default configured value; it does not replace the full Galaxy API run above.

At the final CI check, Python linting (3.10/3.14), OpenAPI linting (3.10), PostgreSQL unit tests, performance tests, PostgreSQL 18 database-index checks, and CircleCI were successful. Other checks, including API tests, remained queued or in progress; no completed failing check was reported. Full CI completion remains pending.

## Risks

Risks are minimal — this is a two-way change that removes a duplicate response header without introducing a new API, persistent format, or configuration contract. Existing configured values and embed exemptions remain governed by the same code paths, and focused live API tests passed.

## Review draft

Reviewed the WSGI transaction and FastAPI middleware paths. Using `setdefault` keeps the existing configured WSGI value and still supplies the header for FastAPI responses; the exact-value assertions catch the original duplication.

The four focused X-Frame-Options API tests passed locally, including both WSGI routes and embed omission. I also checked actual a2wsgi responses with `SAMEORIGIN` and `DENY`, with and without an existing header; each produced exactly one configured value. No blocking findings. Remaining CI checks were still running when reviewed.

Risk is low: this is a reversible middleware correction with no new API or persistent-data contract.

## Tracking ended — 2026-10-15

GitHub confirms MERGED at `2026-10-15T08:42:57Z`, final PR head `fb8480eeadff0c678cf8448ec423c1fea2852040`. Archived after merge and removed from the queue. The clean worktree HEAD matched or was an ancestor of the final PR head and was removed with `ghwt rm galaxy 24132`. Cleanup did not re-review later commits or post the draft.
