# Planemo PR #1130 — `ci_find*: include sub and parent dirs`

- **PR**: https://github.com/galaxyproject/planemo/pull/1130 (bernt-matthias, opened 2021-01-17, still OPEN)
- **Closes**: https://github.com/galaxyproject/planemo/issues/1129
- **Worktree**: `~/projects/worktrees/planemo/pr/1130`, branch `topic/sub-parent`, merged with current master (`eac5530a`) + formatting commit `93c1fbb9`. Original head tagged `pr1130-premerge` (`7fb3f5a5`).
- **Net diff**: `planemo/ci.py` (+2 module-level helpers, rewire `filter_paths`), `planemo/options.py` (help-text only).

---

## Verdict

**Do not land as-is. Rework behind the opt-in flag both parties already agreed to in 2021.**

The problem is real and still unfixed in master. The fix is disproportionate to it, and in its current form it
has three defects that I reproduced end-to-end against the actual CLI:

1. It makes `planemo ci_find_tools --changed_in_commit_range` **crash with an uncaught traceback and exit 1**
   on any commit range that deletes a directory. In tools-iuc, deprecating or renaming a tool does exactly
   this. Under the CI action's `set -exo pipefail` the whole setup job dies.
2. It **silently drops** 22 live tools-iuc repos (those with no subdirectory) from `ci_find_repos`, via a
   trailing-slash path that can never match.
3. A tool XML **broken by the very commit under test** causes the selection to escalate to the whole parent
   tree — 299 unrelated tools in my synthetic 300-tool repo.

Separately, and independent of the bugs: mvdbeek asked for this to be an opt-in flag, bernt-matthias agreed
and proposed the name (`--extended_git_diff`), and **the flag was never implemented**. The last code commit on
the branch (`7fb3f5a5`, 2021-01-17) predates the review. The branch as it stands changes default behavior for
every existing consumer, which is precisely what the review asked it not to do.

I would not close it. The underlying gap (issue #1129) is genuine and master has not addressed it in five
years. But this needs a rewrite, not a merge-and-iterate.

---

## Is it correct?

Findings ranked by severity. Everything marked **[verified]** I reproduced by running code; **[reasoned]**
means I traced it through source I read but did not execute.

### 1. `changed_tools` crashes when a changed path's directory no longer exists — **[verified, CLI]**

`planemo/ci.py:80` calls `yield_tool_sources_on_paths(ctx, [diff_dir], recursive=True)`. `git diff
--name-only` lists deleted files, so `diff_dir` may not exist. `galaxy.tool_util.loader_directory._find_tool_files`
raises unconditionally in that case.

Reproduced: two-tool repo, `git rm -r tools/t2`, then

```
$ planemo ci_find_tools --changed_in_commit_range 'HEAD~..HEAD' .
...
Exception: Could not load tools from path [tools/t2] - this path does not exist.
EXIT=1
```

Master does no filesystem work at all on this branch (`diff_paths = diff_files`) and cannot fail this way.

Blast radius: `planemo_ci_actions.sh` runs `planemo ci_find_tools "${PLANEMO_COMMIT_RANGE[@]}" ...` in setup
mode under `set -exo pipefail`. Any tools-iuc PR that moves a tool to `deprecated/`, renames a tool
directory, or removes the last file from a subdirectory would take the setup job down with a Python
traceback. This is routine maintenance traffic, not an edge case.

### 2. Flat shed repos are silently dropped from `ci_find_repos` — **[verified, CLI]**

`changed_repos` (`ci.py:64-67`) globs `diff_dir + "/**/"`, which yields directory strings **with a trailing
slash**. `metadata_file_in_path` (`ci.py:90-95`) returns its argument verbatim on a hit, so when the changed
file sits directly in the repo directory the function returns `tools/flattool/`. Meanwhile `filter_paths`
builds `unique_paths` with `os.path.relpath` (`ci.py:38`), which normalizes to `tools/flattool`. The
intersection is empty.

```
master diff_paths: {'tools/flattool'}  -> selected: {'tools/flattool'}
PR     diff_paths: {'tools/flattool/'} -> selected: set()
```

and at the command level, on a repo whose only tool XML just changed:

```
$ planemo ci_find_repos --changed_in_commit_range 'HEAD~..HEAD' .
(no output, exit 0)
```

Repos that have *any* subdirectory are saved by accident: the glob also returns e.g. `tools/foo/test-data/`,
and `metadata_file_in_path` walks *up* from there, returning the unsuffixed `tools/foo`. So the set usually
contains both forms and the correct one matches. That accident is why this isn't catastrophic — but it makes
the failure silent and layout-dependent, which is worse to debug.

Measured scope against the live tools-iuc tree (GitHub trees API, 19,618 blobs): **1,304 shed repos total,
393 with no subdirectory, of which 22 are outside `deprecated/`/`packages/`** — i.e. 22 repos that CI would
stop testing without any error:

```
suites/suite_fasta_tools, tools/bellavista, tools/calculate_numeric_param,
tools/compose_text_param, tools/data_source_iris_tcga, tools/ebi_tools, tools/eukrep,
tools/gdcwebapp, tools/gwtc_analysis, tools/longdust, tools/muon, tools/ncbi_entrez_direct,
tools/oatk, tools/panta, tools/pirate, tools/recount3, tools/seurat, tools/sopa,
tools/spacexr, tools/spatialdata, tools/squidpy, tools/weather_app
```

Fix is one `os.path.normpath` (or `.rstrip(os.sep)`), but the fact that the bug survived to now is the
argument for tests, below.

### 3. A tool broken by the commit under test explodes the selection — **[verified in-process]**

`changed_tools` uses `len(new_diff_paths) == 0` as its loop-termination signal (`ci.py:79`), and skips
load errors (`ci.py:81-82`). A directory whose only tool fails to parse therefore looks *empty*, and the walk
escalates to the parent.

In the 300-tool synthetic repo, changing `tools/broken/broken.xml` (malformed XML) selects **299 tools** —
every tool in the repo except the broken one. Master selects the one path and then loses it to the
intersection, i.e. 0.

**[reasoned]** The user-facing shape, traced through `planemo_ci_actions.sh` lint mode: those 299 paths land
in `tool_list.txt`; the action then checks each entry against `repository_list.txt` and emits
`Tool <path> not in changed repositories list: .shed.yml file missing` for every non-match, failing lint —
while the genuinely broken tool is the one thing silently absent from the list. That is a spectacularly
confusing failure mode for a tool author who just fluffed an XML tag.

This is the concrete answer to "does silently skipping `is_tool_load_error` hide broken tools?" — it does,
and it also mis-steers the walk. Load-error directories must count as non-empty for termination purposes even
if their tools are excluded from the result.

### 4. Escalation on any tool-free directory is unbounded by anything but `""` — **[verified]**

Both helpers walk upward until `diff_dir == ""`. The `""` guard is deliberate (bernt-matthias explains it in
the inline comment) and does work: a changed file at the repo root has `os.path.dirname(p) == ""`, so the loop
body never runs.

But one level below the root is unguarded. Adding a `tools/README.md` to tools-iuc — a file directly inside a
first-level container directory — selects **every repo and every tool in the repository**:

```
NEW tools/README.md:  repos master=0 -> PR=600   tools master=1 -> PR=300
```

(600 = 300 real + 300 trailing-slash duplicates from finding #2.)

Today tools-iuc happens to have no files directly under `tools/` (verified via the contents API), and
`.github/workflows/*` escalates only as far as `.github` before hitting `""`. So this is a landmine rather
than a live fire — but it is one commit away, and it is exactly the scenario mvdbeek's opt-in-flag request
was meant to keep out of the default path. Repos with a deeper container layout (`workflows/<category>/...`
in IWC) have shorter fuses.

The `git rev-parse --show-toplevel` assertion bernt-matthias floated is the right instinct and is *not* the
`.git`-presence proxy mvdbeek rejected — it's a direct query, not a heuristic. Worth revisiting.

### 5. Performance regression on the `path_type="file"` branch — **[reasoned, with supporting measurement]**

Master's file branch is `diff_paths = diff_files` — zero filesystem I/O. The PR replaces it with
O(changed_files) recursive tool-XML parses. Note `changed_repos` dedupes to distinct directories
(`ci.py:59`, `diff_dirs = set(...)`) but `changed_tools` iterates **per file** (`ci.py:75`) with no
memoization — so a PR touching 40 files in one tool directory re-parses that directory 40 times. Same commit,
same author, inconsistent.

My timings are warm-up-dominated and my synthetic tools are trivially small, so I won't quote them as a
benchmark; the shape of the regression is the point. On a real tools-iuc PR touching a data-heavy tool this
is seconds-to-minutes of avoidable work in the critical-path setup job.

### 6. Reuse: the load-error skip duplicates an existing parameter — **[verified]**

`yield_tool_sources_on_paths` has taken a `yield_load_errors` argument since **2017** (`44a0a7c6`,
`planemo/tools.py:50-62`). `changed_tools` requests errors and then hand-filters them with `is_tool_load_error`
— which is a verbatim copy of the loop already in `planemo/commands/cmd_ci_find_tools.py:31-33`. So the PR
takes a two-line pattern that was already duplicated once and makes it three, when
`yield_tool_sources_on_paths(ctx, [diff_dir], recursive=True, yield_load_errors=False)` expresses it directly
(and, as a bonus, reports the error via `planemo.io.error` instead of swallowing it).

Also unused: the `exclude_deprecated` parameter on the same function, which overlaps with what the CI action
achieves via `--exclude deprecated`.

Per the standing reuse concern: this change **accretes**. It adds two module-level helpers that duplicate an
existing keyword argument and an existing call pattern, and leaves behind no abstraction anyone else can use.
The natural reusable unit here — "given a changed file, find the owning tool/repo" — is never named as such;
`metadata_file_in_path` is the closest thing to it and is called from inside a glob loop rather than extended.

### 7. Help-text string-concatenation bug — **[verified]**

`planemo/options.py:2035-2036`:

```python
help="Include only tools (resp. repositories) contained in (non-root)"
"directories that include a file that changed in the given commit range.",
```

Missing space. Renders as:

```
--changed_in_commit_range TEXT  Include only tools (resp. repositories)
                                contained in (non-root)directories that
                                include a file that changed in the given
                                commit range.
```

Also: `docs/commands/ci_find_repos.rst`, `ci_find_tools.rst` and `list_repos.rst` still carry the old
`Exclude paths unchanged in git commit range.` text and would need regenerating. And the new wording leaks an
implementation detail ("(non-root)") that will be meaningless to users without the flag's limitations
documented — which is the help text mvdbeek asked for and which doesn't exist yet.

### 8. Zero test coverage — **[verified]**

There is no `tests/test_ci.py`. Nothing in `tests/` exercises `filter_paths`, `changed_repos`, `changed_tools`
or `metadata_file_in_path`; `tests/test_io.py:39` covers the unrelated `planemo.io.filter_paths`. bernt-matthias
wrote "I can easily use test cases that include changes in the tool xml" in the 2021 thread; no test was added.

Findings #1, #2 and #3 are all trivially expressible as unit tests over a `tmp_path` fixture. That three
distinct defects sit in 40 lines of untested CI-selection logic is the single strongest argument against
merge-and-iterate here: when this logic is wrong, it is wrong *silently*, in a job whose entire purpose is to
decide what gets checked.

### What it does get right

- `changed_repos` on a collection macro change (`tool_collections/coll/macros.xml`, shed files in
  per-tool subdirectories) correctly selects the 3 sub-repos where master selects 0. **[verified]** This is
  the genuinely new capability.
- `changed_tools` on a test-data or helper-script change correctly resolves to the owning tool XML where
  master resolves to nothing. **[verified]** This is issue #1129, and it is fixed.
- The `""` guard works as documented.

One correction to the PR description: bullet 4, "change of a single tool in a collection where the shed file
is in the parent," was **already handled by master** — `metadata_file_in_path` (`ci.py:90-95`) walks up the
parent chain on its own. Only the *downward* glob (bullet 3) is new for `ci_find_repos`. The upward walk the
PR adds on top is redundant for repos in the common case; for repos it almost never executes past the first
iteration, because `metadata_file_in_path` already found the ancestor.

---

## Is it a good idea?

### Does issue #1129 still exist? Yes.

`git log --since=2021-01-01 origin/master -- planemo/ci.py` returns four commits:
`dddca1dd`, `4d8fc5a8`, `bd88f1d5` (all formatting / syntax modernization) and `3a780ace` (PR #1127, an
unrelated 2021 one-liner). **`ci.py` has had no behavioral change in five years.** Master's file branch is
still `diff_paths = diff_files` (`ci.py:35`), so a tool whose XML is untouched but whose `test-data/` changed
is still missed. Nothing in `planemo/shed/`, `planemo/tools.py` or `planemo/git.py` has grown a
changed-file → tool mapping in the interim. The PR is not redundant.

### But the consumer has drifted in a way that changes the cost/benefit

I read the live `galaxyproject/planemo-ci-action/planemo_ci_actions.sh` (still `@v1`, still what tools-iuc
`.github/workflows/pr.yaml` calls). The important asymmetry:

- **`repository_list.txt`** comes from `ci_find_repos --changed_in_commit_range`. It drives lint, flake8, and
  — via a second, range-less `ci_find_tools` over the repo list — chunk count and the actual `planemo test`
  invocations. **This is what determines what gets tested.**
- **`tool_list.txt`** comes from `ci_find_tools --changed_in_commit_range`. Its only consumer is the lint-mode
  cross-check that every changed tool lives in a changed repo (`.shed.yml file missing`).

So: test selection already handles test-data and script changes today, because `ci_find_repos` already walks
up to the owning `.shed.yml`. The gap issue #1129 describes is real but its live blast radius is a lint
consistency check, not test coverage.

The PR's risk profile is the mirror image of that. The `changed_repos` half — the half with the 600-path
explosion and the silent 22-repo drop — feeds the expensive path. The `changed_tools` half — the half that
actually fixes #1129 — feeds the cheap one. **It takes on high blast radius in the path that decides CI spend,
to close a gap whose live impact is a lint warning.**

### The unaddressed review request

The 2021 thread (`planemo/ci.py:63`, four inline comments) converged cleanly:

> **mvdbeek**: "I think we could avoid going into these details maybe if you added a new flag for the
> recursive behavior (maybe `--recursive`) where in the help text you can list the limitations and how this
> is supposed to be used?"
>
> **bernt-matthias**: "That's fine. ... Just need to think of something different than `--recursive`, because
> this does not capture the essence. Maybe `--extended_git_diff`."

Both parties agreed. **No flag exists on the branch** — `planemo/options.py` carries only the help-text edit,
`ci_find_options()` (`options.py:2070`) is unchanged, and the branch's last code commit predates the review by
a day. mvdbeek's "happy to merge and iterate" was offered *in 2021, to unblock the planemo action*, and was
immediately superseded by bernt-matthias accepting the flag. Treating that sentence as standing approval five
years later, for a branch that never took the agreed change, would be reading it against its plain intent.

The opt-in framing also happens to neutralize most of my correctness findings' severity: behind
`--extended_git_diff`, findings #1, #3 and #4 become opt-in hazards documented in a help string, and the CI
action can adopt the flag deliberately once it has tests. That is a genuinely better shape, not a
bureaucratic one.

### Bottom line

Problem real, still unfixed, worth fixing. Fix disproportionate: default-on, untested, and carrying a hard
crash on a routine repository operation. Rework behind the flag the reviewers already agreed on.

---

## What landing it would require

1. **Add the flag, default off.** `--extended_git_diff` (bernt-matthias's own counter-proposal) in
   `ci_find_options()`. Help text lists the limitations: repo-root cwd assumption, parent-walk escalation,
   cost. Without the flag, `filter_paths` keeps master's behavior verbatim.
2. **Normalize paths in `changed_repos`** (`ci.py:65-67`) — `os.path.normpath` on the glob result before
   `metadata_file_in_path`, or strip the trailing separator on the returned value. Fixes finding #2.
3. **Guard for nonexistent directories in `changed_tools`** (`ci.py:80`) — `os.path.isdir(diff_dir)` before
   the call, or catch the load exception. Fixes finding #1.
4. **Use the existing parameter**: `yield_tool_sources_on_paths(ctx, [diff_dir], recursive=True,
   yield_load_errors=False)` and drop the hand-rolled `is_tool_load_error` skip *and* the now-unneeded
   `is_tool_load_error` import. While there, consider folding
   `cmd_ci_find_tools.py:31-33`'s identical loop into the same call so the codebase ends with one copy
   instead of three.
5. **Treat load-error directories as non-empty for termination** so a broken XML stops the walk instead of
   escalating. Fixes finding #3. (Distinct from #4 — `yield_load_errors=False` changes what's *yielded*, not
   what the loop concludes about emptiness; needs an explicit "did this directory contain any tool file at
   all" signal.)
6. **Dedupe and memoize**: iterate `{os.path.dirname(f) for f in diff_files}` in `changed_tools`, matching
   `changed_repos` (`ci.py:59`), and cache per-directory scan results.
7. **Bound the walk at the repository root** via `git rev-parse --show-toplevel` (planemo already shells out
   to git in `planemo/git.py`, so this is a five-line addition next to `git.diff` at `git.py:115`). Worth
   stating explicitly in the PR that this is a direct query and not the `.git`-presence heuristic mvdbeek
   rejected. Optional if the flag lands, since the flag documents the assumption — but it turns finding #4
   from a landmine into an error message.
8. **Tests.** New `tests/test_ci.py`, `tmp_path` fixtures building small shed trees:
   flat repo (no subdirs) + XML change; repo with `test-data/` + data-only change; collection with macros in
   parent and `.shed.yml` per sub-tool; deleted tool directory; directory containing only a malformed tool
   XML; changed file directly under a first-level container directory. Drive `changed_repos` / `changed_tools`
   directly and assert the exact selected sets. Red-to-green: findings #1, #2 and #3 each have a failing test
   today.
9. **Fix the help-text concatenation** (`options.py:2035`) and regenerate
   `docs/commands/ci_find_{repos,tools}.rst` and `docs/commands/list_repos.rst`.
10. **Add a `HISTORY.rst` entry** — every prior `ci_find*` change has one.
11. **Rebase rather than carry `eac5530a`** — the merge commit is local scaffolding, and `93c1fbb9` is a
    formatting pass over code that is about to be rewritten. Note the merged code reintroduced
    `set(... for ...)` at `ci.py:59` and `ci.py:86` where master has been modernized to set comprehensions.

---

## Open questions

- Adopt `--extended_git_diff`, or a different name? "extended" still doesn't say *what* is extended.
  `--changed_in_commit_range_recursive`? `--infer_changed_paths`?
- Should the flag gate both halves, or only `changed_repos`? The `changed_tools` half is what fixes #1129 and
  has far smaller blast radius — arguably it could become the default once #1 and #3 are fixed, with only the
  repo-side downward glob behind the flag.
- Worth splitting into two PRs (tools-side fix for #1129; repos-side downward glob behind a flag)?
- Is bernt-matthias still interested, or should this be taken over? The branch is untouched since 2021-01-17.
- Does the planemo-ci-action need a coordinated change, or is it enough to land the flag and let the action
  opt in separately?
- Do we need the `git rev-parse --show-toplevel` guard at all if the flag's help text states the
  repo-root-cwd requirement, per mvdbeek's "reasonable to expect that the working directory is the repository
  root"?

---

## Reproduction notes

Empirical work used a throwaway venv (`uv venv` + `uv pip install -e .` from the worktree) and synthetic
repos under `/tmp/claude-503/lab/`; the worktree itself was not modified and nothing was pushed or posted.
tools-iuc layout facts came from the GitHub trees/contents API, not a clone.
