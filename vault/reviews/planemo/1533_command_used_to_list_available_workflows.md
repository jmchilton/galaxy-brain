# PR 1533 — command used to list available workflows

- **PR:** https://github.com/galaxyproject/planemo/pull/1533
- **Author:** Smeds (Patrik Smeds)
- **Opened:** 2025-06-03 · last author activity 2025-06-19
- **Reviewed:** 2026-08-20
- **Worktree:** `~/projects/worktrees/planemo/pr/1533`
- **Size (as submitted):** +99 / -0, 2 files

Adds `planemo list_workflows`, a sibling to the existing `list_invocations` —
queries a Galaxy for its workflows and prints a table, or JSON under `--raw`.

## Status

Taken over. **#1533 closed 2026-08-20 in favor of #1681**
(https://github.com/galaxyproject/planemo/pull/1681), pushed from
`jmchilton:list_workflows_rebased`. Smeds never returned after being asked (2025-06-19) to rebase the
`api.py` conflict, and never addressed mvdbeek's `//`-in-URL note from
2025-06-18. Rebased onto master and fixed up here.

Prior review on the PR:

- **mvdbeek (2025-06-18):** suggested `rich` (already used elsewhere in planemo)
  over `tabulate`; flagged spacing and the `//` in the constructed URL.
- **jmchilton (2025-06-19):** fine as-is, better table is an easy follow-up he'd
  take on himself; asked for a rebase.

Because the table restyle was *explicitly* deferred to a follow-up, this pass
does not migrate to `rich`. It does make that follow-up a one-function change —
see finding 1.

## Rebase

One commit, 281 commits of drift. Single conflict in `planemo/galaxy/api.py`:
pure add/add — master added `export_invocation_as_archive`, the PR added
`get_workflows`, in the same spot. Kept both. Smeds' authorship preserved.

## Findings

### 1. Five copies of the same table-rendering dance (reuse)

Every command that prints a table carries this:

```python
try:
    from tabulate import tabulate
except ImportError:
    tabulate = None  # type: ignore
...
if tabulate is not None:
    print(tabulate({...}, headers="keys"))
else:
    error("The tabulate package is not installed, ...")
    print(json.dumps(...))
```

`cmd_list_invocations.py`, `cmd_list_alias.py`, `cmd_delete_alias.py`, and now
`cmd_list_workflows.py`. The PR makes it four live copies plus one dead one.

**The guards are dead code.** `tabulate` has been an unconditional entry in
`requirements.txt` since `976843e9` — *"Require tabulate for list_invocations.
It doesn't have any requirements itself and is MIT licensed, so why not."* The
commit that made the fallback unnecessary never deleted it. `cmd_delete_alias.py`
imports `tabulate` and never calls it at all.

**Fixed:** added `planemo.io.print_table(columns)`, converted all four commands,
deleted the guards and the JSON fallbacks. This is deliberately a thin wrapper —
its value is that the promised `rich` migration becomes a single-function edit
instead of a four-file sweep.

Knock-on: `tests/test_external_galaxy_commands.py:100` asserted
`"1 jobs ok" in result.output or '"ok": 1' in result.output` with the comment
*"so it passes regardless if tabulate is installed or not"*. The `or` branch is
now unreachable, so it was tightened to the first clause only — strengthening,
not weakening. (That whole class is `@skip`ped anyway; see finding 7.)

### 2. The `Url` column pointed at an API endpoint

```python
"Url": [format_url(f"{url}/{workflow['url'].strip('/')}") ...]
```

`workflow["url"]` from bioblend is `/api/workflows/<id>`, so the column rendered
`https://usegalaxy.org/api/workflows/abc123` — a JSON endpoint. Nothing a user
can usefully click, which is the substance behind mvdbeek's "url construction
could be better."

**Fixed:** link to `/published/workflow?id=<id>` when the workflow is published,
`/workflows/edit?id=<id>` otherwise. Both routes verified against
`client/src/entry/analysis/router.js` in the galaxy tree (lines 163 and 189).
This also gives the `published` field a job — see finding 4.

### 3. `//` in the URL — mvdbeek's note, still live

The expression strips slashes off the *workflow* path but not the *base*:

```
base 'https://usegalaxy.org/'  ->  https://usegalaxy.org//api/workflows/abc123
```

Reproduced exactly. `list_invocations` already does `.strip("/")` on the base;
this didn't.

**Fixed:** `galaxy_url.rstrip("/")`. Also switched `list_invocations` from
`.strip("/")` to `.rstrip("/")` — stripping the leading character of a URL was
never intended.

### 4. `published` fetched, never shown

`get_workflows` collected `published` into its dict, but no column displayed it;
it surfaced only under `--raw`.

**Fixed:** rendered as a `Published` yes/no column, and used to pick the link
target in finding 2.

### 5. `"N/A"` display placeholder leaked into `--raw` JSON

`get_report_url` returned the literal string `"N/A"` when `source_metadata` was
absent, and `format_url()` in the command translated `"N/A"` back to `""` for
display. A sentinel round-tripping through a magic string — and `--raw`, whose
whole purpose is machine consumption, emitted `"repo_url": "N/A"` instead of
`null`.

**Fixed:** return `None` from the API layer, blank the cell at render time.
`format_url` deleted.

### 6. No `--profile` and no `--galaxy_url` → raw traceback

```
$ planemo list_workflows
...
  File ".../bioblend/galaxyclient.py", line 54, in __init__
    if not url.lower().startswith("http"):
AttributeError: 'NoneType' object has no attribute 'lower'
```

The siblings dodge this with `profile_option(required=True)`. This command
deliberately accepts *either* a profile or a url/key pair, which is a genuine
usability improvement over the siblings — but nothing validated that at least
one was supplied.

**Fixed:** `click.UsageError` (the established planemo convention — 4 existing
uses).

Related: the non-profile branch read `kwds.get("galaxy_admin_key")`, but the
command never declared `@options.galaxy_admin_key_option()`, so it was always
`None`. Added the option, which makes the existing `or` meaningful.

### 7. No tests

`tests/test_external_galaxy_commands.py` is where a command like this would
naturally be exercised — but the entire class is
`@skip("Configuring quay.io/bgruening/galaxy:latest is currently broken")`, so
adding a case there would verify nothing.

**Fixed:** new `tests/test_cmd_list_workflows.py` — 8 cases against a mocked
bioblend client, running under `unit-quick`. Written red-to-green: with the
source fixes stashed, 4 of the 8 fail, one per real bug (findings 2, 3, 5, 6).

### 8. Naming: `get_report_url` returns the repo URL

Assigned straight into `"repo_url"`. Renamed `get_repo_url`. Also renamed the
local `inv_gi` → `wf_gi` in `get_workflows`, copy-pasted from `get_invocations`.

### 9. Docs not regenerated

`docs/commands/<name>.rst`, the include list in `docs/commands.rst`, and the
`automodule` entry in `docs/planemo.commands.rst` are generated but checked in.
The PR added none.

**Fixed** — with a caveat: running `scripts/commands_to_rst.py` rewrote 19
unrelated command docs, because master's checked-in docs are stale against
current code (new options from other merged PRs, plus trailing-whitespace
churn). Reverted all of that and kept only what this PR owns. **The staleness is
pre-existing and worth its own cleanup** — see follow-ups.

## Verification

| Gate | Result |
| --- | --- |
| `flake8` (CI `lint`) | clean |
| `black --check` / `isort --check` / `ruff check` | clean |
| `mypy planemo tests/` | 23 errors, all pre-existing, none in touched files |
| `pytest tests/test_cmd_list_workflows.py` | 8 passed |
| Red check (fixes stashed) | 4 failed / 4 passed |
| Related modules | 25 passed, 1 skipped |

`lint_docstrings` is in `tox.ini`'s envlist but not in the CI matrix — it has
2356 pre-existing failures, so it is not a gate.

## Commits

```
c04e6fb1 command used to list available workflows        (Smeds, rebased)
8484fae4 Share table rendering across the list_* commands
4bbb1f57 Fix list_workflows URLs, placeholders, and missing-target handling
5265dbcd Test list_workflows and rebuild its docs
```

## Follow-ups

- [ ] The `rich` migration jmchilton offered to take on — now a one-function
      change in `planemo.io.print_table`.
- [ ] `docs/` is stale against master by 18 files, from two causes: genuinely
      missing options (`--shed_tool_data_table_config` is in `options.py` but
      not in the committed `run.rst`), and trailing whitespace the generator
      emits that the committed files lack — which flip-flops on every
      regeneration. `lint_docs` builds the docs but never checks them for
      drift, which is why this rotted.
- [x] `rich` undeclared in `requirements.txt` — fixed in
      [#1682](https://github.com/galaxyproject/planemo/pull/1682).

## Outcome

Pushed to `jmchilton/planemo` as `list_workflows_rebased`; opened as
[#1681](https://github.com/galaxyproject/planemo/pull/1681) crediting Smeds;
#1533 commented and closed pointing at it.

The "reopen" in the original instruction was a misnomer — #1533 was open the
whole time, never closed. Confirmed the intent before acting.

## Correction — stale base

The first pass of this review rebased onto a **stale local `master`**
(`d3ce9bfe`), 41 commits behind `origin/master` (`72cb551a`). Two consequences,
both since fixed:

1. **#1681 was opened on the wrong base.** Rebased onto real `origin/master`
   (clean, no conflicts) and force-pushed. Now `MERGEABLE`.
2. **One "finding" was not real.** I reported `galaxy-tool-util-models` as
   unpinned while `galaxy-tool-util` was pinned, and demonstrated a clean
   resolve producing 26.0.1 vs 26.1.1 with planemo failing to import outright.
   That reproduced only because the stale base predated
   `315c3f36 "Constrain galaxy-tool-util-models version"` (mvdbeek, in #1674).
   Real master already carries `galaxy-tool-util-models>=25.1,<26.2`, and a
   clean resolve against it gives 26.1.1 across all three packages. **Withdrawn.**

The `rich` finding was re-verified against `origin/master` and does hold.

`ghwt create` branches off the local `master` ref without fetching, so a
worktree created from a stale clone starts stale. Worth a `git fetch` before
trusting the base.
