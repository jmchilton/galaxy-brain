# Verification: planemo issue #1508 — "planemo run should work with dockstore id"

Skeptical second opinion. Nothing posted/modified on GitHub.

## Verdict: SOLVED

## TL;DR

1. **#1508 is a duplicate of #1479** ("[Feature request] Use a TRS ID instead of a file for
   Planemo Run", Delphine-L, 2024-10-23). #1508 was filed 2025-03-27, five months later, with a
   one-line body and no example. mvdbeek's own PR **#1596** says "Closes ...issues/1479" and
   closed #1479 on 2026-01-06 — it never referenced #1508, which is the only reason #1508 is
   still open. There are no cross-reference events on it. Cleanest disposition: **close as a
   duplicate of #1479, implemented in #1596**, not as a fresh feature verdict.
2. The feature is real and **CI-verified end-to-end today**: `tests/test_run.py::RunTestCase::test_run_trs_id`
   PASSED on master `b8547ffd` (run 35576757811, 2026-09-21), doing an actual `planemo run <TRS id> job.yml`
   against a provisioned Galaxy.
3. Five of six plausible id spellings resolve correctly against the live Dockstore API. The one
   that does not is a Dockstore **web** URL — an additive convenience, not the "dockstore id"
   the issue asked for. Follow-up, not a blocker.

## 0. What code I actually exercised

- Clone `/Users/jxc755/projects/repositories/planemo` had HEAD `d3ce9bfe` ("Starting work on
  0.75.46") on branch `master`, which after `git fetch` is an **ancestor of** `origin/master`
  `b8547ffd` — i.e. the working checkout is ~10 commits **behind** upstream master. The
  bundled `.venv` reports `planemo, version 0.75.45.dev0`, so it is built from that stale tree.
- I therefore did **not** use `.venv`. I created a detached worktree at `origin/master`
  (`b8547ffd`) in the scratchpad and ran everything from there via
  `uv run --no-project --with-editable .`.
- The HEAD↔origin/master delta does not touch any TRS code (only `planemo/runnable.py`
  `has_tools`/`is_single_artifact` property fix and two unrelated `tests/test_run.py` cache
  tests), so conclusions hold for both — but all numbers below are from `b8547ffd`.

## 1. The exact ask

**Issue #1508** (mvdbeek, 2025-03-27, still open, 0 comments, no labels, no milestone).
Body in full:

> Suddenly became important for the VGP project that is now uploading workflows from a google drive

That is the entire issue. **The reporter wrote no id format and no example command.** Any
claim that #1508 specifies a particular id syntax is unsupported — if the earlier pass
asserted one, it invented it.

So the exact ask, from the title alone: *`planemo run` should accept a Dockstore
(TRS) workflow identifier in place of a local workflow file.* `run` only — nothing about
`test`, `serve`, or `lint`.

**Important cross-reference the earlier pass appears to have missed:** #1508 is a duplicate of
**#1479** ("[Feature request] Use a TRS ID instead of a file for Planemo Run", Delphine-L,
2024-10-23), whose body *does* give a concrete example:

> `planemo run --trs #workflow/github.com/iwc-workflows/Assembly-Hifi-HiC-phasing-VGP4/main --version "v0.1.7" ....`

PR #1596 says "Closes ...issues/1479" and closed #1479 on 2026-01-06. #1508 was never
referenced, so it stayed open. There are **no** cross-reference events on #1508.

Note the shipped UX differs from #1479's literal request: there is no `--trs` flag and no
`--version` flag; the id is positional and the version is embedded in the id. Functionally
equivalent, and #1479's author accepted the close without comment.

## 2. Code read — which id forms are accepted

`planemo/runnable_resolve.py::for_runnable_identifier` recognises, in order:
1. prefix `https://dockstore.org/api/ga4gh/trs/v2/tools/` → strips base, re-prefixes `trs://`
2. `startswith(("workflow/", "tool/", "#workflow/", "#tool/"))` **and** `"/github.com/" in id`
   → re-prefixes `trs://`

`planemo/galaxy/workflows.py`:
- `DOCKSTORE_TRS_BASE = "https://dockstore.org/api/ga4gh/trs/v2/tools/"`
- `parse_trs_id()` splits on `/`, requires >=4 parts, handles both `.../name/<version>` and
  `.../name/versions/<version>`; when no version is given it GETs
  `<base><url-encoded id>/versions` and takes `versions[0]`.
- `_resolve_trs_url()` dispatches full-URL / `trs://` / bare-id.
- `is_trs_identifier()` mirrors the same three shapes.

**Not accepted by design:** a Dockstore *web* URL
(`https://dockstore.org/workflows/github.com/org/repo/name:version`). `is_trs_identifier()`
returns False for it, and `for_runnable_identifier` falls through to `uri_to_path()`, which
downloads the HTML page.

The prompt flagged `/versions/<v>` as a "likely gap" — **refuted**, it is explicitly handled
(`parts[5] == "versions"` branch).

## 3. Test runs (real output)

### `tests/test_trs_id.py` — 17/17 PASSED

```
uv run --no-project --with-editable . --with pytest --with responses --with werkzeug --with flask \
  python -m pytest tests/test_trs_id.py -v
...
tests/test_trs_id.py::TestTRSIdParsing::test_parse_trs_id_workflow_without_version PASSED [  5%]
tests/test_trs_id.py::TestTRSIdParsing::test_parse_trs_id_workflow_with_version PASSED   [ 11%]
tests/test_trs_id.py::TestTRSIdParsing::test_parse_trs_id_with_hash_prefix PASSED        [ 17%]
tests/test_trs_id.py::TestTRSIdParsing::test_parse_trs_id_tool PASSED                    [ 23%]
tests/test_trs_id.py::TestTRSIdParsing::test_parse_trs_id_version_fetch_failure PASSED   [ 29%]
tests/test_trs_id.py::TestTRSIdParsing::test_parse_trs_id_invalid PASSED                 [ 35%]
tests/test_trs_id.py::TestTRSUriParsing::test_parse_trs_uri_workflow PASSED              [ 41%]
tests/test_trs_id.py::TestTRSUriParsing::test_parse_trs_uri_with_version PASSED          [ 47%]
tests/test_trs_id.py::TestTRSUriParsing::test_parse_trs_uri_from_full_url PASSED         [ 52%]
tests/test_trs_id.py::TestTRSUriParsing::test_parse_trs_uri_invalid PASSED               [ 58%]
tests/test_trs_id.py::TestTRSWorkflowImport::test_import_workflow_from_trs PASSED        [ 64%]
tests/test_trs_id.py::TestTRSWorkflowImport::test_import_workflow_from_trs_with_version PASSED [ 70%]
tests/test_trs_id.py::TestTRSWorkflowImport::test_import_workflow_from_trs_invalid_uri PASSED  [ 76%]
tests/test_trs_id.py::TestTRSIdIntegration::test_for_runnable_identifier_with_trs_id PASSED    [ 82%]
tests/test_trs_id.py::TestTRSIdIntegration::test_for_runnable_identifier_with_hash_prefix PASSED [ 88%]
tests/test_trs_id.py::TestTRSIdIntegration::test_for_runnable_identifier_with_tool_trs_id PASSED [ 94%]
tests/test_trs_id.py::TestTRSIdIntegration::test_for_runnable_identifier_with_full_dockstore_url PASSED [100%]
======================= 17 passed, 2 warnings in 19.98s ========================
```

### `tests/test_run.py::RunTestCase::test_run_trs_id`

Cannot be run locally without spinning a Galaxy — it is gated by
`@skip_if_environ("PLANEMO_SKIP_GALAXY_TESTS")`, `@mark.tests_galaxy_branch`, and skipped on
Galaxy 22.05. **But it does run in upstream CI** and I confirmed it *executed* (not skipped)
on the exact commit under review.

`tox.ini`: `gx: PYTEST_MARK="tests_galaxy_branch"`; `quick:` sets `PLANEMO_SKIP_GALAXY_TESTS=1`
(so only the non-`quick` `gx-*` jobs run it). CI matrix has `...-gx-231`, `...-gx-250`,
`...-gx-dev`.

Latest master run (`b8547ffd`, run 35576757811, 2026-09-21) — all 13 jobs `success`. Log of
job `unit-nonredundant-noclientbuild-noshed-gx-dev` (id 106260229499):

```
2026-09-21T08:36:40Z tests/test_run.py::RunTestCase::test_run_trs_id PASSED   [ 77%]
2026-09-21T08:44:03Z == 24 passed, 3 skipped, 566 deselected, 1191 warnings in 1756.65s (0:29:16) ===
```

That test does a real `planemo run '#workflow/github.com/jmchilton/galaxy-workflow-dockstore-example-1/mycoolworkflow' wf3-job.yml`
against a provisioned Galaxy and asserts `tool_test_output.{html,json}` exist. So the feature
is verified working end-to-end, not merely "reads like it should work".

## 4. Direct exercise per id form

Two probes against `origin/master`. **Network calls to dockstore.org were made** (deliberately —
`parse_trs_id` version lookup and `fetch_workflow_from_trs` both hit the live API). Sanity
check first: `GET .../%23workflow%2Fgithub.com%2Fiwc-workflows%2Fparallel-accession-download%2Fmain/versions`
→ `200`, names `['main', 'v0.1.15', 'v0.1.14', 'v0.1.13', 'v0.1.12']`.

### 4a. Library level (`for_runnable_identifier` / `_resolve_trs_url` / `fetch_workflow_from_trs`)

| # | Id form | `is_trs_identifier` | `for_runnable_identifier` | `fetch_workflow_from_trs` |
|---|---|---|---|---|
| A | `#workflow/github.com/iwc-workflows/parallel-accession-download/main` | True | OK `trs://#workflow/.../main`, `galaxy_workflow`, `is_trs=True` | OK — "Parallel Accession Download", 5 steps |
| B | same without leading `#` | True | OK `trs://workflow/.../main` | OK — 5 steps |
| C | `https://dockstore.org/api/ga4gh/trs/v2/tools/#workflow/.../main/versions/v0.1.14` | True | OK `trs://#workflow/.../main/versions/v0.1.14` | OK — 5 steps |
| D | `https://dockstore.org/workflows/github.com/iwc-workflows/parallel-accession-download/main:v0.1.14` (**web URL**) | **False** | **FAIL** `ExitCodeException(4)` — "Unable to determine runnable type for path [/var/.../tmpXXXmain:v0.1.14]" (it downloaded the HTML page) | **FAIL** `ValueError ... 404` against a nonsense URL |
| E | `#workflow/github.com/.../main/versions/v0.1.14` (explicit `/versions/`) | True | OK `trs://#workflow/.../main/versions/v0.1.14` | OK — 5 steps |
| F | `#workflow/github.com/.../main/v0.1.14` (short version suffix) | True | OK | OK — 5 steps |

### 4b. Real CLI, no Galaxy needed (`planemo workflow_job_init <id> -o job.yml`)

**Layer caveat, stated plainly:** this table is `workflow_job_init`, *not* `run`. The only
form CI exercises through `planemo run` itself is form **A** (bare
`#workflow/github.com/jmchilton/galaxy-workflow-dockstore-example-1/mycoolworkflow`, no
version). B/C/E/F are verified at the resolution layer (4a) and through the `workflow_job_init`
CLI (4b); they converge on the same `for_runnable_identifier` → `trs://` normalization that
`run` consumes, so the residual risk is low, but it is inference, not measurement.

| # | Id form | exit | output |
|---|---|---|---|
| 1 | `#workflow/.../main` | 0 | valid job template (`Run accessions: {class: File, ...}`) |
| 2 | `workflow/.../main/v0.1.14` | 0 | valid job template |
| 3 | `#workflow/.../main/versions/v0.1.14` | 0 | valid job template |
| 4 | full TRS API URL `.../tools/#workflow/.../versions/v0.1.14` | 0 | valid job template |
| 5 | Dockstore **web** URL `.../workflows/github.com/...:v0.1.14` | **1** | `Exception: Input workflow could not be successfully normalized - try linting with planemo workflow_lint.` |

So five of six plausible forms resolve and fetch for real against the live Dockstore API;
form A additionally has a green end-to-end `planemo run` in CI.

## 5. Gap (the only one)

**Dockstore web URLs are not accepted**, and fail with a misleading error.

This matters because the web URL is what a user copies out of the browser address bar;
the TRS id (`#workflow/github.com/...`) has to be found in Dockstore's UI. So the single
most likely thing a VGP user pastes is the one form that fails. Two sub-issues:

1. `for_runnable_identifier` silently treats it as a downloadable path → `ExitCodeException(4)`
   / "could not be successfully normalized - try linting with planemo workflow_lint", which
   sends the user down the wrong road.
2. `_resolve_trs_url("https://dockstore.org/workflows/github.com/org/repo/name:v")` does not
   raise — it happily returns the garbage URL
   `https://dockstore.org/api/ga4gh/trs/v2/tools/#https://dockstore.org/workflows/github.com/versions/iwc-workflows`.
   `parse_trs_id` never validates that `parts[1] == "github.com"` (it only checks `len(parts) >= 4`),
   so any 4+-segment string parses "successfully". That is a latent correctness bug in its own
   right, currently masked because `is_trs_identifier()` gates the call sites.

**This is a follow-up issue, not a reason to hold #1508 open.** #1508 asked for "dockstore id";
the TRS id *is* the Dockstore id, and it works. Converting web URLs is an additive convenience.

### Reuse / abstraction finding (root cause of the sub-issue above)

There are **two parallel TRS predicates that do not agree**:

- inline in `planemo/runnable_resolve.py`:
  `is_trs_id = id.startswith(("workflow/", "tool/", "#workflow/", "#tool/")) and "/github.com/" in id`
- exported `planemo/galaxy/workflows.py:844 is_trs_identifier()`, which *also* accepts the
  `trs://` prefix and the full `DOCKSTORE_TRS_BASE` URL.

The `"/github.com/" in id` check — the only thing rejecting junk — exists **only** in the inline
copy. `parse_trs_id`/`_resolve_trs_url` trust the other one, and validate nothing beyond
`len(parts) >= 4`. That split is precisely why `_resolve_trs_url` can return a malformed URL
without raising. Consolidating on the exported `is_trs_identifier` and moving service-segment
validation into `parse_trs_id` would remove the duplication and close the latent bug in one
change.

### Secondary observations (not blockers, worth noting in any follow-up)

- Unversioned ids resolve to `versions[0]` from the Dockstore listing. For the IWC workflow
  that is `main` (the branch), **not** the newest release `v0.1.15`. The code comment says
  "Get the first version (usually the latest/default)" — that is wishful; it is "whatever
  Dockstore happened to list first". Non-reproducible runs are the risk.
- `parse_trs_id`'s `except Exception: pass` around the version lookup falls back to
  `default_version = workflow_name` (i.e. version `main` for a workflow named `main`), so a
  network failure is indistinguishable from success. `test_parse_trs_id_version_fetch_failure`
  enshrines this.
- No user-facing docs: `grep -rni "\btrs\b" docs/` returns nothing, and `cmd_run.py` help text
  never mentions TRS or Dockstore. Discoverability is zero outside the PR description.
- Quoting trap: PR #1596 advertises `planemo run #workflow/... job.yml` **unquoted**. In bash a
  leading `#` starts a comment, so that line as printed does not work (interactive zsh is more
  forgiving). Any docs or closing comment should quote the id — I did in every probe and in the
  draft comment below.
- Coverage is broader than the issue asked for: `for_runnable_identifier(s)` is shared by
  `run`, `test`, `workflow_job_init`, `workflow_edit`, `upload_data`, `list_invocations`,
  `invocation_download`, `workflow_test_on_invocation`. `serve` (uses `for_paths`) and
  `workflow_lint` do **not** accept TRS ids. The issue only asked for `run`.

## 6. Git history

| commit | date | author | subject |
|---|---|---|---|
| `be59af4d` | 2026-01-05 | mvdbeek | Add TRS ID support for planemo run |
| `9a6c3482` | 2026-01-05 | mvdbeek | Add tool installation support for TRS workflows |
| `52765f2f` | 2026-01-05 | mvdbeek | Implement creating job template for workflows via trs id |
| `d82f4570` | 2026-01-05 | John Chilton | Add type annotations to TRS workflow functions |
| `33398dc0` | 2026-01-06 | mvdbeek | Fix TRS ID parsing logic for workflow names and versions |
| `102bff80` | 2026-01-06 | mvdbeek | Ensure TRS URLs always include /versions/ for Galaxy validation |
| `acf40851` | 2026-01-06 | mvdbeek | Update test_run_trs_id to use workflow that exists on Dockstore |
| `1839520f` | 2026-01-06 | mvdbeek | Skip test_run_trs_id on Galaxy 22.05 and fix black formatting |
| `99708659` | 2026-01-06 | mvdbeek | Refactor TRS tests using dependency injection and HTTP fixtures |
| `da986a12` | 2026-01-06 | — | **Merge PR #1596** "Add TRS ID support for ``run`` and ``workflow_job_init``" |

All **after** the issue was filed (2025-03-27). Merged 2026-01-06T13:00:23Z. Later maintenance
(`c30a2ed0`, `9192c74a`, `be9fc70f`, `3e565c47`) kept the path working through gxformat2 API
changes, and CI still passes today.

PR #1596's own description demonstrates exactly the forms I confirmed:

```
planemo run workflow/github.com/iwc-workflows/parallel-accession-download/main job.yml
planemo run #workflow/github.com/iwc-workflows/parallel-accession-download/main/v0.1.14 job.yml
planemo run https://dockstore.org/api/ga4gh/trs/v2/tools/#workflow/.../main/versions/v0.1.14 job.yml
```

## 7. Draft closing comment (one sentence — human to review before posting)

> Implemented in #1596 (`be59af4d` "Add TRS ID support for planemo run", merged 2026-01-06): `planemo run` now accepts a Dockstore TRS id positionally in place of a workflow file — `planemo run '#workflow/github.com/iwc-workflows/parallel-accession-download/main/v0.1.14' job.yml` — covered end-to-end by `tests/test_run.py::RunTestCase::test_run_trs_id` and by the 17 resolution tests in `tests/test_trs_id.py`.

(If posted via `gh` it needs the standard "posted by Claude on their behalf" marker per the
user's convention. Note this issue's closure could reasonably be phrased as "duplicate of
#1479", which PR #1596 actually closed.)

## Suggested follow-up issue (do not file without asking)

"planemo run should accept Dockstore web URLs, not just TRS ids" — three parts:

1. Convert `https://dockstore.org/workflows/github.com/<org>/<repo>/<name>:<version>` into
   `#workflow/github.com/<org>/<repo>/<name>/<version>`.
2. Consolidate the two divergent TRS predicates onto the exported `is_trs_identifier()` and
   drop the inline copy in `runnable_resolve.py`.
3. Make `parse_trs_id` validate the service segment rather than returning a malformed URL for
   any 4+-segment string.
