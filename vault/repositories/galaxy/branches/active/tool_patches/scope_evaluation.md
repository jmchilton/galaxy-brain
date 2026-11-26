Run via Claude Opus at high effort. **Recommendation: keep the current scope; no further expansion or contraction.** This is the second evaluation. The first one's modest expansion has landed: one patch database per process, the store-hit fallback parsing from disk, `ENGINE_VERSION` in both the per-tool digest and the freshness token, and the boot and per-populate patch summary lines. On top of that, the branch covers every item in John's request and nothing John ruled out. No reviewer since the re-scope has raised a new generalization or a related bug in touched code that counts as scope. The open items fall into four groups: John's explicit follow-ups (live reload is the real fix for the rolling-restart limitation), design or organisation decisions (the counter home, the test-file split), an API shape choice (a compact `patches` form on list endpoints), and options round 1 already weighed and rejected. One item is a correctness fix, not scope: PyYAML silently keeps the last of two duplicate `ops:` keys, and the coordinator should pick it up in hardening (see "Other items"). Two small round-1 residuals are partial but don't block: patch counts are in the log line but not in the populator's returned stats, and the hg walk has no stop.

## Possible Decompositions

Size vs `origin/dev` at `a08b4a59a7b` (24 commits, `git diff --numstat`):

| Part | Added lines |
|---|---|
| Pure package `galaxy.tool_util.patches` | 1,915 |
| Galaxy wiring (production) | about 215 |
| Test support (`unittest_utils/tool_patches.py`, `populators.py`) | about 64 |
| `config_schema.yml` (hand-written) | 44 |
| Generated (`galaxy_options.rst`, sample, schema attributes) | 88 |
| Fixtures (`test/functional/tool_patches/`, `identifier_single_fixed.xml`) | 53 |
| Tests | 1,752 (1,309 in `test_tool_patches.py`) |

How the re-scope commits land in each split:
- **The per-config memo** (`f2c0bd3526a`, `a08b4a59a7b`) lives in `tools/patches.py`. It goes with the first PR that has a Galaxy caller. Its populate half goes with the store seam.
- **The store-skip guard** in `_get_tool_source_from_store` goes with the eager PR. Under `use_cached_toolbox`, dev already stores unpatched rows, so with only the eager PR landed the guard is what makes the eager fallback parse and patch from disk instead of serving those rows.
- **`ENGINE_VERSION`** belongs in the per-tool digest of the package PR. Its `token()` half goes with the store PR.
- **The level rename** (`76b348f58bc`) folds into whichever PR carries `model.py`.
- **The parameter-model fast path** (`7baa6c55d67`) folds into the engine.
- **The baseline-tests commit** `daeb3750f0c` stays first in every option.

Every split changes what `tool_patches_static_findings` rebases onto. It uses only the pure package, so it follows whichever PR carries the package.

**Option A: engine plus eager, then the store** (the design's own split).
1. Baseline tests (the reload half), the package and its unit tests, config, `app.tool_patches` with the memo and boot summary, the eager seam, the `reload_tool_by_id` guid fix, the store-skip guard, `Tool.patch`, the panel `patches` field, the job-cache rule at its three entry points, and the eager integration class. About 1,900 library lines plus 1,500 test lines.
2. The store seam:
   - populator `process_tool`, the fast-path digest and the per-populate summary;
   - the freshness token with `ENGINE_VERSION`;
   - `ToolIndexEntry.patch`, `ToolIndex.tool_patch_collections`, manifest `tool_patches` and the `INDEX_SCHEMA_HASH` pin;
   - `--tool-patch-path`, cached stubs and materialisation, read-only logging;
   - the populate baseline test, the store unit tests and the cached integration subclass.

   About 280 plus 280 lines. PR 2 carries the schema-hash change and its parallel-bundle rollout note. Con: until PR 2 lands, eager and cached sites diverge.

**Option B: reload fix first.**
1. `reload_tool_by_id` passes `guid` and `tool_shed_repository`, with a red test of its own. The baseline test passes both with and without the fix. About 10 plus 30 lines.
2. Everything else.

**Option C: version files first, then per-changeset overrides.**
1. The full feature keyed on version files only. It has no `hg.py`, no `@<changeset>.yml` lookup and no symlink handling, and the digest leaves out the changeset.
2. The overrides:
   - the dirstate v1 and v2 reader;
   - the override walk and the fallback rule (a mixed override keeps its security fix);
   - symlink resolution and refusal;
   - the changeset in the digest, and its tests.

   About 250 plus 250 lines. It is the most self-contained increment and the one most likely to draw design questions.

**Option D: package, then eager, then store.**
1. The package and its unit tests, with no Galaxy caller. About 1,920 plus 1,310 lines. Con: it is unused infrastructure until PR 2, and Galaxy reviewers usually want a caller.
2. The eager seam, config, memo, job cache and API.
3. The store seam, as in A.2.

**Option E: A plus C.** Engine plus eager on version files, then the store, then the overrides. It gives the smallest end-to-end first PR.

**Option F: split the unit test file alongside any of the above** (thermo #13). Split `test_tool_patches.py` along its `# ---` sections into `test/unit/tool_util/patches/`. Then each PR in A, C or D carries only its own test module, instead of a part of one 1,309-line file.

## Scopes considered

### As implemented, including round 1's expansion (recommended)

This is the full MVP plus round 1's four items:
- the pure engine and a path-keyed database with dirstate overrides;
- both load seams, sharing one memoized database per process;
- store, index, manifest and freshness plumbing, with the engine version;
- the boot and per-populate summary lines;
- the job-cache skip and the API `patches` field;
- synthetic fixtures.

| Pros | Cons |
|---|---|
| <ul><li>Covers every item in the request, and every round-1 expansion item at least in part</li><li>The within-process inconsistency that round 1 flagged is gone</li><li>Stored sources can no longer go stale after an engine fix</li><li>Re-hardened fresh: test challenges, perf (one fix, everything else within budget) and thermo (four tidies)</li><li>Turned off, the freshness token and stored entries match dev</li></ul> | <ul><li>About 2.2k library lines and 1.75k test lines in one PR</li><li>The new index fields change `INDEX_SCHEMA_HASH` even with `tool_patch_paths: []`, so publishers ship a parallel bundle whether or not they use patches</li><li>Restart means restart every process sharing the store, so a rolling restart can make the store flip between collection versions (a documented limitation)</li><li>Populator stats don't carry patch counts</li><li>The hg walk has no stop</li></ul> |

<details><summary>Round-1 delivery check</summary>

- **(1) One database per process: done.** `tool_patch_database_from_config` memoizes in a `WeakKeyDictionary` keyed on the config. `app.tool_patches`, the probe and the in-process populate share it, which resolves thermo #11.
- **(2) Store-hit fallback: done.** The guard is in `_get_tool_source_from_store`. A real sqlite store-row test (with a non-vacuous control) fails red when the guard is removed.
- **(3) Engine version: done in both places.** The re-scope review caught that `token()` was missing it at first, and that is fixed.
- **(4) Logs and counters: partly done.** The boot line and the per-populate line exist and are tested. The populator's returned stats and CLI output have no patch counts (re-scope nit 5, not taken).
  - Admins have the log line, so this doesn't block.
  - Thermo finding 5 questions where the counters live anyway. Adding them to the stats now would build more on a home that may move.
- **The hg walk stop**, which round 1 called a two-line change: not done. `find_repository_dir` still walks up to `/`. It only runs for shed keys with an override file in some active collection (`database.py:190`), so it is minor.

</details>

### Expand: patch counts in the populator's returned stats and CLI output

This finishes round-1 item (4). `populate_store_inline` and the CLI would report applied, already-applied, mismatch and skipped counts.

| Pros | Cons |
|---|---|
| <ul><li>Tests and CLI users can assert on the counts</li><li>Delivers round 1 to the letter</li></ul> | <ul><li>The log line already gives admins the numbers</li><li>It entrenches the counter-on-database design, which thermo finding 5 flags as NEEDS-DECISION</li><li>It is better done after John picks the counter home, since the "pure option" counts from the populate results anyway</li></ul> |

Not recommended now. Fold it into whichever counter option John picks.

### Expand: live reload / reload re-reads everywhere (round 1's choice (b))

A toolbox reload rebuilds `app.tool_patches`, and cache hits re-check `tool.patch.digest`. This is what fixes the rolling-restart limitation.

| Pros | Cons |
|---|---|
| <ul><li>The store converges during rolling restarts and after a standalone `populate_store` run</li></ul> | <ul><li>John explicitly put live reload out of scope</li><li>It is the design's phase 2</li><li>The limitation is documented in the config docs and the debrief</li></ul> |

### Expand: compact `patches` form on list endpoints (perf recommendation)

`/api/tools?in_panel` and `/api/tool_panels` would carry state, kind and level only. The full detail stays on `/api/tools/{id}`.

| Pros | Cons |
|---|---|
| <ul><li>Saves 0.1–0.3 MB on panels with about 200 matched tools</li><li>Follows the #23076 pattern</li></ul> | <ul><li>A few percent of responses that are already MB-scale</li><li>Changes the API shape, which is a decision for John</li><li>No client consumes the field yet, because the badge is out of scope</li><li>Better decided together with the badge</li></ul> |

### Expand: `ENGINE_VERSION` in `ToolPatchCollectionsSummary` (thermo 6)

The engine version would be encoded once, in the persisted summary, and the read-only store log would notice engine bumps.

| Pros | Cons |
|---|---|
| <ul><li>One encoding instead of two</li></ul> | <ul><li>Changes the persisted index and manifest shapes and the `INDEX_SCHEMA_HASH` pin</li><li>Done for one integer</li></ul> |

### Expand: carry `patch` on the Celery task `ToolSource` (thermo #12, carried)

Unchanged since round 1. It would remove the web-process special case in `JobsService.create`.

| Pros | Cons |
|---|---|
| <ul><li>Later worker-side consumers would see patch state</li></ul> | <ul><li>A task schema change, which needs mixed-version workers to keep working during upgrades</li><li>Removes no entry point</li><li>Today's only consumer is already covered</li></ul> |

### Expand: accept `script_sha256` and `param_model`

Unchanged since round 1.

| Pros | Cons |
|---|---|
| <ul><li>Prototype-format files would apply instead of loading unpatched</li></ul> | <ul><li>Each is a new guard with new I/O</li><li>No shipped collection exists yet</li><li>Rejecting them fails safe</li></ul> |

### Expand: the remaining loader lints (phase A/B nits 7 and 12, minus the duplicate key)

These reject:
- `TODO` doc or reason values;
- `subset` without `authoring: hand`;
- an explicit `false` for `changes_requirements`;
- an advisory override without `expanded_sha256`;
- a `collection.yml` without a version.

| Pros | Cons |
|---|---|
| <ul><li>A few lines each, in owned files</li></ul> | <ul><li>They are authoring-CI checks, and the authoring CLI is one of John's follow-ups</li><li>Nothing is lost silently without them</li></ul> |

The duplicate-key case is different, because it loses data silently. It is treated as a fix under "Other items", not as scope.

### Expand: John's explicit follow-ups

The admin endpoint, the badge, the `Job` column, live reload, the authoring CLI and shipped patches.

| Pros | Cons |
|---|---|
| <ul><li>A complete feature</li></ul> | <ul><li>Out of scope by John's decision</li><li>Needs a migration, client work and the patch repository's CI</li></ul> |

### Contract: drop round 1's four items

Remove the four round-1 items from the current HEAD. Checking out `tool_patches_alt_original_scope` (`4ec188d7a21`) instead would also lose the required level rename, the perf fix and the later test-challenge and thermo commits.

| Pros | Cons |
|---|---|
| <ul><li>About 50–100 fewer net library lines, plus their tests</li></ul> | <ul><li>Brings back phase C/D bug 3: the store-hit fallback serves patched content with no state</li><li>Brings back stale stored sources after an engine fix</li><li>Brings back the in-process inconsistency between eager and cached reload</li></ul> |

### Contract: drop the store seam, or drop per-changeset overrides

Unchanged since round 1, and both are covered as PR splits above (A, C, E).

| Pros | Cons |
|---|---|
| <ul><li>A smaller first review</li></ul> | <ul><li>Both drop items John explicitly asked for</li><li>Without the store seam, cached and CVMFS sites get no patches</li></ul> |

## Decisions for John (not scope changes)

- **Counter home** (thermo 5, low priority). The options:
  - keep the tallies on the database;
  - count from the toolbox;
  - count from populate results;
  - the pure `summary(states)`.

  This also decides whether the populator stats get counts.
- **Test-file split** (thermo #13 / Option F). Best decided together with any PR split.
- **Compact `patches` on list endpoints.** Best decided together with the badge.
- **A `skipped` compat unit drops its file advisory.** This is a format-owner question, carried from round 1.
- **Writable named stores take the local patch config.** Matches the design. Carried from round 1 for confirmation.

## Other items

- **Duplicate YAML keys: a correctness fix, not scope.**
  - `collection.parse_patch_yaml` and `_read_yaml` use `yaml.safe_load`. It silently keeps the last of duplicate keys; checked: `ops: [a] … ops: [b]` loads as `ops: [b]`.
  - A patch file with two `ops:` blocks therefore loses ops without warning.
  - The fix is a small loader subclass that rejects duplicate mapping keys, plus one lint-table case. It belongs to the coordinator's hardening of code this branch adds.
- **The hg walk stop.** The seams could pass the shed repository dir as the upper bound for `find_repository_dir`. This is a two-line hardening change and optional.
- **Fixed since round 1:**
  - the patch-induced parse failure is now recorded in `global_tool_errors`;
  - the config docs state the restart semantics;
  - the freshness probe no longer rebuilds the database on every call.
- **Pre-existing, separate:** the `filesystem_safe_string` `TypeError` with `'` in dataset identifiers. It is why the fixture uses a dot instead of a quote, and it belongs in its own issue.
- **Celery-loaded converters are unpatched.** Low impact, carried from round 1, and covered by the Celery option if it is ever taken.
