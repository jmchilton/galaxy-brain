# PR 23331 — Improve `Compare two Datasets` (comp1 shell rewrite)

| | |
|---|---|
| **PR** | https://github.com/galaxyproject/galaxy/pull/23331 |
| **Author** | bernt-matthias (Matthias Bernt) |
| **Base branch** | `dev` |
| **Head reviewed** | `bc9b9afd592d4880f0465088642d2ddac63ad397` (merge-base `671d1b1e19`) |
| **Size** | 1 file, +17 / -5 (3 commits on top of 3 earlier ones in the same series) |
| **State** | OPEN, opened 2026-08-20; 0 reviews, 0 comments at time of writing |
| **CI** | **Main tool tests: SUCCESS** — the job that actually runs this tool's two test cases. The four red `Test (3.10, N)` shards are the **Integration** workflow failing at `Setup Minikube`, the known repo-wide breakage; unrelated. |
| **Worktree** | `/Users/jxc755/projects/worktrees/galaxy/pr/23331` |
| **Verdict** | **Approve with comments.** The core move is right and it fixes a real silent-wrong-output bug that the old form had. I verified by execution that both new branches produce byte-identical output to `dev` for both existing test cases, and that the "only sort if needed" predicate is provably conservative — there is no input state where the tool now joins unsorted data. Two things to fix before merge: the memory cap silently does nothing on the default deployment (`GALAXY_MEMORY_MB_PER_SLOT` is normally unset and GNU `sort` accepts the resulting `--buffer-size=M` without complaint), and the `1.0.2` → `1.0.3` bump needs a `WORKFLOW_SAFE_TOOL_VERSION_UPDATES` entry so workflows pinned to `1.0.2` keep resolving. The rest are P3 polish. |

---

## Endorsement first — the process-substitution removal fixes a real silent-truncation bug

The PR description sells this as a resource-management change, which undersells it. The bigger
win is exit-status propagation. Bash does not propagate the exit status of a process
substitution, so in the old form:

```sh
join --nocheck-order -t $'\t' ... <(sort ... '$input1') <(sort ... '$input2') > '$out_file1'
```

a `sort` that dies — OOM-killed, out of temp space, bad key spec — closes its FIFO, `join`
reads a short stream, emits a truncated join, and exits **0**. Galaxy marks the job green and
the user gets silently incomplete data. I reproduced exactly that (GNU coreutils 9.7,
`debian:stable-slim`):

```
=== process substitution, one sort fails ===
join exit=0
output:                       <- empty, and the job would have been marked OK
=== new style, same failure ===
sort: invalid number at field start: invalid count at start of 'BOGUS,BOGUS'
chain exit=2
```

The `if …; fi && if …; fi && join` form propagates. That alone justifies the change.

The "only sort if needed" half is also a clean win and cheaper than it looks: GNU `sort -c`
exits at the *first* disorder, so the unsorted case costs a partial read, and the sorted case
costs one full read but avoids a full sort plus a full write. For BED-like data keyed on
column 1 — the common case for this tool — it skips the sort entirely.

---

## What changed

`tools/filters/compare.xml`, version `1.0.2` → `1.0.3` (correct: this is a behaviour change,
and the tool is `profile="24.2"`), requirements `coreutils 8.31 → 9.11` and
`gawk 5.3.1 → 5.4.1`, and the command block (`tools/filters/compare.xml:7-29`):

```sh
if sort -c -t $'\t' -k '${field1},${field1}' '$input1'  2>/dev/null; then
  ln -s '$input1' input1;
else
  sort -t $'\t' -k '${field1},${field1}' '$input1' --buffer-size="$GALAXY_MEMORY_MB_PER_SLOT"M  --parallel="${GALAXY_SLOTS:-1}" > input1;
fi
&&
… same for input2 …
&&
join --nocheck-order -t $'\t' … input1 input2 > '$out_file1'
```

Six commits in the series: `c8b2bfdf85` (drop process substitution), `8bb1dd6aaa` (limit
memory / parallel), `5f7fe56325` (version bump), `dda2144b5f` (only sort if needed),
`c998d43169` (bump requirements), `bc9b9afd59` (fix syntax).

---

## P2 findings

### P2-1 — The memory cap silently does nothing on the default deployment

`tools/filters/compare.xml:11` and `:17`:

```sh
--buffer-size="\$GALAXY_MEMORY_MB_PER_SLOT"M
```

Note the asymmetry with the line's other variable: `--parallel="\${GALAXY_SLOTS:-1}"` has a
default, `--buffer-size` does not. That asymmetry matters, because
`GALAXY_MEMORY_MB_PER_SLOT` is unset far more often than it is set.

**Where it comes from.** `lib/galaxy/jobs/runners/util/job_script/MEMORY_STATEMENT_TEMPLATE.sh`
is the only general source, and it ends by *explicitly unsetting* the variable when it can't
derive a positive value:

```sh
[ "${GALAXY_MEMORY_MB_PER_SLOT--1}" -gt 0 ] 2>>$metadata_directory/memory_statement.log \
  && export GALAXY_MEMORY_MB_PER_SLOT || unset GALAXY_MEMORY_MB_PER_SLOT
```

It is only populated from `SGE_HGR_h_vmem`, from `GALAXY_MEMORY_MB` (which itself needs SLURM's
`scontrol` or a destination env), or explicitly by the htcondor
(`lib/galaxy/jobs/runners/htcondor.py:526-527`) and kubernetes
(`lib/galaxy/jobs/runners/kubernetes.py:587,598`) runners. On the local runner — every `run.sh`
dev instance, every planemo run, every deployment that hasn't declared memory per destination —
it is **unset**.

**What GNU sort does with the result.** `--buffer-size=M` is not an error. It is silently
ignored. Verified across three coreutils generations:

```
sort (GNU coreutils) 8.30 / 8.32 / 9.7
[M]      => exit=0 err=
[]       => exit=2 err=sort: invalid -S argument ''
[5Q]     => exit=2 err=sort: -S argument '5Q' too large
```

and it is not merely accepted-then-clamped-to-minimum — it behaves as if `-S` were absent.
Sorting a 4 MB / 300k-line TSV:

```
-S [M]    real 0m0.082s      <- same ballpark as no -S
-S [1K]   real 0m1.313s
-S [0]    real 0m2.479s
no -S     real 0m0.030s
```

So on the default deployment the tool gets no memory cap, no warning, and no failure — the
stated goal quietly doesn't happen, precisely in the deployments least able to absorb a
sort that sizes its buffer from total system memory. (`--parallel=""` *does* hard-error, which
is why the `:-1` on that one was necessary and its absence here is easy to miss.)

**Suggested fix** — emit the flag only when the value exists, rather than defaulting to a
made-up number:

```sh
${GALAXY_MEMORY_MB:+--buffer-size="${GALAXY_MEMORY_MB}M"}
```

The in-tree precedent for the other style is `test/functional/tools/exit_code_oom.xml:10`,
`: \${GALAXY_MEMORY_MB:=20}`, which is fine too — but `${VAR:+…}` avoids inventing a cap that
is worse than no cap on a big-memory node.

Worth knowing while you're here: this is the **first tool under `tools/`** to reference
`GALAXY_MEMORY_MB*` outside the interactive-tool and functional-test corners
(`grep -rn GALAXY_MEMORY_MB tools/` returns only `interactivetool_openrefine.xml` besides this).
There is no established idiom to copy, which is a decent argument for getting the idiom right
here and, if this pattern is going to spread to `joiner2`/`join1`, lifting it into a shared
macro rather than copy-pasting the shell.

---

### P2-2 — The version bump needs a `WORKFLOW_SAFE_TOOL_VERSION_UPDATES` entry

`tools/filters/compare.xml:1` bumps `comp1` `1.0.2` → `1.0.3`. The bump itself is right, but it
leaves existing workflows pinned to `1.0.2` unable to resolve a tool definition.

`lib/galaxy/tool_util/version_updates.py:21` maps tool IDs to version ranges "where parameter
schemas are unchanged, so an older workflow referencing `min_version` can safely use
`current_version`'s tool definition for validation and state inspection." The consumer is
`lib/tool_shed/managers/tools.py:171-183`:

```python
tool_source = tool_version_sources.get(tool_version)
if tool_source is not None:
    return tool_source
safe_version = is_workflow_safe_version(tool_id, tool_version)
if safe_version is not None:
    return tool_version_sources.get(safe_version)
return None
```

Exact-version lookup misses once the tree ships only `1.0.3`; without a `comp1` entry
`is_workflow_safe_version` returns `None` and `_stock_tool_source_for` returns `None`.

This PR is exactly the case the map exists for: the diff touches only `<requirements>` and the
`<command>` block. The `<inputs>` — `input1`, `input2`, `field1`, `field2`, `mode` — are
untouched, so the parameter schema is unchanged and the update is workflow-safe by construction.

**The precedent is tight.** Three of the map's entries are `tools/filters/` tools sitting beside
this one, each pinned at its currently-shipped version:

| tool | map `current_version` | shipped in tree |
|---|---|---|
| `Filter1` | 1.1.1 | 1.1.1 |
| `sort1` | 1.2.0 | 1.2.0 |
| `Grep1` | 1.0.4 | 1.0.4 |
| `comp1` | *(absent)* | **1.0.3** |

`comp1` is the only one of the four that bumped without an entry.

**Fix** — one line in `lib/galaxy/tool_util/version_updates.py`:

```python
"comp1": safe_update(parse_version("1.0.2"), parse_version("1.0.3")),
```

Nothing enforces this mechanically — there is no test asserting that a bumped stock tool appears
in the map — which is why it is easy to miss and worth flagging. A guard test that walks
`stock_tool_sources()` and fails when a tool ships a version above its map `current_version` with
no entry would catch the whole class, but that is follow-up work, not this PR's job.

---

## P3 findings

### P3-1 — `GALAXY_MEMORY_MB_PER_SLOT` is now the wrong variable to pick

Under the old form the two sorts ran **concurrently**, so a per-slot budget was the right unit.
Under the new form they run **sequentially** — one sort process at a time, with the whole job's
memory available to it. Capping that single process at `GALAXY_MEMORY_MB / GALAXY_SLOTS` while
simultaneously handing it `--parallel=$GALAXY_SLOTS` under-budgets it by a factor of
`GALAXY_SLOTS` and buys extra spilling for nothing. `GALAXY_MEMORY_MB` is the natural cap now.

### P3-2 — `sort -c` + `2>/dev/null` should be `sort -C`

`tools/filters/compare.xml:8,14`. `-c` prints `file:N: disorder: …` on the first out-of-order
line, which is why the `2>/dev/null` is there; `-C` is the silent variant that exists for
exactly this use. Using `-C` lets you drop the redirect, which currently also swallows genuine
read errors (missing file, permission denied) and conflates "unsorted" (exit 1) with "couldn't
read it" (exit 2). Not a correctness hole — an unreadable input fails the `else` branch's sort
too, so the `&&` chain still aborts — but the operator sees no reason why.

### P3-3 — `--nocheck-order` is now dead weight, and dropping it would buy a real cross-check

`tools/filters/compare.xml:20`. It arrived with `41441c5d0d` (Nate Coraor, "Drop comp1 python
wrapper and modernize"), when the tool sorted unconditionally and the check was pure overhead.
Now that both branches *prove* the order — the `else` branch by construction, the `then` branch
by `sort -c` using the identical comparison — join's own check should never fire, and if it
ever does that means `sort` and `join` disagreed about ordering, which is the classic silent
wrong-answer bug for this pair. Letting it fire is strictly better than not:

```
=== join WITHOUT --nocheck-order on unsorted input ===
join: U.tsv:2: is not sorted: a	2
join: input is not in sorted order
exit=1                                  <- job fails loudly
=== join WITH --nocheck-order on unsorted input ===
exit=0                                  <- silently emits 1 of 2 rows
```

Caveat worth stating out loud: this converts a hypothetical silent-partial-output into a hard
job failure, so if there *is* an environment where the two disagree, that environment's jobs
start failing instead of quietly lying. I'd take that trade, but it's a judgement call and
should be a deliberate one rather than a side effect.

### P3-4 — The requirement bumps are unexplained and unnecessary for anything this change uses

`tools/filters/compare.xml:4-5`, `coreutils 8.31 → 9.11`, `gawk 5.3.1 → 5.4.1`, in a commit
messaged only "bump requirements". Nothing in the new command needs it: `sort -c`, `-S` and
`--parallel` (coreutils 8.6, 2010) are all present in 8.30, which I confirmed by running the
new command shape against it. `gawk` isn't touched by this diff at all — the only awk use is
the pre-existing `awk -F'\t' '{print NF}'` in the `-o` spec.

Both versions do exist on conda-forge (checked: coreutils `9.11` and gawk `5.4.1` are the
current heads), so this isn't broken — it's just churn that forces every deployment to resolve
and build a fresh environment for this tool. If there's a specific reason (a `sort` fix you're
after), it belongs in the commit message; otherwise splitting it out or dropping it makes the
behaviour change easier to reason about.

### P3-5 — Test coverage is genuinely adequate, but the mixed case is uncovered

The "existing test coverage" box is justified, and better than I expected — the two existing
cases happen to split cleanly across the new branches. Measured:

```
t1 (1.bed k2 vs 2.bed k2):   input1 = REGULAR FILE (sorted)   input2 = REGULAR FILE (sorted)
t2 (1.bed k1 vs 3.bed k1):   input1 -> SYMLINK (sort skipped) input2 -> SYMLINK (sort skipped)
```

`1.bed`/`2.bed` are unsorted on column 2 (first disorder at line 6) and all three fixtures are
sorted on column 1, under `LC_ALL` of `C`, `C.UTF-8` and `en_US.UTF-8` alike — so the branch
split is locale-stable and CI will exercise both deterministically. Both cases reproduce
`fs-compare.dat` / `fs-compare-2.dat` byte-for-byte, and old and new commands agree byte-for-byte.

What's missing is the **mixed** case: one input already sorted, the other not. That's the only
shape where the symlinked file and the freshly-sorted file are fed to `join` together, and
it's a one-fixture addition using material already in `test-data/`:

```xml
<!--one input already sorted on the join column, one not-->
<test>
  <param name="input1" value="1.bed"/>   <!-- sorted on c1   -> symlink branch -->
  <param name="field1" value="1"/>
  <param name="input2" value="2.bed"/>   <!-- unsorted on c2 -> sort branch    -->
  <param name="field2" value="2"/>
  <param name="mode" value="N"/>
  <output name="out_file1" file="…"/>
</test>
```

A second worthwhile case, if you want it: an unsorted input with **duplicate keys**, where the
sort branch's tie-ordering is now the only thing determining output row order. Test 2 covers
duplicate keys but only on the symlink branch.

### P3-6 — The sorted intermediates now persist in the job working directory

`sort … > input1` materialises a full-size sorted copy of each unsorted input in the job's
working directory, and it stays there for the life of the job. Previously the sort's spill went
to `TMPDIR` in chunks and was deleted as it merged into the FIFO. For a tool whose PR headline
is "avoid overcommitting resources" this is a real trade in the other direction, and it's worth
a sentence in the PR description so deployers with small scratch volumes aren't surprised. It's
also already minimised — the cost only lands when sorting was actually needed — so I don't
think it needs code changes.

---

## Considered and dismissed

Things I chased that turned out to be fine. Listing them so nobody re-chases them.

1. **`fi` / newline / `&&` — not a syntax error.** `fi\n&&\nif` is invalid POSIX shell, but
   `lib/galaxy/tools/evaluation.py:767-772` strips each line and then replaces every newline
   with a space unconditionally, so the shell sees `fi && if … fi && join …` on one line. I
   rendered the real command with substituted params and ran `bash -n` on it: parses clean.
   (This is presumably what `bc9b9afd59 "fix syntax"` was about.)

2. **"Only sort if needed" cannot join unsorted input.** `sort -c -k F,F` uses the *same*
   comparator as `sort -k F,F`, including the last-resort whole-line comparison, so a `-c` pass
   implies the file is byte-identical to what the sort would have produced (ties are identical
   lines and therefore interchangeable). The predicate is strictly conservative: it can only
   ever sort something that didn't need it, never skip something that did. Key specs are
   identical between the check and the sort, so there's no drift there either. This was the
   highest-risk thing to check and it's clean.

3. **`sort`/`join` collation mismatch.** Both binaries run in the same job process environment
   with the same locale and both use `strcoll` on the key, and `-t $'\t'` on both sides removes
   the classic `-b`/whitespace divergence. `LC_ALL=C` would be a meaningful *speed* win on large
   inputs and would make output deterministic across deployments with different locales, but it
   changes output ordering for non-ASCII data and is a separate, deliberate change. P3-3 would
   assert the agreement rather than assume it.

4. **`fs-compare.dat` / `fs-compare-2.dat` are not in the repo.** They are not in `test-data/`
   and never were in git history, which looked like a missing-fixture finding. They're resolved
   remotely: `lib/galaxy/tool_util/verify/test_data.py:32` defaults
   `file_dirs = "test-data,https://github.com/galaxyproject/galaxy-test-data.git"`. Fetched both
   from `galaxyproject/galaxy-test-data` and used them for the regression check above.

5. **`ln -s` failing on job resubmission because `input1` already exists.** The working
   directory is restored from `_working` by `PREPARE_DIRS_TEMPLATE`
   (`lib/galaxy/jobs/runners/util/job_script/__init__.py:44-52`), and that snapshot is taken
   *before* tool execution, so it never contains the symlinks. `ln -sf` would be marginally more
   defensive but isn't needed.

6. **`set -e` aborting on `sort -c` returning 1.** `strict_shell` prepends `set -e`
   (`lib/galaxy/jobs/command_factory.py:181-182`), but commands in an `if` condition are exempt
   from `set -e` by definition. Correct usage.

7. **BSD sort on macOS dev boxes.** The tool declares a `coreutils` requirement so resolved
   environments get GNU sort. Without dependency resolution, macOS `sort` 2.3-Apple accepts
   `-c`, tolerates `--buffer-size=M` (with a stderr grumble) and accepts `--parallel`, exiting 0
   with correct output — it degrades gracefully rather than failing. Low concern; not worth a
   finding.

8. **Exit-status swallowing in the *new* form.** Both branches end in a command whose status is
   the `if`'s status (`ln -s`, or `sort … > input1`), so a failing sort aborts the `&&` chain.
   Verified: exit 2.

9. **The red CI shards.** `Integration` workflow, all four failing in `Setup Minikube` before
   any test runs. Same repo-wide breakage seen on #23220. `Main tool tests` — the workflow that
   runs `lib/galaxy/config/sample/tool_conf.xml.sample`, which includes
   `<tool file="filters/compare.xml" />` at line 120, and therefore this tool's two test cases —
   is **green** on this head.

---

## Verification

All executed against the worktree at `bc9b9afd59`.

- **Regression check, old vs new, real expected data.** Rendered both `origin/dev`'s and the
  PR's command blocks with substituted params for each of the two `<test>` cases, ran them in
  `debian:stable-slim` (GNU coreutils 9.7) against `test-data/{1,2,3}.bed`, and diffed against
  `fs-compare.dat` / `fs-compare-2.dat` fetched from `galaxyproject/galaxy-test-data`:

  ```
  == t1 old: exit=0   output MATCHES fs-compare.dat
  == t1 new: exit=0   output MATCHES fs-compare.dat      working-dir artifacts: input1 input2
  == t2 old: exit=0   output MATCHES fs-compare-2.dat
  == t2 new: exit=0   output MATCHES fs-compare-2.dat    working-dir artifacts: input1 input2
  == old-vs-new byte compare ==  t1: old == new   t2: old == new
  ```

- **Branch coverage measured** by inspecting whether `input1`/`input2` came out symlinks or
  regular files — see P3-5. Re-checked fixture sortedness under `LC_ALL` of `C`, `C.UTF-8`,
  `en_US.UTF-8`.
- **`-S` parsing** across coreutils 8.30 (ubuntu:20.04), 8.32 (bullseye) and 9.7 (stable-slim),
  plus timing runs to show `-S M` ≠ minimum buffer.
- **Process-substitution exit swallowing** demonstrated side by side against the new form.
- **`join` order-check behaviour** with and without `--nocheck-order`.
- **Shell syntax** via `bash -n` on the fully rendered command line.
- **conda-forge availability** of `coreutils 9.11` and `gawk 5.4.1` via the anaconda.org API.
- **Env-var plumbing** read directly: `MEMORY_STATEMENT_TEMPLATE.sh`,
  `job_script/__init__.py`, `local.py`, `htcondor.py`, `kubernetes.py`.
- **CI** via `gh pr checks` / `gh run view`; mapped the four red shards to the `Integration`
  workflow and confirmed `Main tool tests` is green.

## Not verified

- Did not run this through a live Galaxy or planemo — no `.venv` in this worktree, and the
  question is shell-shaped, so container reproduction of the exact rendered command was the
  more direct evidence. CI's green `Main tool tests` covers the end-to-end path.
- Did not test with `GALAXY_MEMORY_MB_PER_SLOT` actually **set**; the finding is about the
  unset case, and the set case obviously works.
- Did not measure the P3-6 working-directory disk claim at realistic scale — it follows from
  `sort > input1` running with the working directory as cwd, not from measurement.
- Did not check Pulsar remote-staging path rewriting against the `ln -s` target. Inputs are
  staged and paths rewritten before the command is rendered, so the symlink should point at a
  local staged file, but I did not exercise it.
- Did not investigate `tools/filters/joiner2.xml`, which does the same sort-then-join with a
  much worse shape (`sort -k $col1 $input1 > $input1.tmp` writes *next to the input dataset*).
  Out of scope here, but it's the other half of any "share this as a macro" argument.

---

## Delivered

- **Comment posted** 2026-08-20: https://github.com/galaxyproject/galaxy/pull/23331#issuecomment-5358743854
- **Fix PR opened** 2026-08-20: https://github.com/bernt-matthias/galaxy/pull/10 —
  `jmchilton:comp1_memory_cap_and_version_map` → `bernt-matthias:comp_improve`, carrying both P2s
  in one commit (`7de2d1e329`). Based on the PR head `bc9b9afd59`, not `dev`, because the map
  entry references `1.0.3` which only exists on that branch.

Both P2s are handed off. The five P3s were posted as optional and are **not** in the branch —
they are the author's call, not outstanding work for us.

Verification behind the fix (beyond what the note already records):

- Cheetah renders `\${GALAXY_MEMORY_MB:+...}` to `${GALAXY_MEMORY_MB:+...}` — checked with CT3
  against the real template fragment, so the escaping is right.
- argv-logging shim on GNU coreutils 9.1: before/unset → `--buffer-size=M`; after/unset → flag
  absent; after/`GALAXY_MEMORY_MB=64` → `--buffer-size=64M`.
- Full command block run PR-vs-fix × set-vs-unset: byte-identical output in all four.
- `is_workflow_safe_version("comp1", "1.0.2")` → `"1.0.3"`; `1.0.1`/`1.0.4` → `None`.
- The `--buffer-size=M` no-op reproduces on coreutils 9.1 too, not just the 8.30/8.32/9.7 the
  original pass checked.

Incidental: the `fi` / `&&` / `if` structure only parses because `lib/galaxy/tools/evaluation.py:769-772`
strips each line and collapses newlines to spaces. Correct as written, but load-bearing in a
non-obvious way — worth remembering before hand-testing any stock tool's command block.

Not done: tool tests never ran locally — `fs-compare.dat` lives in the separate `galaxy-test-data`
repo and isn't in the worktree. CI on the fix PR is the first real execution of the tool's cases.

---

## Draft review comment

> *Posted by Claude (AI assistant) on behalf of jmchilton — not authored by them personally.*

This is a good change and I'd like to see it land — and I think the description undersells it.
The headline benefit isn't the resource management, it's that dropping the process substitutions
fixes a silent-wrong-output bug. Bash doesn't propagate a process substitution's exit status, so
in the old form a `sort` that got OOM-killed or ran out of temp space just closed its FIFO,
`join` read a short stream, and the job exited **0** with a truncated result. I reproduced that
against `dev`: forced one `sort` to fail, `join exit=0`, empty output, job would have been
marked green. With your version the same failure gives `exit=2`. That's worth saying in the
commit message.

I also checked the thing I was most worried about — whether "only sort if needed" can ever join
unsorted input — and it can't. `sort -c -k F,F` uses the identical comparator to `sort -k F,F`
including the last-resort whole-line comparison, so a `-c` pass implies the file is byte-identical
to what the sort would have produced. The predicate is strictly conservative. And I ran both
existing test cases with the old and the new command block against the real
`fs-compare{,-2}.dat` from `galaxy-test-data`: byte-identical output either way. Nice bonus,
the two cases happen to split cleanly across the new branches (`1.bed`/`2.bed` on col 2 are
unsorted → sort branch; everything on col 1 is sorted → symlink branch), and that split is
stable across `C`, `C.UTF-8` and `en_US.UTF-8`, so CI exercises both deterministically.

**One thing I do think needs fixing before merge: the memory cap is a silent no-op on the
default deployment.**

```
--buffer-size="$GALAXY_MEMORY_MB_PER_SLOT"M
```

`GALAXY_MEMORY_MB_PER_SLOT` is unset far more often than it's set —
`MEMORY_STATEMENT_TEMPLATE.sh` ends by *explicitly unsetting* it when it can't derive a positive
value, and it's only populated from `SGE_HGR_h_vmem`, from `GALAXY_MEMORY_MB` (needing SLURM's
`scontrol` or a destination env), or explicitly by the htcondor and kubernetes runners. On the
local runner — every dev instance, every planemo run, every deployment that hasn't declared
memory per destination — it's unset, and the flag becomes `--buffer-size=M`.

GNU sort does **not** error on that. It silently ignores it. Checked on coreutils 8.30, 8.32 and
9.7 — all `exit=0`, no stderr — and it isn't clamped to a minimum either; sorting a 300k-line
TSV takes `0.082s` with `-S M` vs `1.3s` with `-S 1K` and `0.030s` with no `-S` at all. So there's
no cap, no warning, and no failure, exactly on the deployments least able to absorb a `sort`
that sizes its buffer from total system memory. Note the contrast with the neighbouring
`--parallel="${GALAXY_SLOTS:-1}"`, which you *did* default — and had to, since `--parallel=""`
does hard-error. Easy asymmetry to miss.

I'd suggest emitting the flag only when there's a value, rather than inventing a default:

```sh
${GALAXY_MEMORY_MB:+--buffer-size="${GALAXY_MEMORY_MB}M"}
```

`GALAXY_MEMORY_MB` rather than the per-slot variant because the two sorts now run
**sequentially** — one process at a time with the whole job's memory available — so a per-slot
budget combined with `--parallel=$GALAXY_SLOTS` under-budgets by a factor of `GALAXY_SLOTS` and
buys extra spilling for nothing. (The other in-tree idiom is
`: ${GALAXY_MEMORY_MB:=20}` in `test/functional/tools/exit_code_oom.xml`, which would work too.)

FWIW this looks like the first tool under `tools/` to reference `GALAXY_MEMORY_MB*` outside the
interactive-tool corner, so there's no established idiom to copy — which is a decent argument for
nailing it here, and for lifting it into a shared macro if the same treatment is headed for
`joiner2`/`join1` rather than copy-pasting the shell.

**The other thing I think needs fixing before merge: the version bump needs a
`WORKFLOW_SAFE_TOOL_VERSION_UPDATES` entry.**

The `1.0.2` → `1.0.3` bump is right, but `comp1` isn't in the map in
`lib/galaxy/tool_util/version_updates.py`, so a workflow pinned to `1.0.2` stops resolving a tool
source once the tree ships only `1.0.3` — `_stock_tool_source_for` misses the exact version, asks
`is_workflow_safe_version`, gets `None`, and returns `None`. This PR is precisely the case the map
is for: the diff only touches `<requirements>` and `<command>`, the `<inputs>` are untouched, so
the parameter schema is unchanged and the update is workflow-safe by construction.

```python
"comp1": safe_update(parse_version("1.0.2"), parse_version("1.0.3")),
```

The three `tools/filters/` tools already in the map are each pinned at their shipped version —
`Filter1` 1.1.1, `sort1` 1.2.0, `Grep1` 1.0.4 — which makes `comp1` the only one of the four that
bumped without an entry. Nothing enforces it mechanically, which is presumably why it slipped.

Smaller things, all optional:

- **`sort -C` instead of `sort -c` + `2>/dev/null`.** `-C` is the silent variant that exists for
  exactly this, and dropping the redirect stops it swallowing genuine read errors and conflating
  "unsorted" (exit 1) with "couldn't read it" (exit 2).
- **`--nocheck-order` is arguably dead weight now.** It arrived in `41441c5d0d` when the tool
  sorted unconditionally. Now that both branches prove the ordering with the same comparator
  `join` uses, its check should never fire — and if it ever did, that would mean `sort` and
  `join` disagreed, which is the classic silent-wrong-answer bug for this pair. Without it you
  get `exit=1` and a loud failure instead of a quietly partial join. Deliberate call though: it
  turns a hypothetical silent truncation into a hard job failure.
- **The requirement bumps look unnecessary.** `sort -c`, `-S` and `--parallel` are all in
  coreutils 8.30 (I ran the new command shape against it), and `gawk` isn't touched by this diff
  at all. Both pins do exist on conda-forge so nothing's broken — it just makes every deployment
  build a fresh env for the tool. If there's a specific fix you're after, worth putting in the
  commit message; otherwise it might be cleaner split out.
- **One more test case would close the gap:** the *mixed* branch, one input already sorted and
  one not, which is the only shape where a symlink and a freshly-sorted file get fed to `join`
  together. `input1=1.bed field1=1` (symlink branch) against `input2=2.bed field2=2` (sort
  branch) does it with fixtures already in `test-data/`.
- Might be worth a line in the description that the sorted intermediates now materialise
  full-size in the job working directory and stay there for the job's lifetime, where the old
  form's spill went to `TMPDIR` in chunks and was freed as it merged. Only bites when sorting was
  actually needed, so I don't think it needs a code change — just not a surprise for deployers on
  small scratch volumes.

On CI: the four red `Test (3.10, N)` shards are the `Integration` workflow dying in
`Setup Minikube` before any test runs — the repo-wide breakage, nothing to do with this.
`Main tool tests`, which is the job that actually runs this tool's two cases, is green.

---

**Merged into `dev` 2026-08-21.** Worktree removed. Nothing outstanding: the two P2s went in
via bernt-matthias/galaxy#10, and the five P3s were posted as explicitly optional.
