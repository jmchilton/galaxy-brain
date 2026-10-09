# galaxy #16666: Docs and tests for environment variable setting in containerized execution (rescue plan)

## PR state

- Author: bernt-matthias. Head is `bernt-matthias/galaxy:topic/containers_env`, base is `dev`.
- Reviewed SHA: `7c68315e283`. All 13 commits were re-dated 2024-07-31 by a rebase. Merge-base: `a71678242b8` (2024-07-31), which is **18,493 commits behind** `origin/dev` `1eed562dfc2` (fetched 2026-09-29).
- GitHub state: OPEN, MERGEABLE, reviewDecision APPROVED, labels `kind/bug, area/testing, area/testing/integration, area/backend`.
- **No milestone.** It has slipped through 23.2, 24.0, 24.1, 24.2 and 25.0, and was removed from 25.0 on 2025-05-06.
- **The approval is stale.** mvdbeek approved at `b912522c5` on 2024-05-07, not at the current head. In the same round they left an inline request to drop the `JOBCONF_ENV_VAR` asserts, and that request was never resolved.
- **Trial merge was clean.** `git merge-tree --write-tree origin/dev HEAD` returned rc=0 (tree `bde9712fd1`).
- **The net diff is docs and tests only** (10 files, +58/-1). The code fix was `2a98cd865`, which passed the full `JobDestination` into `Container`, plus `c94ba787a`. The author reverted both in `51e729136` and `b8a152dea` after the security discussion.
- Worktree: `~/projects/worktrees/galaxy/pr/16666/`. ghwt was not used; I created it by hand with `git fetch https://…/pull/16666/head:pr-16666` and `git worktree add`. `ghwt rm` may not know about it, so clean up with `git worktree remove` + `git branch -D pr-16666` in `~/projects/repositories/galaxy`.

## Conversation digest

### Timeline

**2023-09-08 — author's framing, relayed from Matrix.**
- bernt-matthias found that destination `env` never reaches the tool inside docker/singularity.
- Their first fix passed the whole `JobDestination` into the container classes.
- natefoo (on Matrix) did not want every var forced into the container, because admins need some vars outside it, for the container runtime itself. They suggested a per-entry `containerize: true|false` option on `env`, defaulting to true, or else making vars available both inside and outside.

**2023-09-10..12 — security objection.**
- mvdbeek preferred the existing workaround (`docker_env_*` / `singularity_env_*` params). They worried about changing defaults and leaking admin secrets into containers.
- nuwang explained the TPV motivation: tpv-shared-database sets tool env vars (for example `_JAVA_OPTIONS`) that silently do nothing on containerized destinations, which hurts AnVIL/k8s-style deployments. They proposed splitting `env` into `system:` and `tool:`.
- mvdbeek: TPV needs a layer of indirection anyway, and it is not OK to change existing behaviour that people rely on to keep vars out of containers.
- Rough agreement on a split, naming undecided (mvdbeek suggested `global`/`job`).
- bernt-matthias then retargeted the PR to "revert code, keep and extend tests for `docker_env_`/`singularity_env_`". This is the current diff.

**2024-05-07..08 — approval with dissent.**
- mvdbeek approved, but said "I don't think this is a good state of affairs": `env`, `file` and `execute` should be available in containers, and only stray host vars (PYTHONPATH, secrets) should not.
- They also left the inline request: "remove the `JOBCONF_ENV_VAR` tests, we should fix this, not cement it with tests."
- bernt-matthias replied "then we should not merge it". mvdbeek countered that passing everything brings back the secrets leak. Their middle ground was to implement the `ToolInfo` TODO at `dependencies.py` L52–54: a tool-declared list of env vars it consumes, which is safe to pass through.

**2024-07-31 — test pushback and a docs suggestion.**
- bernt-matthias pushed back on removing the test: it documents current behaviour and can be flipped later.
- jmchilton suggested calling it out in the docs as a known bug, to soften mvdbeek's concern. That was never applied.

**2025-02-04.** jdavcs moved it to 25.0, "approved, but … not quite ready." It was later demilestoned.

**2026-01..02 — revived by new issues.**
- cat-bro opened #21640 (still open): TPV env vars need a `SINGULARITYENV_` prefix under singularity. bernt-matthias linked it here.
- bernt-matthias opened #21715 (credentials missing in containers). It was fixed by #21821, merged 2026-02-20.
- On 2026-02-03 an inline thread on `dockerized_job_conf.yml` restarted the design discussion:
  - nuwang proposed a `container:` block with its own `env` and Dockerfile-style pass-through.
  - mvdbeek proposed separate `job_env` / `tool_env` keys next to `env`, and said either would suit TPV.
  - bernt-matthias preferred not to change job-conf syntax unless really needed.
  - nuwang then proposed nesting `env: {<top-level>, job: {...}, tool: {...}}`, with top-level entries treated as job-only plus a deprecation warning.
  - bernt-matthias liked the nesting because the deprecation warning would push admins to move vars to `tool`.
- Nothing has happened since 2026-02-03.

### Resolved
- The code fix (full `JobDestination` into `Container`) is abandoned. All parties agree it was the wrong shape. Reverts: `51e729136`, `b8a152dea`.
- `docker_env_*` / `singularity_env_*` should be documented and tested.
- mvdbeek's `respectively` comma suggestion was applied.

### Still open
1. **Keep or drop the `JOBCONF_ENV_VAR == "UNSET"` asserts.** mvdbeek wants them dropped; bernt-matthias wants to keep them. jmchilton's middle ground ("document as a known limitation") was never applied.
2. **The target design.** There are four candidate shapes, none chosen:
   - per-entry `containerize` flag (natefoo, 2023)
   - `env: {job:, tool:}` nesting with deprecation (nuwang + bernt-matthias, 2026)
   - `job_env` / `tool_env` sibling keys (mvdbeek, 2026)
   - tool-declared consumed vars via `ToolInfo` (mvdbeek, 2024)
3. **Whether to change Galaxy job-conf syntax at all.** bernt-matthias is reluctant.
4. **Whether this PR should merge before the fix.** mvdbeek approved but disliked documenting it; bernt-matthias said "then we should not merge it."

### Why it stalled
- The PR's scope was reduced to documenting behaviour that the approver called a bug. That left nobody enthusiastic about merging it.
- The actual fix needs a design choice that no one owns. It spans Galaxy job-conf syntax and TPV.
- Every release cycle bumped the milestone until it was dropped.

## Per-change relevance (against `origin/dev` `1eed562dfc2`)

| File / hunk | Applies cleanly? | Classification | Notes |
|---|---|---|---|
| `doc/source/admin/jobs.md`: new paragraph under "Environment Modifications" | yes | **Still relevant, needs rework** | The text is inaccurate: it says only `file`/`exec` setup is missing in the container, but its own tests assert that plain `name`/`value` `env` is also UNSET. On dev **no** `env` entry reaches a local docker/singularity container. It should cover all `env` forms, and say that tool `<environment_variables>`, credentials and `GALAXY_*` resource vars *are* passed through. It should add a Singularity caveat: with `singularity_cleanenv: false`, host env leaks in, so `env` vars appear. It should state that k8s and Pulsar coexecution differ: the whole job script runs in the container there, so `env` applies. Consider also adding `docker_env_*` / `singularity_env_*` to `lib/galaxy/config/sample/job_conf.sample.yml` next to `singularity_cleanenv`; neither is documented anywhere on dev (`git grep` finds nothing in `lib/galaxy/config` or `doc`). |
| `jobs.md`: new `### Job resubmission` heading | yes | **Still relevant, applies** | On dev the `<resubmit>` paragraph still sits headless under "Environment Modifications". Independent of everything else, so it could be its own trivial PR. |
| `test/functional/tools/job_environment_{default,default_legacy,explicit_isolated_home,explicit_shared_home}.xml`: echo `JOBCONF_ENV_VAR` / `CONTAINER_ENV_VAR` into two new outputs | yes | **Still relevant, applies** | The tools on dev are unchanged apart from a busybox image bump. New outputs land at hid 7/8. Other consumers are `test_coexecution`, `test_cli_runners`, `test_kubernetes_runner`, `test_chained_dynamic_destinations` and embedded Pulsar. Those subclasses use `_run_and_get_environment_properties` but don't assert the new fields. The `${VAR:-UNSET}` form never fails, so they are unaffected apart from two extra dataset reads. |
| `test/integration/test_job_environments.py`: namedtuple + hid 7/8 reads; asserts in `TestDefaultJobEnvironmentIntegration` | yes (dev only changed `tempfile.mkdtemp` → `_test_driver.mkdtemp`) | **Still relevant, applies** | Ordering assumption: outputs map to hids in declaration order, same as the existing six. |
| `test/integration/simple_job_conf.xml`: `<env id="JOBCONF_ENV_VAR">`, `docker_env_CONTAINER_VAR`, `singularity_env_CONTAINER_VAR` | yes | **Still relevant, has a bug** | The params are named `CONTAINER_VAR`, but the tools echo `CONTAINER_ENV_VAR`. So `assert container_env_var == "UNSET"` in the non-container test passes vacuously. Rename to `docker_env_CONTAINER_ENV_VAR`. Also, `simple_job_conf.xml` is shared with `test_job_files.py` and `test_job_recovery.py`. That is harmless, but those tests then run with an extra env var. |
| `test/integration/dockerized_job_conf.yml`: `env` (name/value + `execute: 'true'`), `docker_env_CONTAINER_ENV_VAR` on `local_docker`; `env` on `local_docker_inline_container_resolvers` | yes | **Still relevant, applies** | `local_docker` also carries `tmp_dir` on dev. The `env` on the inline-resolver environment is untested, so drop it or assert on it. |
| `test/integration/singularity_job_conf.yml`: `env` + `singularity_env_CONTAINER_ENV_VAR` | yes | **Still relevant, applies** | `TestSingularityJobsIntegration(TestDockerizedJobsIntegration)` inherits every docker assert, so both runtimes get covered. The `JOBCONF_ENV_VAR == UNSET` assert relies on the default `--cleanenv`, and the test should say so. |
| `test/integration/test_containerized_jobs.py`: 8 asserts in the four `test_container_job_environment*` methods | yes | **Still relevant; `CONTAINER_ENV_VAR` asserts applies, `JOBCONF_ENV_VAR` asserts controversial** | The file grew a lot on dev (credentials tests from #21821, mulled-build rework), but the four target methods are intact. |
| Reverted code (`2a98cd865`, `c94ba787a`): `JobDestination` threaded through `DependencyManager`, `containers.py`, `container_classes.py`, resolvers | n/a (net zero) | **Obsolete, don't revive** | `destination_info` is still `job_wrapper.job_destination.params` on dev (`runners/__init__.py` ~607). Since then dev has grown a narrower abstraction that fits better; see below. |

## Current-dev behaviour (container env vars)

**Job script.**
- Destination `env` entries (`name`/`value`, `raw`, `file`, `execute`) become shell statements in the outer job script, via `JobWrapper.get_env_setup_clause` (`lib/galaxy/jobs/__init__.py` ~2579).
- For local and DRM runners with `docker_enabled` / `singularity_enabled`, the tool command is wrapped by `containerize_command`, so those statements only affect the outer shell.

**Docker** (`container_classes.py` ~463). The `-e` directives are exactly:
- `"VAR=$VAR"` for each name in `self.tool_info.env_pass_through`
- `"VAR=value"` for each `docker_env_VAR` destination param

Docker never inherits host env. `docker_set_user` and `docker_run_extra_arguments` are unrelated. An admin could hand-add `-e` via `docker_run_extra_arguments` as a hack.

**Singularity / Apptainer** (`container_classes.py` ~591, `singularity_util.py` ~89):
- Sets `SINGULARITYENV_VAR="value"` for the same two sources.
- `--cleanenv` is on by default (`singularity_cleanenv`, see `job_conf.sample.yml` ~626), so host env is dropped. With cleanenv off, the outer-shell `env` vars do leak in.
- Apptainer accepts the `SINGULARITYENV_` prefix (with a deprecation warning in newer releases; worth noting in docs).

**`env_pass_through` is now the single reuse point.** It is built from `tool.docker_env_pass_through`:
- `ToolSource.parse_docker_env_pass_through()` (`tool_util/parser/interface.py` ~270): `GALAXY_SLOTS`, `GALAXY_MEMORY_MB[_PER_SLOT]`, `GALAXY_MEMORY_GB[_PER_SLOT]` (the GB vars came from #23513), `HOME`, `_GALAXY_JOB_HOME_DIR`, `_GALAXY_JOB_TMP_DIR`, `TMPDIR`/`TMP`/`TEMP`
- tool `<environment_variables>` names (`tools/__init__.py` ~1455)
- credentials `inject_as_env` names (`tools/__init__.py` ~1579–1588, added by **#21821**, which fixed #21715)
- consumed via `ToolInfo(... tool.docker_env_pass_through ...)` in `BaseJobRunner._find_container` (`runners/__init__.py` ~587) and `rule_helper.py` ~54

The `ToolInfo` TODO that mvdbeek pointed at is still there (`dependencies.py` ~52: "Introduce tool XML syntax to annotate the optional environment variables they can consume … and add these to env_pass_through").

**Other runners already differ:**
- **Kubernetes runner:** the job script runs inside the container, so destination `env` applies to the tool. It also has its own `k8s_extra_job_envs` mapping param (`kubernetes.py` ~613).
- **Pulsar coexecution** (`pulsar_k8s` etc., `remote_container_handling`): the tool container runs the job script, so destination `env` reaches the tool. `test/integration/test_coexecution.py` asserts `some_env == "42"` with `docker_enabled: true`.
- **Non-coexecution Pulsar:** the container is computed Galaxy-side via `_find_container`, so the same pass-through list applies.
- **Result:** "does `env` reach the tool?" already has different answers per runner. That is an argument for fixing it, and for documenting the matrix.

**Admins today** hand-duplicate vars as `docker_env_*` / `singularity_env_*` params, or `SINGULARITYENV_*` in `env`. For example, `galaxyproject/idc`'s TPV template uses `SINGULARITYENV_`, and tpv-shared-database has one such entry.

**Newer related items:**
- #21640 (open, cat-bro, 2026-01-22): per-resolver prefixing.
- #21715 / #21821 (closed or merged 2026-02): credentials. This is the precedent pattern for the fix.
- #18269 (closed): DRMAA env, unrelated to containers.
- tpv-shared-database #103 / #105: env entries such as `OPENBLAS_NUM_THREADS` that silently miss containers.
- usegalaxy-eu infrastructure-playbook #1722: CUDA env hack.
- Nothing else open on dev targets this.

## Rescue plan

Split into three pieces. The docs/tests can land without waiting on the design debate; the feature gets its own PR, where the red-to-green step also answers mvdbeek's "don't cement it" objection.

### PR 0: trivial docs fix (optional, can fold into PR A)
- Cherry-pick `e76272dcf` ("add possibly lost subsection"), the `### Job resubmission` heading. It is independent and uncontroversial.

### PR A: document and test today's behaviour (small; landable now)
Base on a fresh branch off `origin/dev`, cherry-picking bernt-matthias's test commits (`98c914ea7`, `c202e8842`, `0cac78a7a`, `1a98c81dc`, `43a07d65c`, `7c68315e2`) to preserve authorship, or ask them to rebase their branch.

1. **Fix the vacuous test:** in `simple_job_conf.xml`, rename `docker_env_CONTAINER_VAR` / `singularity_env_CONTAINER_VAR` → `…CONTAINER_ENV_VAR`. Check it goes red first: temporarily point the local destination at a docker-enabled config, or reason from `containerize_command` never running for local.
2. **Keep the `CONTAINER_ENV_VAR` asserts** (docker and singularity via inheritance). These are pure coverage of an undocumented, working feature.
3. **`JOBCONF_ENV_VAR` asserts — user decision** (Q1 below):
   - **(a)** Drop them from PR A, per mvdbeek's inline request, and reintroduce them in PR B with the intended semantics.
   - **(b)** Keep them with a comment and docs framing them as a known limitation, as jmchilton suggested in 2024. Recommend (a) if PR B is coming soon, else (b).
4. **Rewrite the docs paragraph in `jobs.md`:**
   - No destination `env` entry reaches a local/DRM docker or singularity container.
   - What *is* passed through: resource vars, tool `<environment_variables>`, credentials.
   - `docker_env_*` / `singularity_env_*`, plus the Apptainer prefix note.
   - The `singularity_cleanenv: false` caveat.
   - k8s/coexecution runners differ.
   - Link #21640.
5. Add commented `docker_env_*` / `singularity_env_*` examples to `job_conf.sample.yml` next to `singularity_cleanenv`.
6. Drop the untested `env` on `local_docker_inline_container_resolvers`, or assert on it.

### PR B: opt-in pass-through of destination env to the tool container (the real fix; needs design sign-off)

**Reuse point.** Add names to `ToolInfo.env_pass_through`, which is what #21821 did for credentials, instead of threading `JobDestination` through the container layer. The seam is `BaseJobRunner._find_container`: extend a copy of `tool.docker_env_pass_through` with the selected destination `env` names before building `ToolInfo`.
- Only `name`-style entries qualify; `file`/`execute` can't be forwarded.
- Pass-through emits `VAR=$VAR`, so the value comes from the outer shell that already ran the `env` statements. `raw` quoting and `$`-expansion then behave like non-containerized jobs for free.
- Covers docker and singularity at once, and non-coexecution Pulsar too.

**Selection syntax — user/maintainer decision** (Q2). Three options, in order of least schema churn:
1. **Per-entry flag** on existing `env` items (for example `tool: true`, or natefoo's `containerize: true`). Works identically in XML (`<env id="X" tool="true">`) and YAML, and changes nothing by default, so no secret leak. Smallest diff.
2. **Nested `env: {job:, tool:}` with deprecation warnings** for top-level entries (nuwang + bernt-matthias, 2026-02). Clearer semantics and helps TPV, but changes the `env` list type in YAML and needs an XML equivalent.
3. **`job_env` / `tool_env` sibling keys** (mvdbeek, 2026-02).

**Complementary, tool-side:** implement the `ToolInfo` TODO as tool XML declaring consumed optional env vars (for example, a `pass_through` attribute or element). That was mvdbeek's 2024 middle ground. It is orthogonal to the destination-side choice and could be a separate follow-up.

Also:
- Wire the same selection into `k8s`/coexecution docs. It's a no-op there, but document it for consistency.
- Consider whether TPV needs a matching field. That's for nuwang's side.
- Closes #21640.

### Who does it
- **First choice:** offer PR A back to bernt-matthias. They are an active member, cross-linked this PR in January 2026, and it's a small rebase plus rename plus docs rewrite.
- **Otherwise:** we take over on a new branch (for example `jmchilton/container_env_docs`) with cherry-picked commits that keep their authorship, and credit them in the PR body.
- **PR B:** needs a maintainer decision on syntax first. Propose it in the restart comment and let mvdbeek, nuwang and bernt-matthias converge before anyone writes code.

### Test plan

**PR A:**
- The asserts above, in `TestDockerizedJobsIntegration`, `TestSingularityJobsIntegration` and `TestDefaultJobEnvironmentIntegration`.
- First red for the rename fix: `TestDefaultJobEnvironmentIntegration::test_default_environment` with the tool echoing a var that the conf actually sets (sanity-check the conf wiring).
- Run the suites one at a time, per the Galaxy guidance.

**PR B (red-to-green):**
1. Add a tool-scoped entry to `dockerized_job_conf.yml` / `singularity_job_conf.yml` (for example `name: TOOL_ENV_VAR, value: YEAH, tool: true`) and echo it in the job_environment tools.
2. The first red is `test/integration/test_containerized_jobs.py::TestDockerizedJobsIntegration::test_container_job_environment`, asserting `job_env.tool_env_var == "YEAH"`.
3. Implement, then go green.
4. Keep `JOBCONF_ENV_VAR == "UNSET"` as the intended "job-only vars stay out" assertion. That turns mvdbeek's "cementing a bug" into testing a deliberate security property.
5. Add the same assert in `TestDefaultJobEnvironmentIntegration` (non-container: both vars set).
6. Add a Singularity-inherited run.
7. Add a unit-level test only if it adds something: `ToolInfo.env_pass_through` composition in a `_find_container` test. It's probably unnecessary given the integration coverage.

## Risks
- **Secret leakage** if the default flips. Opt-in only; never auto-forward all `env`.
- **Name collisions:** a flagged var that shadows a pass-through default (for example `HOME`, `TMPDIR`) would produce duplicate `-e` entries. Dedupe it, and decide precedence.
- **YAML schema change** (option 2) breaks the TPV → Galaxy passthrough and any tooling that assumes `env` is a list. It needs deprecation handling and TPV coordination.
- **Runner divergence stays:** k8s/coexecution already expose all `env`. Docs must explain that the flag only matters for wrapped-container runners.
- **Singularity `cleanenv: false` sites** already see all `env` vars inside, so the new tests must pin cleanenv on.
- The integration tests need docker and singularity/apptainer on CI. They exist today, but they are slow and flaky-prone, so keep the additions to asserts on existing tool runs, not new jobs.

## Unresolved questions
1. `JOBCONF_ENV_VAR == UNSET` asserts in PR A: drop them (mvdbeek's request) or keep them as a "known limitation"?
2. PR B syntax: per-entry flag, nested `env.job/tool`, or `job_env`/`tool_env`? Do we push an opinion, or let the thread pick?
3. Offer PR A to bernt-matthias first, or just take it over with authorship preserved?
4. Fold the `Job resubmission` heading into PR A, or send it as a separate one-liner?
5. Is tool-XML consumed-var syntax (the `ToolInfo` TODO) in scope, or a separate follow-up?

## Draft restart comment (not posted)

> *Posted by Claude (an AI assistant) on behalf of jmchilton. Not written by jmchilton personally.*
>
> Picking this back up. I rechecked it against current `dev`: it still merges cleanly, and the reverted code means the diff is only docs and tests. Since this PR stalled, #21821 fixed the same problem for tool credentials by adding names to `ToolInfo.env_pass_through`, the list that feeds docker `-e` and `SINGULARITYENV_`. That looks like the right seam for destination `env` too, rather than passing the whole `JobDestination` down.
>
> Proposal to get unstuck:
>
> 1. **Land the docs/tests now as a small PR.** Rename the non-container `docker_env_CONTAINER_VAR` / `singularity_env_CONTAINER_VAR` to `CONTAINER_ENV_VAR`; the negative assert currently passes vacuously. Rewrite the jobs.md paragraph to say that no `env` entry reaches local/DRM containers, which vars *are* passed through, and the `singularity_cleanenv` caveat. Keep the "Job resubmission" heading fix.
> 2. **Fix it for real in a follow-up** as an opt-in destination-side pass-through built on `env_pass_through`, so nothing leaks by default. #21640 would be closed by this. The open question is syntax: a per-entry flag on `env` items (smallest change, same in XML and YAML), nested `env: {job:, tool:}` with deprecation, or `job_env`/`tool_env`. Preferences?
>
> Happy to help with the rebase or take over the docs/tests part on a new branch, with commits and credit kept, if that's easier.

## Decisions (user, 2026-09-29)
- Go with the PR A / PR B split. PR A avoids the `JOBCONF_ENV_VAR` assert question entirely (no new asserts on job-scoped env reaching containers); PR B adds the job/tool pair.
- PR B syntax: `job_env` / `tool_env` sibling keys next to `env` (mvdbeek's 2026 proposal). Plain `env` keeps today's job-only semantics.
- Tool-side `ToolInfo` declaration: tangential; research spun off separately.
- Superseded by the design in `env_design_decisions.md`: one PR implements `job_env`/`tool_env`, `runtime_environment_variable` and the unset-variable job message.
