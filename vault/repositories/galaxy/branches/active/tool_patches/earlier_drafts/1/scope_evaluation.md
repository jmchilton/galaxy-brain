Run via Claude Opus at high effort. **Recommendation: expand (modestly), in the code the branch already touches.** Everything John's request lists is built: engine, four ops, per-kind states, kinds and the `needed_from` gate, ops plus advisory, policy defaults, both seams, the fast-path and freshness digests, `ToolIndexEntry.patch`, manifest, `--tool-patch-path`, dirstate overrides with fallback, symlinked overrides, Go-style encoding and the unit, round-trip and integration tests. Nothing sizeable was built that John didn't ask for, so contracting would mean dropping requested items. Fold in four things. (1) Make the patch database consistent within each process: the in-process populate uses `app.tool_patches`, and the eager toolbox, cached reload and freshness token agree on when a collection change takes effect. This settles thermo #11's correctness half; it does not thread one database through every source-store API. (2) Fix the eager store-hit fallback, which serves patched content with `Tool.patch=None` (phase C/D bug 3). (3) Add an engine/format version to the policy bytes of the digest, so an engine fix within a series re-patches stored sources. (4) Add the startup patch summary and the populator patch counters from the design's Phase 1 "logs and counters". The thermo #12 Celery `ToolSource.patch` change and #13 test-file split stay decisions for John: the first is a separate option below, the second is code organisation, not scope. Whether to split the PR is covered under Possible Decompositions.

## Possible Decompositions

Size vs `origin/dev` (`4ec188d7a21`, 16 commits):
- About 2,170 non-test lines: 1,881 in `galaxy.tool_util.patches`, about 205 of Galaxy wiring and about 83 generated config sample, rst and attributes.
- About 1,725 test lines: 1,266 in the pure unit file, 141 integration, 124 populate-store, 101 toolbox and 37 cached-tool.

Every split below changes what `tool_patches_static_findings` rebases. That branch uses only the pure package (`apply_patches`, `patches_as_dicts`), so it can follow whichever PR carries the package.

**Option A: engine plus eager first, then the store** (the design's revision-note split).
1. Baseline tests (`daeb3750f0c`, the reload half only), the pure package and its unit tests, config, `app.tool_patches`, the eager seam in `get_expanded_tool_source`, the `reload_tool_by_id` guid fix, `Tool.patch` and the panel `patches` field, the job-cache rule at all three entry points, and integration on the eager toolbox. About 1,900 + 1,500 lines.
2. The store seam:
   - populator `process_tool` and the fast-path digest;
   - the freshness token;
   - `ToolIndexEntry.patch` and `ToolIndex.tool_patch_collections`;
   - the manifest field and `INDEX_SCHEMA_HASH`;
   - `--tool-patch-path`, cached stubs and materialisation, and read-only logging;
   - the populate-store baseline test, the store unit tests and the cached-toolbox integration subclass.

   About 270 + 250 lines.

   PR 2 is the only one that changes the index schema hash, so the parallel-bundle rollout note goes with it. Con: PR 1 alone lets eager and cached sites diverge, because cached sites aren't patched until PR 2 lands.

**Option B: reload fix first, then the feature.**
1. A small dev fix: `reload_tool_by_id` passes `guid` and `tool_shed_repository`, plus the baseline reload test. It needs its own red test, because the baseline passes with and without the fix (`baseline_refactor.md`). About 10 + 30 lines.
2. Everything else, as implemented.

**Option C: version files first, then per-changeset overrides.**
1. The full feature with version-file keys only: no `hg.py`, no `@<changeset>.yml` lookup, no symlink handling, and a fast-path digest without the changeset.
2. Overrides:
   - the dirstate v1 and v2 reader;
   - the override walk in `collection._walk_tool`;
   - the fallback rule (a mixed override keeps its security fix);
   - symlink resolution and refusal;
   - the changeset in `tool_digest`;
   - the dirstate and override unit tests.

   About 250 + 250 lines.

   PR 2 is the most self-contained design increment and the one most likely to draw reviewer questions.

**Option D: pure package, then eager, then store.**
1. `galaxy.tool_util.patches` plus its unit tests, with no Galaxy caller. About 1,880 + 1,270 lines.
2. The eager seam, config, job cache and API.
3. The store seam.

Con: PR 1 is unused infrastructure until PR 2. Galaxy reviewers usually want a caller, so this suits a reviewer who wants to read the format and engine on their own.

**Option E: A plus C combined.** Engine plus eager with version files only, then the store, then overrides. This gives the smallest first PR that still does something end to end.

## Scopes considered

### As implemented

The full MVP in one PR: the pure engine and path-keyed database, both load seams, store/index/manifest plumbing, the job-cache skip at three entry points, the API `patches` field, and synthetic fixtures. John's explicit follow-ups are left out.

| Pros | Cons |
|---|---|
| <ul><li>Covers every item in the request</li><li>One patched tree feeds the store, the index and the eager path, so the two toolboxes agree by construction</li><li>Reviews, test challenges and thermo fixes have all been applied</li><li>Turned off, the freshness token and stored entries are unchanged from dev</li></ul> | <ul><li>About 2.2k lines of library code plus 1.7k of tests in one PR</li><li>The new index fields change `INDEX_SCHEMA_HASH` even with `tool_patch_paths: []`, so publishers must ship a parallel bundle whether or not they use patches</li><li>The database is built up to three times at boot, and a cached reload sees new collection content while `app.tool_patches` stays stale</li><li>The eager store-hit fallback drops patch state</li><li>There is no startup summary or patch counter, although the design's Phase 1 lists them</li></ul> |

### Recommended: modest expansion of the implemented scope

Keep the feature as it is. Then:
- make the database consistent within each process;
- fix the store-hit fallback;
- version the engine in the digest;
- add the startup summary and the populator counters.

All four touch only files the branch already changes.

| Pros | Cons |
|---|---|
| <ul><li>Closes the one real inconsistency the reviews found: eager says "restart", while cached picks up changes on reload</li><li>Fixes a related bug in touched code</li><li>An engine fix can't leave stale patched sources behind</li><li>Admins get the visibility the design promised</li><li>Each fix is small</li></ul> | <ul><li>About 100–150 more lines plus tests</li><li>The consistency fix needs a semantics choice (below)</li></ul> |

<details><summary>Details</summary>

- **Database per process.**
  - `populate_store_inline` already receives `app` (`cached_toolbox.py:999`). Using `app.tool_patches` when an app is present removes one build. Using it in `indexed_patch_is_current` makes the populator agree with the eager toolbox.
  - The freshness token must then follow the same rule, or the index records a token from disk next to entries patched from the in-memory database.
  - Two coherent choices:
    - (a) Restart means restart everywhere. The token, populator and eager path all use `app.tool_patches`; the offline CLI builds its own.
    - (b) Reload re-reads everywhere. A toolbox reload rebuilds `app.tool_patches`, and the eager path re-checks `tool.patch.digest` on cache hits. That is close to the design's phase-2 live reload, so (a) fits the MVP.
  - Open point: the probe registry is `(config) -> str` and doesn't see the app. Under (b) the probe keeps building from disk. Under (a) the token needs the app's database, which is part of choosing between (a) and (b).
- **Store-hit fallback.**
  - `CachedToolBox.create_tool`'s eager fallback can reach `_get_tool_source_from_store` and return patched content with no state, which turns off the API field and the job-cache guard.
  - The fix: have that fallback parse from disk (factor out the file-parse branch of `get_expanded_tool_source`). Alternatively, look up the stored row's index entry and set `patch_state` from it.
- **Engine version in the digest.** Add a module constant to `_policy_bytes`, bumped when apply semantics change. It's cheap, it's invisible while the feature is off, and without it a point release that fixes the engine leaves the stored patched sources stale until a tool or patch file changes.
- **Logs and counters.** The startup summary is one INFO line per collection, with applied, already-applied, mismatch and advisory counts. The counters (`_tools_patched`, `_tool_patch_mismatches`) go next to `_tools_parsed_from_file` and appear in the existing load summary (`tools/__init__.py:719`, `cached_toolbox.py:621`). The populator returns the same counts in its stats.

</details>

### Contract: engine plus eager only (drop the store seam)

Ship only Option A's PR 1, and leave the populator, index, manifest and freshness work to a follow-up.

| Pros | Cons |
|---|---|
| <ul><li>A smaller first review, with no index schema hash change</li><li>The design's own suggested fallback if a reviewer wants it smaller</li></ul> | <ul><li>Drops items John explicitly asked for: fast-path digest, freshness, `ToolIndexEntry.patch`, manifest, `--tool-patch-path`</li><li>Cached-toolbox and CVMFS sites, the main production target, get no patches</li><li>Eager and cached deployments diverge</li><li>The work is done and reviewed, so cutting it saves no implementation effort</li></ul> |

### Contract: drop per-changeset overrides

Key only on version files. `hg.py`, the override walk, the fallback rule and symlinks become a follow-up.

| Pros | Cons |
|---|---|
| <ul><li>Removes the most novel logic (the dirstate parser and override fallback) from the first review</li><li>Version files alone cover the common case</li></ul> | <ul><li>Overrides and symlinks are explicitly in the request</li><li>Without them, drifted content inside one installable revision can only get a mismatch, never a fix</li></ul> |

### Expand: carry `patch` on the Celery task `ToolSource` (thermo #12)

Add `patch: ToolPatchInfo | None` to `schema.tasks.ToolSource` and set `tool.patch` when the worker rebuilds the tool. The tool-request path could then use `Tool.completed_jobs` like the other paths.

| Pros | Cons |
|---|---|
| <ul><li>Any later worker-side consumer sees patch state</li><li>Removes the web-process special case in `JobsService.create`</li></ul> | <ul><li>A Celery task schema change, which needs mixed-version worker compatibility during upgrades</li><li>The web-process decision already covers today's only consumer</li><li>Removes no call site, because `/api/jobs/search` and `completed_jobs` stay</li></ul> |

### Expand: one database threaded through the probe registry (thermo #11, full)

Change the freshness probe signature from `(config) -> str` to take the app or database, and thread one database through the populator and CLI.

| Pros | Cons |
|---|---|
| <ul><li>One build per boot</li><li>One source of truth, by construction</li></ul> | <ul><li>An API change across `source_store`, beyond what the patch feature needs</li><li>The recommended scope gets the correctness benefit without it</li><li>The cost is boot-only today, because the store watcher has no caller</li></ul> |

### Expand: accept the prototype guards `script_sha256` and `param_model`

Implement the optional `script_sha256` read-only check of an installed script, and the `param_model` field, instead of rejecting them through `extra="forbid"`.

| Pros | Cons |
|---|---|
| <ul><li>Reference-tree files using them would load and apply instead of loading unpatched</li><li>Supports the design's configfile-inlining path for bundled scripts</li></ul> | <ul><li>Each is its own guard, needing new I/O (script hashing against the tool dir) and tests</li><li>No shipped collection exists yet, so the format can still change</li><li>Rejecting fails safe today</li></ul> |

### Expand: cheap loader lints and a duplicate-key YAML loader (phase A/B nits 7 and 12)

Reject the following:
- `TODO` doc or reason values;
- `subset` without `authoring: hand`;
- an explicit `false` for `changes_requirements`;
- an advisory override without `expanded_sha256`;
- a `collection.yml` with no `version`;
- duplicate YAML keys (two `ops:`).

| Pros | Cons |
|---|---|
| <ul><li>Each check is a few lines in `model.py` or `collection.py` that this branch already owns</li><li>A duplicate `ops:` key is silently lossy today</li></ul> | <ul><li>These checks mostly belong to authoring CI, which John listed as a follow-up (the authoring CLI)</li><li>They add table rows to an already large test file</li></ul> |

<details><summary>Details</summary>

The duplicate-key loader is the strongest of these. It is a correctness guard for third-party collections and a small `CSafeLoader` subclass. If any of this list is taken, take that one. The rest are fine as a follow-up alongside the authoring CLI.

</details>

### Expand: John's explicit follow-ups

These are the admin endpoint, tool-form badge, `Job.tool_patch` column with the precise cache rule, live reload and watch, the authoring CLI, and shipped patches.

| Pros | Cons |
|---|---|
| <ul><li>A complete feature</li></ul> | <ul><li>John explicitly put them out of scope</li><li>The `Job` column needs a migration</li><li>The UI needs client work</li><li>Shipped patches need the patch repo and its CI first</li></ul> |

## Other scope items raised by reviewers

- **Thermo #13, the 1,266-line test file.** Organisation, not scope. A mechanical split along its `# ---` sections into `test/unit/tool_util/patches/` is a decision for John, best made together with any PR split, since Options A, C and D each split the file anyway.
- **Null-object database instead of `None`** (thermo). Keep `None`: it keeps the off state byte-identical to dev.
- **A `skipped` compat unit drops its file advisory** (thermo, and a phase A/B question). This is a format-owner question, not scope. Record it in the debrief for John.
- **Unbounded hg walk** (phase A/B #13). It only runs for keys with overrides. The seams could pass the shed repository dir as a stop, which is a two-line change if expansion (1) is taken.
- **Versionless pre-16.04 tools** (phase C/D nit 1). They stay unpatchable, which is documented. Keying them as `1.0.0` would make them patchable, but nothing asks for it.
- **Celery-loaded converters are unpatched** (phase C/D nit 8). The job command is built from the patched toolbox, so this has low impact. It is covered by the Celery option above if taken.
- **Config docs say "restart" while a cached reload re-populates** (phase C/D nit 3). The recommended consistency fix resolves this either way, and the doc then states the chosen semantics.
- **The reload guid fix as a standalone dev fix** (baseline refactor). See Option B. It isn't needed unless a reviewer asks.
- **Moving the `test_jobs.py` `_search*` helpers onto `DatasetPopulator.search_jobs`** (test challenges). It churns API tests the branch doesn't need, so it's a follow-up.
- **Distribution names in `tool_patch_paths`** (the design resolves them with `importlib.resources`). Not in the request, and no patch package exists yet, so it would be infrastructure with no caller. Leave it for the shipped-patches follow-up.
- **The `filesystem_safe_string` `TypeError` with `'` in identifiers** (initial debrief). It's in untouched code and predates this branch, so it should be its own issue or fix and not part of this branch.
- **Writable named stores take the local patch config.** The populator patches every store it writes, which matches the design's assumption. No change needed, but John should confirm.
