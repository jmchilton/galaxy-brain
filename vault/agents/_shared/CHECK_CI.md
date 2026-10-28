# Check CI

Decide whether a branch's or PR's CI failures were caused by its changes, and which tests. Delegate it: start a subagent with `model: sonnet` and `effort: low`, and give it only this file and the target, for example "Follow `vault/agents/_shared/CHECK_CI.md` for branch `issue_24438_select_comma_split_25.1`, base `release_25.1`, upstream `galaxyproject/galaxy`" or "… for https://github.com/galaxyproject/planemo/pull/1754". Act on its report. Don't redo its work.

## Run one command

```sh
S=~/projects/repositories/galaxy-brain/vault/agents/_shared/scripts
$S/check_ci.sh <PR URL>                                                    # a PR
$S/check_ci.sh --upstream OWNER/REPO --branch BRANCH --base UPSTREAM_BASE  # a branch's fork CI, before its PR
```

UPSTREAM is the project's upstream repository (default `galaxyproject/galaxy`). UPSTREAM_BASE is the record's `upstream_base_branch`. The command prints a digest and exits 0 green, 1 failures, 2 nothing failed yet (runs pending or not started), or 3 if the tool failed. Results are cached until the head SHA or a run's attempt or status changes, so rerunning it is cheap. Don't wait for pending runs. Judge what has already failed.

## Read the digest

- `Failed jobs` gives each failed job's `[base: failed/completed]` over the base branch's last 3 push runs.
- `Failing tests` are grouped by error signature: the innermost traceback (`at`), the exception most often seen in the tests' captured output (`captured in N`), and `also failing on <base>: k/n`. Only pytest results are parsed; other jobs appear under `Failed jobs` alone.
- `[changed file]` marks a test or traceback location in a file the branch changes. `[fails on <base>]` marks a test that also failed on a recent base-branch run.

Classify each signature, or each failed job that lists no tests:

- **Related**: a `[changed file]` test or location, a captured exception raised in code the branch changes, or a failure in the feature the branch touches.
- **Unrelated**: `[fails on <base>]`, or failures far from the branch's changes in a job that also fails on the base (e.g. a Python integration test on a client-only branch). Note `on base` for `[fails on <base>]` signatures, and for test-less jobs that failed in every base run: a rerun won't fix them. Don't explain why the base fails.
- **Unclear**: anything else. Only for these, read the test's entry under the printed `Details:` directory (`jq` on `converted/`, or `grep` in the job logs under `raw/`).

Read-only: don't rerun jobs, push, comment, or fetch into project clones. If the command exits 3, report its error and stop. It needs a `gh-ci-artifacts` with `--digest` ([jmchilton/gh-ci-artifacts#4](https://github.com/jmchilton/gh-ci-artifacts/pull/4)); until that is released it runs the build in `~/projects/repositories/gh-ci-artifacts`.

## Report

One verdict line (`related failures`, `unrelated only`, `unclear`, `green` or `pending`), then one line per signature: `related|unrelated|unrelated (on base)|unclear: <n> tests (<one example id>): <evidence>`.

## Rerun unrelated reds

For the agent that delegated the check, where its Automatic Actions authorize reruns. Rerun failed jobs (`gh run rerun <id> --failed`) only for reds diagnosed as unrelated, never `on base`. Rerun a run at most once per head SHA: skip it when `gh run view <id> --json attempt` is past 1.
