# PR #23223 — Follow-up branch review

Reviewed 2026-09-16: `fix/23223-oidc-docker-user` in
`/Users/jxc755/projects/worktrees/galaxy/followup/23223-oidc-docker-user`.
Scope: the complete feature against dev merge-base
`532aeebdc814ace7f9ce6b2bb1573ed33e5eef33`, including coordinator fixes on author
head `1a0b6f0470b4e23f44104a2d727fa0366bdb6586` and my additional working-tree changes.

## Verdict

Ready to propose against SergeyYakubov's `docker_user` branch. No remaining
concrete blocker found in this whole-branch pass. No serious design decision was
needed: the changes retain the original execution-host identity model and the
existing administrator-controlled destination configuration.

## Original findings addressed

- UID, GID and supplementary groups are resolved as literal account arguments
  on the execution host; failed, empty or malformed lookup results abort before
  any Docker command, including image-cache commands and cleanup traps.
- Token identities remain literal shell data in both account lookup and Docker
  environment directives. Existing expression-based environment directives are
  unchanged.
- A provider's access token is tried first, then its ID token when the access
  token cannot supply a matching nonempty string identity. Provider order remains
  the outer precedence rule.

## Additional fixes made during independent review

- Normalize `set_user` with Galaxy's existing boolean parser in both runner and
  container paths. In particular, `"false"` must not enable account switching or
  spuriously conflict with an explicit Docker user.
- Enabled identity configuration without a nonempty providers mapping now raises
  `ConfigurationError` instead of silently running with the default Galaxy UID.
  Invalid provider names, claim settings, regexes and environment variable names
  also fail with specific configuration errors. Disabled configurations remain
  no-ops without token reads.
- Move the new optional Docker builder parameter to the end of its signature,
  preserving every pre-existing positional parameter, including Docker host and
  port settings.
- Expand configuration documentation with provider/token precedence, regex-match
  semantics, execution-host provisioning and filesystem-access prerequisites,
  environment-only behavior and lookup failure handling.
- Add configuration, provider-precedence and API-compatibility regressions;
  strengthen shell regressions to assert that lookup failure invokes no Docker
  command at all. Cover spaces, substitutions, quotes and backticks in identities;
  malformed numeric lookup output includes whitespace-only, tabs and newlines.

## Verification

- **109 focused tests passed**: Docker identity, volumes, container descriptions,
  container lint, runner identity and runner parameter tests. Shell regressions
  exercise generated commands under `/bin/sh` and `/bin/bash` using recording
  functions, not a real Docker daemon.
- Ruff, Black and isort checks pass for the five changed Python files;
  `git diff --check` passes.
- Used the existing Python 3.13 unit environment read-only, with plugin autoload
  and pytest caching disabled and bytecode redirected to `/tmp`. The only pytest
  warning is the inactive asyncio plugin's `asyncio_mode` setting.
- Coordinator additionally verified actual local account UID/GID and all 17
  supplementary groups under both shells, still using recording Docker rather
  than launching a container.

## Remaining boundaries

No full integration server or real Docker job was run in this pass. Linux CI and
a representative facility account/container smoke test remain useful deployment
validation. Host accounts and mounted-file permissions must be provisioned by the
site; administrators must choose trusted provider claims and appropriate username
mapping. Reading persisted provider tokens without re-verifying their signature
is not, by itself, evidence of an authentication bypass in this code path.

This review made no commits, pushes or GitHub changes.

## Coordinator handoff

Coordinator re-ran the full 109-test set successfully and committed the reviewed
changes as `aa8185a68ff38ac2b9b4fca00deb8082980154a3`. All commit hooks pass;
the worktree is clean. The whitespace hook also removed existing trailing spaces
in the touched sample configuration. No code changed after this review. Branch
was pushed to `jmchilton/galaxy:fix/23223-oidc-docker-user` on 2026-09-16 at the
user's request; no PR has been opened. Branch:
https://github.com/jmchilton/galaxy/tree/fix/23223-oidc-docker-user . Draft PR body:
`galaxy_23223_followup_pr_description.md`.

---

# Second-pass review of the pushed branch (2026-09-16)

Independent re-review of `jmchilton/galaxy:fix/23223-oidc-docker-user` at `aa8185a68ff`
(author `1a0b6f0470b` + our hardening commit), merge-base `532aeebdc81`.
Worktree clean before and after; no code changed by this pass.

## Verdict

Useful work, and the three original findings are genuinely fixed — not papered over.
The tests are real, not substring theater (see mutation results). Not yet clean enough to
send: one dead code path, config validation at the wrong layer, and two silent-misconfiguration
gaps.

## Verified correct

- `JobConfiguration.get_destination()` deep-copies (`lib/galaxy/jobs/__init__.py:827`), so
  mutating `job_destination.params` with the resolved username cannot leak across jobs/users.
- The identity lookup is hoisted into `containerize_command`'s preamble, *above* `cache_command`
  and the `_on_exit` trap, so a failed lookup aborts before any `docker` invocation at all —
  including the image cache/pull. Tests assert no `DOCKER_CALL` on every failure mode.
- `id -u -- <quoted>` works on both GNU coreutils and BSD/macOS `id`.
- Prop naming lines up: runner writes `docker_username_from_token`; `Container.prop`
  (`container_classes.py:136`) prefixes `docker_`.
- 85 tests in the two new modules pass on the borrowed 3.13 unit env.

### Mutation testing (the useful-tests question)

Six targeted mutations, each reverted after: all caught.

| Mutation | Failures |
| --- | --- |
| drop `shlex.quote` on the `-e NAME=value` directive | 16 |
| drop numeric `case` validation of UID/GID | 14 |
| drop `shlex.quote` on the username in `id` lookup | 8 |
| try access token only, no ID fallback | 12 |
| `asbool(set_user)` -> `bool(set_user)` | 4 |
| `|| { exit 1 }` -> `|| true` on `id -u`/`-g` | 33 (see note) |

Note on the last row: that mutation also broke shell syntax, so the 33 overstates it. Replacing
only the guard's *body* (`|| { : }`) leaves all 85 passing — the numeric `case` check catches the
empty variable and still fails closed. The `|| exit 1` guard is defense in depth and a better
diagnostic, not the sole defense. The other five mutations are clean kills.

The shell-level harness (real `/bin/sh` and `/bin/bash`, recording `docker`/`id` functions,
parametrized over `alice smith`, `$(printf ...)`, backticks, `a'b"c;$HOME`) is the strongest
part of the branch.

## Findings

### 1 — `set_user_from_host` is dead production code

`docker_util.build_docker_run_command(..., set_user_from_host=True)` has no caller outside
tests. `container_classes.containerize_command` deliberately does *not* use it, because the
setup command must be emitted above `cache_command` and `build_docker_run_command` can only
prepend it to the run line. Result: two implementations of the same behavior, and the one with
the public signature is the unused one.

Two tests (`test_docker_run_command_can_set_user_from_host`,
`test_direct_docker_host_identity_lookup_fails_closed`) cover only that dead path, and
`test_docker_run_command_preserves_existing_positional_parameters` exists solely to protect its
placement in the signature.

Fix: delete the parameter and those three tests. Keep `build_docker_user_setup_command` as the
single shared seam — that is the right abstraction and it is already exported.

### 2 — Duplicated magic strings across the two layers

`'"$GALAXY_DOCKER_UID:$GALAXY_DOCKER_GID"'` is spelled out in both `docker_util.py` and
`container_classes.py`; `docker_username_from_token` is a bare literal in both the runner and
`container_classes`. Nothing ties the producer to the consumer. Promote both to module
constants in `docker_util.py` and import them.

### 3 — Destination config is validated per job, at dispatch time

All the `ConfigurationError` checks live inside
`_configure_docker_username_from_oidc_token_claim`, which runs on every job via
`_find_container`. A typo in `job_conf.yml` surfaces as a failed job for a user, not as a
startup/config error for the admin, and the template regex is recompiled per job. Validation
belongs at `JobConfiguration` destination-parsing time; the per-job path should then only do
the token lookup.

### 4 — Silent no-op plus hard failure on non-Docker destinations

Put `docker_username_from_oidc_token_claim` on a Singularity destination and the runner still
resolves the identity — and raises `Failed to get a username ...` when the user has no token —
while the container layer ignores the value entirely. Either reject the parameter for
non-Docker container types at config time, or skip resolution when the destination will not
consume it.

### 5 — Mixed-auth deployments get hard job failures

`User.get_oidc_tokens()` returns all-`None` for any user without a social-auth record. Any such
user — local account, API-only, admin impersonation — fails every job on an enabled destination.
That is the intended fail-closed behavior, but the sample config never says the destination
becomes OIDC-only. Add a sentence.

### 6 — Generic `raise Exception(...)` (minor)

Two bare `Exception`s in the runner, in a function that already raises `ConfigurationError`
from `galaxy.exceptions` elsewhere. Inherited from the author's commit, but we are rewriting
those lines anyway. Use a specific exception so failure classification and reporting behave.

### 7 — `template` is a prefix match (minor)

`template.match(...)` + `group(0)` means `"[a-z]+"` silently truncates rather than rejects. The
sample config does document "use an end anchor", so this is a foot-gun, not a bug. A capture
group or `fullmatch` would be less surprising.

### 8 — Vacuous negative assertions (minor)

`test_docker_container_can_expose_token_username_without_setting_user` asserts the absence of
strings from the *author's original* implementation (``"USERGROUPS=`id -G alice`"``,
`"$GROUPADD"`) that the current code can never emit. They pass unconditionally. Rewrite against
current output, or better, route this case through the `_execute` shell harness the neighboring
tests use.

### 9 — Lookup diagnostics land in job stderr, not `tool_stderr` (minor)

`CommandsBuilder.capture_stdout_stderr` (`command_factory.py:338`) appends the redirect only to
the final `docker run` line, so the `echo ... >&2` diagnostics go to the job script's stderr.
Depending on runner, the user may just see a failed job with no explanation.

### 10 — Unrelated whitespace churn in the commit (minor)

Four hunks of pre-existing trailing-whitespace fixes in `job_conf.sample.yml`, courtesy of the
pre-commit hook. Noise in a PR aimed at a contributor's fork branch — strip them or call them
out in the PR body.

## Recommendation

Address 1–4 before opening the PR; 1 and 3 are the ones a Galaxy maintainer will push back on.
5–10 are cheap. Real Docker/integration validation on Linux is still outstanding.


## Fixes applied — `ff92e6742ca` (2026-09-16)

Findings 1–4 fixed at the user's request and pushed to
`jmchilton/galaxy:fix/23223-oidc-docker-user`.

- **1** `set_user_from_host` deleted. `build_docker_run_command` is now byte-identical to dev;
  the only docker_util changes are additions. Its three dedicated tests are gone.
- **2** `UID_VARIABLE`, `GID_VARIABLE`, `GROUPS_VARIABLE`, `GROUP_ARGUMENTS_VARIABLE`,
  `HOST_RESOLVED_USER`, `HOST_RESOLVED_GROUP_ARGUMENTS`, `USERNAME_FROM_TOKEN_PROP` and
  `USERNAME_FROM_OIDC_TOKEN_CLAIM_PROP` now live once in `docker_util`. New test
  `test_container_emits_the_shared_host_identity_contract` asserts the container output
  *contains* `build_docker_user_setup_command`'s exact output, so the layers cannot drift.
- **3** New `lib/galaxy/jobs/oidc_user.py` holds the validated config
  (`OidcUsernameProvider`, `OidcUsernameConfig`, `parse_config`, `validate_destination`).
  `JobConfiguration` validates every static destination at load time, so admin mistakes fail
  startup rather than a user's job. `docker_util.parse_username_from_token_options` holds the
  `set_user`/`expose_as_env` half that the container layer needs without an auth dependency.
  The runner method is now 7 lines.
- **4** Enabled configs require `docker_enabled` on the same destination; documented in
  `job_conf.sample.yml`.

Verification: 145 focused tests pass. Ten mutations run against the refactored code — the six
originals plus `docker_enabled` requirement, `docker_set_user` conflict, container ignoring
`set_user`, and startup validation — all caught. Ruff, Black, isort, `git diff --check` and all
commit hooks pass. Three pre-existing failures in `test/unit/app/jobs/` (`test_expression_run`,
`test_runner_local` ×2, `test_job_context` error) were confirmed identical with the changes
stashed — environment, not this branch.

`galaxy.jobs` already imports `social_core`/`msal`/`galaxy.managers.users` on dev, so importing
`galaxy.authnz.util` from the new module adds no dependency weight and creates no cycle
(verified by importing both packages in a clean interpreter).

Findings 5–10 remain open. Real Docker/Linux CI validation still outstanding. No PR opened.

## Minors cleared — `899888d8814` (2026-09-16)

Findings 5–10 fixed and pushed.

- **6** `OidcUsernameError` replaces both bare `Exception` raises, so a failed identity is
  distinguishable from any other job-prep failure. New test covers the no-user case, which
  previously had none.
- **7** A `template` with a capture group now names the username explicitly; without one the
  matched prefix is still used, so existing configurations behave identically. Three tests
  pin capture-group, whole-match and no-match behavior.
- **8** `test_docker_container_can_expose_token_username_without_setting_user` now runs through
  the `_execute` shell harness and asserts the arguments Docker actually receives, instead of
  ruling out strings the author's original implementation emitted.
- **5, 9** `job_conf.sample.yml` now says lookup diagnostics land in the job's stderr rather than
  the tool's, and that an enabled destination is OIDC-only — users without a stored token from a
  configured provider cannot run jobs there.
- **10** Restored the trailing whitespace the commit hook had stripped from unrelated lines;
  committed with `SKIP=trailing-whitespace`. `job_conf.sample.yml` is now a pure 33-line
  insertion.

Whole branch against dev is 724 insertions and 2 deletions across 9 files — `docker_util.py` and
`job_conf.sample.yml` are additions only, and `build_docker_run_command` is unchanged from dev.

Verification: 199 focused tests pass (`test_docker_user`, `test_runner_oidc_user`,
`test_job_configuration`, `test_runner_params`, `test_command_factory`, `test_mapper`,
`test_docker_volumes`, `test_container_description`, `test_container_shape_lint`). Ruff, Black,
isort clean; all other commit hooks pass. Branch:
https://github.com/jmchilton/galaxy/tree/fix/23223-oidc-docker-user

All ten findings from the second pass are closed. Remaining: real Docker/Linux CI validation,
and `galaxy_23223_followup_pr_description.md` still describes only the first hardening commit.

## CI red fixed and dev merged — `2731876f7ad`, `b2aa7b07845` (2026-09-17)

Lint job on run 35140369892 failed with 4 mypy errors, all in
`test/unit/app/jobs/test_runner_oidc_user.py`: the tests called the unbound
`BaseJobRunner._configure_docker_username_from_oidc_token_claim` with `None` for `self` and a
`SimpleNamespace` for the job wrapper.

Fixed at the cause rather than with `type: ignore`. The method never touched `self`, so it moved
to `galaxy.jobs.oidc_user.configure_destination`, and the job-wrapper surface it needs — a
`job_destination` and a job's `user` — is declared as a `DescribesJobIdentity` Protocol.
`BaseJobRunner` no longer carries the method; `_find_container` calls the function. The tests
keep their lightweight `SimpleNamespace` and mypy now checks the call, because `SimpleNamespace`
satisfies the Protocol structurally.

Then merged `origin/dev` (1356 commits, `86985b9d574`) as `b2aa7b07845`. No conflicts. Upstream
had touched all four files we modify, but not in overlapping regions — its `container_classes`
change adds an `image_identifier_is_path` property unrelated to `containerize_command`. Both
insertion points (`JobConfiguration` destination validation, `_find_container`) were re-read in
the merged tree and are still correct.

Verification on the merged tree, running every gate the failing CI job runs rather than just the
one that went red:

- `mypy . ../test` — clean, 2393 source files.
- `tox -e lint,lint_docstring_include_list,format` — all OK (ruff, flake8, docstring include
  list, isort, black).
- 179 focused tests pass, now including upstream's new `test/unit/tool_util/test_container_classes.py`.

Pushed to `jmchilton/galaxy:fix/23223-oidc-docker-user`. `.tox/` is gitignored and was not
committed.

## PR opened against the contributor branch (2026-09-18)

`fix/23223-oidc-docker-user` could not be PRed directly: it carries the `origin/dev` merge
(`b2aa7b07845`), and `docker_user` is an ancestor of it, so GitHub would have shown 1362 commits
across 1162 files. Pushed the pre-merge tip `2731876f7ad` as
`jmchilton/galaxy:fix/23223-oidc-docker-user-followup` instead — 5 commits, 8 files.

Gates re-run on that exact head (not the dev-merged tree): `tox -e mypy` → "Success: no issues
found in 2332 source files"; `tox -e lint,lint_docstring_include_list,format` → OK; 91 tests in
`test_docker_user.py` + `test_runner_oidc_user.py` pass; wider run (`test/unit/app/jobs`,
container resolution/description) 449 passed / 3 failed, and those 3 (`test_expression_run`,
two `test_runner_local`) fail identically on base `1a0b6f0470b4` — environment, not the change.

PR: https://github.com/SergeyYakubov/galaxy/pull/1 (base `docker_user`).
`galaxy_23223_followup_pr_description.md` refreshed to match: real test numbers, the `DescribesJobIdentity`
protocol paragraph, and a note that no `dev` merge is included.

The `fix/23223-oidc-docker-user` branch (with the dev merge) stays as-is for our own CI.
