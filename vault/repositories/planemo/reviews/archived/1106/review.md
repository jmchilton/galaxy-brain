# Planemo PR #1106 — `consider exclude in shed update`

- **PR**: https://github.com/galaxyproject/planemo/pull/1106 (bernt-matthias, opened 2020-12-06, still OPEN, discussion dead since 2020-12-07)
- **References**: https://github.com/galaxyproject/planemo/issues/554 (open since 2016)
- **Worktree**: `~/projects/worktrees/planemo/pr/1106`, branch `topic/shed_update_exclude`, 4 commits rebased onto current master (`741aab9a`). Pre-rebase head tagged `pr1106-prerebase`. Lint-clean; the 46 shed tests pass.
- **Net diff**: `planemo/shed/__init__.py` (+21/-10), `planemo/shed/interface.py` (+3/-1), `planemo/commands/cmd_shed_build.py` (+2/-1). No tests, no docs, no `HISTORY.rst`.

---

## Verdict

**Close it.** Not "rework" — there is no residue worth reworking.

Three of the four commits are provably redundant: master already honors `.shed.yml`
`exclude:`/`ignore:` on build and upload, and I measured byte-identical tarball file sets
across the two branches. The fourth commit is the only behavioral change, and it changes
behavior in the wrong direction: it blinds `shed_diff` to exactly the signal that tells a
user their Tool Shed copy is stale, and it silently stops `shed_download` from mirroring
the shed.

Along the way the PR introduces a regression I reproduced at the CLI: `shed_build` on an
`auto_tool_repositories` config with an explicit top-level `include:` list now **fails**
where master succeeds.

jmchilton's unanswered 2020 question — *"the raw directory structures are materialized
into effective repository structures with includes and excludes handled ... So should any
of this be needed?"* — was correct, and I can now answer it with measurements rather than
a hypothesis. The answer is no.

What the PR is actually reaching for (a `shed_diff` that stops nagging after you add an
`exclude:`) is a real annoyance, but master's nagging is **self-healing** and the PR's fix
makes it permanent. Detail below.

---

## Is it correct?

**[verified]** = I ran it. **[reasoned]** = traced through source I read but did not execute.

### 1. Master already applies `exclude:`/`ignore:` on build and upload — **[verified, CLI]**

`RawRepositoryDirectory._realize_to` (`planemo/shed/__init__.py:1013-1027` on master) builds
`ignore_list` from `_shed_config_excludes(config)` (= `ignore:` + `exclude:`) via `_glob`, and
skips any realized file whose `absolute_src` is in it. The directory case works because `_glob`
(`__init__.py:1319-1323`) expands a directory pattern to `dir/**`, and planemo's `glob` is
**glob2** (`planemo/glob.py`), where `**` is recursive.

Fixture: `.shed.yml` with `exclude: [excluded.txt, test-data]`, plus `kept.txt`,
`excluded.txt`, `scripts/helper.py`, `test-data/1.bed`, `tool.xml`.

```
planemo shed_build   master -> kept.txt  scripts/helper.py  tool.xml   (exit 0)
planemo shed_build   PR1106 -> kept.txt  scripts/helper.py  tool.xml   (exit 0)
```

Identical. Master also already ships a passing test for this — `test_upload_filters_ignore`
(`tests/test_shed_upload.py:210-216`) over `tests/data/repos/single_tool_exclude`.

So `build_tarball`'s new `os.walk` filter (`__init__.py:735-745`), the `cmd_shed_build.py:26-27`
rewire, and the `upload_repository` plumbing (`__init__.py:321-324`) are all dead weight: every
`build_tarball` call site is handed `realized_repository.path`, i.e. a tree from which the
excluded files have already been removed.

One [reasoned] exception, and it is a hazard rather than a feature: `_realize_to` writes
`config["_files"]` entries (`__init__.py:1031` on master) straight into the realized directory *after*
the ignore pass. The only producer is `repository_dependencies.xml` for suite repos
(`__init__.py:652`). A user who wrote `exclude: [repository_dependencies.xml]` would, under
this PR, get a suite tarball missing its dependency manifest. That is the sole case where the
new filter is not a no-op.

### 2. Issue #554 is already fixed on master; this PR does not move it — **[verified, CLI]**

#554 is specifically the demultiplexing case (ImageJ2: every tool's files landing in every
tool's repo). `tests/data/repos/multi_repos_flat_flag` is that shape.

```
planemo shed_upload --tar_only --shed_target toolshed .
  master: shed_upload_cs_cat1.tar.gz -> cat1.xml macros.xml test-data/*
          shed_upload_cs_cat2.tar.gz -> cat2.xml macros.xml test-data/*
  PR1106: identical
```

`cat2.xml` is absent from the `cs-cat1` tarball on both branches. Master handles it at
`_build_auto_tool_repos` (`__init__.py:598-620`), which synthesizes `exclude: [<absolute paths
of the other tools>]`, and `_realize_to` filters on those. Nothing in this PR changes the
outcome. #554, whatever still ails it, is not addressed here.

### 3. The `_glob` exclude filter is a no-op for user-written excludes — **[verified]**

```python
# planemo/shed/__init__.py:1327-1334 (PR)
def _glob(path, pattern, exclude=None):
    ...
    return [_ for _ in glob.glob(pattern) if _ not in exclude]
```

`glob.glob(pattern)` returns paths prefixed with `path`; `exclude` entries are the raw strings
from `.shed.yml`. Instrumented against the fixture from finding #1:

```
  pattern = /tmp/.../fixt/**
  exclude = ['excluded.txt', 'test-data']
  raw      == filtered      DIFFERENT? False
```

It can only ever fire where the exclude entries are already absolute paths — which is exactly
and only the `auto_tool_repositories` path (`__init__.py:619`, `tool_excludes = excludes +
list(other_paths)`). And there it duplicates the filtering `_realize_to` is already doing.
So: dead for the documented use, redundant for the undocumented one.

### 4. ...and in the one case where it *does* fire, it breaks `shed_build` — **[verified, CLI]**

`RealizedFile.realized_files_for` returning an empty list is how `_realized_files`
(`__init__.py:1054-1073`) decides an include is *missing*. Filtering inside `_glob` therefore
turns "this include resolved to files we will later ignore" into "this include resolved to
nothing", and `_realize_to` fails the repository.

`auto_tool_repositories` + an explicit top-level `include:` list (`cat1.xml`, `cat2.xml`,
`macros.xml`):

```
planemo shed_build <repo>
  master: Created: run.tar.gz  (x2)                            EXIT=0
  PR1106: Failed to include files for [{'source': 'cat2.xml'}]
          Failed to include files for [{'source': 'cat1.xml'}]
          Problem encountered executing action for one or more repositories.
          EXIT=254
```

This escapes the 46-test shed suite because **no fixture combines `auto_tool_repositories`
with a top-level `include:`** — `multi_repos_flat_flag` and `multi_repos_flat_flag_suite` omit
`include:` entirely (so the default `**` yields plenty of survivors), and
`multi_repos_flat_configured*` use explicit `repositories:` instead of the auto flag. One
fixture away from red.

### 5. `shed_download` silently stops mirroring the shed — **[verified, mock shed]**

`download_tarball` is shared between `shed_diff` and the user-facing `planemo shed_download`
(`planemo/commands/cmd_shed_download.py:44`). The PR threads `exclude` into it
(`__init__.py:714,726`) and on to `tar --exclude` (`interface.py:85-91`). Upload `single_tool`,
then add `exclude: [related_file, "test-data/1.bed"]`, then download:

```
master: ['.hg_archival.txt', 'cat.xml', 'related_file',
         'test-data/1.bed', 'test-data/1_bed_random_lines_1_seed_asdf_out.bed']
PR1106: ['.hg_archival.txt', 'cat.xml',
         'test-data/1_bed_random_lines_1_seed_asdf_out.bed']
```

`shed_download` is a "show me what is on the shed" command. After this PR it shows you what
is on the shed *minus whatever your local config says you did not want to upload* — which is
the one thing you cannot learn any other way. No flag, no help-text change, no docs, no test.
This is the hunk nobody in the 2020 thread noticed.

### 6. Four matching semantics for one concept — **[verified]**

This is bernt-matthias' own unresolved TODO ("not sure if the use of exclude in diff, os.walk,
and tar is equivalent"). It is not. After the PR there are five application sites:

| site | file:line | matching |
|---|---|---|
| realization ignore list | `__init__.py:1020-1027` (existing) | glob2 path globs, `**` recursive |
| `_glob` filter | `__init__.py:1334` (new) | exact string equality vs. absolute path |
| `build_tarball` walk | `__init__.py:743-744` (new) | exact **basename** equality, no globbing |
| `tar --exclude` | `interface.py:90-91` (new) | tar **path** globs |
| `diff --exclude` | `__init__.py:439-440` (new) | **basename** fnmatch globs |

The diff/tar divergence is load-bearing, and I verified it locally (BSD diff; GNU diff is
basename-matching too per POSIX, **[reasoned]**):

```
$ diff -r A B --exclude "test-data/1.bed"   ->  Only in A/test-data: 1.bed   exit 1
$ diff -r A B --exclude "1.bed"             ->  exit 0
```

So for a path-style exclude the diff suppression comes entirely from `tar --exclude` on the
download side, not from `diff --exclude`. Given that both sides of the comparison are already
exclude-filtered before `diff` runs (the local side via `build_tarball`, the remote side via
`download_tar`), the `diff --exclude` hunk is redundant with its own PR — while contributing a
fourth semantics for users to trip over.

### 7. Self-inconsistent key sets inside the PR — **[verified]**

`_diff_in` reads `realized_repository.config.get("exclude", [])` (`__init__.py:385`), dropping
`ignore:`. `download_tarball` (`:714`) and `upload_repository` (`:321`) use
`_shed_config_excludes` (= `ignore:` + `exclude:`). Same logical operation, two key sets, in
the same function pair. Note the existing test fixture is *named* `single_tool_exclude` but
uses the `ignore:` key — a naming trap that would make this divergence easy to miss in review.

### 8. Reuse — **[assessment]**

Against the standing concern about this codebase: the PR **accretes**. It threads a new
`exclude` parameter through five signatures (`build_tarball`, `download_tar`,
`realized_files_for`, `_glob`, plus `cmd_shed_build`) rather than reusing the single existing
choke point, `_realize_to`'s ignore pass, which is where the concept already lives and already
works. It leaves behind no abstraction — there is no `is_excluded(config, path)` predicate at
the end of it, just four more inline filters. Two of the new signatures make `exclude` a
**required positional** (`build_tarball(realized_path, exclude, **kwds)` at `:735`,
`download_tar(..., exclude)` at `interface.py:85`), which is an API break for any external
caller; nsoranzo's 2020 review asked for it "or exclude made optional" and the PR took the
first option only.

`cmd_shed_build.py:26` also reaches across a module boundary for a private helper
(`shed._shed_config_excludes`). If commands genuinely need it, it should stop being underscored.

Imports are fine — nothing new was added, and nothing is function-local.

---

## Is it a good idea?

### The symptom is real but master self-heals

Reproduced on the mock shed: upload `single_tool`, then add `exclude: [related_file]`, then
`shed_diff`:

```
master: exit 1,  "Only in _custom_shed_: related_file"
PR1106: exit 0,  nothing reported
```

This is bernt-matthias' actual complaint, and the whole value proposition of the PR. But run
the sequence forward rather than stopping at the diff:

- **Master**: diff reports a difference → the user (or `shed_update --check_diff`, which gates
  the upload on `diff_repo(...) != 0` at `__init__.py:338-343`) uploads → the shed drops the
  file → subsequent diffs are clean. One noisy diff, then quiet.
- **PR 1106**: diff reports nothing → `shed_update --check_diff` prints *"Repository [x] not
  different, skipping upload"* and **never uploads** → the stale file stays on the Tool Shed
  forever, and the local config now guarantees you will never see it again.

bernt-matthias' stated goal in the thread was *"we would like to remove them from the TS."* On
`--check_diff` this PR makes that strictly impossible. That is the inversion that decides it
for me.

This hinges on whether a real Tool Shed's `update_repository` deletes files absent from the
tarball. bernt-matthias reported on the actual TestToolShed that the file **was** removed. The
mock shed cannot corroborate: `update_repository_contents` in `tests/shed_app.py` just
`tar.extractall()`s over the existing directory and never deletes, so any "the file survives"
result from the harness is an artifact. **Do not read the mock either way.** But the burden is
on the PR, and the one real-world data point we have points at "master self-heals".

If the shed genuinely does *not* delete, the right fix is still not to blind the diff. It is to
say so: *"N file(s) present on the shed are excluded locally and cannot be removed by upload."*
That is a message, not a suppression, and it would be a genuinely reusable thing to have.

### Nothing else here is a good idea either

Findings #1, #2 and #3 mean three of four commits change no output. Finding #4 means one of
them makes output *worse*. Finding #5 degrades an unrelated user-facing command. There is no
subset of this PR I would take.

### Bernt-matthias' third TODO: "it should be consistent with the docs"

There are no docs. `grep -rn "exclude\|ignore" docs/ --include='*.rst'` finds only the unrelated
`--exclude_from` CLI option on `ci_find_*`/`list_repos`. `.shed.yml`'s `exclude:` and `ignore:`
keys are documented nowhere in `docs/publishing.rst` or `docs/_writing_publish_intro.rst`. That
absence is the most defensible thing to salvage from this PR, and it is not code.

---

## If someone insists on landing something

Ordered by what I would actually accept:

1. **Document `exclude:` / `ignore:` in `docs/publishing.rst`** — what they match (glob2 path
   patterns relative to the repo root, `dir` implying `dir/**`), that they are applied at
   realization so they affect build, upload *and* diff, and that they are two spellings of one
   thing. Zero code.
2. **Pin the existing behavior with tests**, because right now #1/#2/#4/#5 are all unguarded.
   `CliShedTestCase` (`tests/test_utils.py:209-248`) plus the mock shed already give you
   everything needed; this is the reusable abstraction that is already present and unused here.
   Concretely, alongside `test_upload_filters_ignore` (`tests/test_shed_upload.py:210`):
   - `test_upload_filters_exclude` — same fixture, `exclude:` key instead of `ignore:`. Green on
     master; documents that the PR's premise is already satisfied.
   - `test_upload_filters_nested_exclude` — `exclude: [test-data]` and `exclude: ["test-data/**"]`,
     asserting the tarball member list. Pins the directory-expansion behavior in `_glob`.
   - `test_shed_download_is_faithful` — upload, append an `exclude:`, `shed_download`, assert the
     excluded file **is** present. Green on master, red on this PR (finding #5).
   - `test_shed_diff_reports_shed_only_file` — upload, append an `exclude:`, `shed_diff`, assert
     exit 1. Green on master, red on this PR (finding #5's sibling).
   - `test_shed_build_auto_repos_with_include` — new fixture: `auto_tool_repositories` plus a
     top-level `include:` list. Green on master, red on this PR (finding #4). Worth adding
     regardless of what happens to #1106; it is a real gap in fixture coverage.
3. **Only then**, if the "shed does not delete" case turns out to be real, add the *message*
   described above to `_diff_in` — behind no flag, because it is additive output, not suppression.

Whatever else: a `HISTORY.rst` entry, and `exclude` made keyword-optional rather than a required
positional on `build_tarball`/`download_tar`.

---

## Open questions

- **The deciding one**: does a real Tool Shed `update_repository` delete files absent from the
  uploaded tarball? bernt-matthias says yes (TestToolShed, 2020). If yes → master self-heals and
  #1106 is strictly harmful. If no → the problem is real but the fix is a message, not silence.
  Worth confirming against `galaxyproject/galaxy`'s `update_repository_contents` before replying
  on the PR.
- Should `tests/shed_app.py`'s `update_repository_contents` be made to delete, so the harness
  stops silently disagreeing with production on exactly this question?
- Is `exclude:` vs `ignore:` worth collapsing to one spelling (with the other deprecated)? The
  fixture named `single_tool_exclude` that actually uses `ignore:` suggests the distinction
  confuses people already.
- Is #554 still reproducible at all in 2026, or should it be closed? The demultiplexing case it
  describes is handled on master.
- Is bernt-matthias still interested? The branch is untouched since 2020-12-06 and his own three
  TODOs went unanswered. If the PR is closed, his TODO #2 (inconsistent matching semantics)
  deserves to survive as a docs task.

---

## Reproduction notes

Empirical work used `uv run --no-project --with-editable <tree>` against the rebased worktree
and a detached current-master worktree at `/tmp/claude-503/planemo-master`. Mock-shed probes
were temporary `tests/test_zz_probe*.py` files driven through `CliShedTestCase`; both trees were
left clean (`git status --porcelain` empty) and nothing was pushed or posted. Synthetic fixtures
live under `/tmp/claude-503/lab1106/`.
