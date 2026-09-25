# PR #23223 — Docker user from OIDC token claims

https://github.com/galaxyproject/galaxy/pull/23223

Reviewed 2026-09-16 at `1a0b6f0470b4e23f44104a2d727fa0366bdb6586`, against merge-base `532aeebdc814ace7f9ce6b2bb1573ed33e5eef33` with target `dev`.
Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/23223` (clean).

## Follow-up implementation

User requested a fix branch on 2026-09-16. Worktree: `/Users/jxc755/projects/worktrees/galaxy/followup/23223-oidc-docker-user`, branch `fix/23223-oidc-docker-user`, based directly on the reviewed author head. The original findings below describe the author branch, not the corrected follow-up. A second agent is reviewing the complete feature and fixing additional concrete issues; its result lives in `galaxy_23223_followup_branch_review.md`. The draft PR body is `galaxy_23223_followup_pr_description.md`.

Completed and committed as `aa8185a68ff38ac2b9b4fca00deb8082980154a3`. Independent whole-feature review found no remaining concrete blocker after additional configuration/compatibility fixes; coordinator re-ran all 109 focused tests successfully. Commit hooks pass and worktree is clean. Pushed to `jmchilton/galaxy:fix/23223-oidc-docker-user` on 2026-09-16: https://github.com/jmchilton/galaxy/tree/fix/23223-oidc-docker-user . Ready for a PR against `SergeyYakubov/galaxy:docker_user`; no PR opened yet. Real Docker/integration validation remains outstanding.

## Verdict

Useful feature and a reasonable extension of the existing Docker command builder, but not ready to merge: host-account lookup must fail closed, and the extracted identity must remain literal data when added to the job shell. Both P1s are confined to the new, explicitly configured OIDC option; this is not a change to ordinary destinations. One additional P2 affects access-token/ID-token selection.

The description and discussion do not already identify these problems. There are no existing review comments to duplicate.

## Findings

### P1 — Failed host-account lookup can launch the tool as root

Location: `lib/galaxy/tool_util/deps/docker_util.py:163`, with the group preamble at `lib/galaxy/tool_util/deps/container_classes.py:44`.

The new mode emits `--user \`id -u username\`:\`id -g username\``. None of the UID/GID/group lookups checks success. When an authenticated facility account has not been provisioned on a compute node, or that node cannot reach its account directory, both substitutions can be empty. The generated command nevertheless invokes Docker with `--user :`; an unsuccessful `id -G` also does not stop the normal Galaxy job script (its default template does not enable `set -e`).

A harmless shell reproducer with failed `id` and a recording Docker function observed:

```text
argv=<--user>
argv=<:>
exit=0
```

This is a fail-open permissions problem, not merely a noisy job failure. [Docker's user setup](https://github.com/moby/moby/blob/v28.0.0/daemon/oci_linux.go#L168-L195) passes nil defaults to the user resolver; [that resolver](https://github.com/moby/sys/blob/main/user/user.go#L250-L367) uses defaults for blank user/group fields, initially UID/GID zero. Thus the malformed selection can become root inside the container instead of the facility account. This consequence is established from upstream source; no real Docker container was launched during review.

Recommended minimum fix: resolve UID, GID, and supplementary groups in checked shell assignments before `docker run`; abort with a useful message if any required lookup fails or the IDs are empty/non-numeric. Then pass the validated UID/GID pair as one quoted argument. Keep the resolution on the execution host, as intended, rather than moving it to the Galaxy server. Test that failed lookup never invokes Docker.

### P1 — Exporting a token identity turns its contents into host-shell code

Location: `lib/galaxy/tool_util/deps/container_classes.py:482`.

The new directive is appended as `f"{expose_as_env}={oidc_username}"`. The Docker builder intentionally does not quote `env_directives`, because the pre-existing callers use shell expressions for environment pass-through. But an extracted token claim is a value, not an expression. With `expose_as_env` enabled and the default `.*` matcher, a stored identity of `$(printf TOKEN_EXPANDED)` produces:

```sh
docker run -e GALAXY_TOOL_USER=$(printf TOKEN_EXPANDED) ...
```

The recording shell receives `GALAXY_TOOL_USER=TOKEN_EXPANDED`: `printf` ran on the execution host before Docker was called. Ordinary spaces also split the value into additional arguments. The reproducer exercises the real runner extraction method with a synthetic stored ID token and the actual container command builder; it does not assume a user can replace Galaxy's stored token.

The provider/claim/template settings are trusted admin configuration. Whether this permits a malicious user to execute code depends on whether that configured provider lets the user choose the claim's contents. Even for centrally managed identities, shell interpretation is incorrect and unnecessary. A strict site-specific username regex can reduce the exposure but should not be the only defense, especially for the advertised environment-only mode.

Recommended minimum fix: apply `shlex.quote()` to the complete literal `NAME=value` directive at this call site, leaving the existing expression-based directives unchanged. Also replace the new backtick-based `id` substitutions with `$(...)` while retaining literal argument quoting: backticks embedded in a quoted claimed name break the old-style substitution syntax. Add shell-level tests for literal spaces, dollar substitutions, quotes, and backticks—not just generated-string substring assertions.

### P2 — A present access token masks a usable ID token

Location: `lib/galaxy/jobs/runners/__init__.py:573`.

`tokens.get("access") or tokens.get("id")` selects exactly one token per provider. If an access token is present but is opaque, or is a JWT without the configured username claim, decoding/lookup raises and the exception moves to the next provider. The valid ID token from the same provider is never considered. With that provider as the only configured source, every job fails even though Galaxy has the required identity claim.

Reproduced both cases using a valid synthetic ID token containing `preferred_username=alice`: with no access token it succeeds; with an opaque access token or a JWT containing only a scope, it raises the generic extraction failure.

Recommended fix: explicitly choose/document a token source, or try the provider's ID/access candidates individually (keeping all candidates within the trusted configured provider). At minimum, the apparent access→ID fallback should actually retry the ID token when the access token cannot supply the claim. Test both opaque and claim-missing access tokens.

## Tests and CI

- 24 focused existing tests pass: the 5 new identity tests, Docker volume tests, container-description tests, and container-shape lint tests.
- Ran with `PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTHONPATH=lib`, borrowing the existing Python 3.13 unit environment at `/Users/jxc755/projects/worktrees/galaxy/pr/23517/.tox/unit/bin/python` read-only. The only warning is the disabled plugin's unknown `asyncio_mode` setting.
- Correct-behavior repro tests at `/tmp/galaxy-23223-review.YDI6hA/test_review_repros.py`: 4 fail as expected (two token fallback cases, literal environment export, fail-closed host lookup); 1 positive ID-token-only control passes. No PR source or tests were modified.
- The new committed tests verify happy-path command substrings, not actual shell arguments or the runner's token extraction; they therefore do not cover these failure modes. Existing assertions were not weakened.
- The sole failed GitHub check, [Integration shard 0](https://github.com/galaxyproject/galaxy/actions/runs/30567776145/job/90956532762), fails during minikube setup: `chmod: cannot access '/etc/cni/net.d': No such file or directory`. Tests do not start and no result artifact is produced. This is infrastructure failure, not evidence against this implementation. Other reported checks, including Python lint and unit tests, passed.

## Scope and positives

- Reuses `User.get_oidc_tokens()` and existing destination/container property plumbing; host-side resolution is correct for remote execution nodes.
- Leaves existing explicit/default Docker user behavior alone when the option is disabled, and supports environment-only use without adding identity groups.
- Destination configurations are deep-copied by `JobConfiguration.get_destination()`; the normal configured-destination path does not share the extracted username across users.
- New Python imports are at module scope.
- Unverified decoding alone is not reported as an authentication bypass: these tokens come from Galaxy's existing authenticated-provider storage, and the existing auth code also decodes that stored data. An arbitrary user-supplied token input was not found.
- Running under a different host UID still requires appropriate deployment filesystem permissions/ownership; the existing `external_chown_script`/system-user machinery may be relevant. That is a deployment prerequisite, not a demonstrated additional regression here.

## Follow-up

Commented 2026-09-18. If no author response by 2026-09-25, convert the PR to draft.

## Merge readiness — 2026-09-21

Exact heads checked:

- Upstream `galaxyproject/galaxy#23223`: `1a0b6f0470b4e23f44104a2d727fa0366bdb6586`
  (open draft, mergeable).
- Hardening follow-up `SergeyYakubov/galaxy#1`: `2731876f7adc75842e85386a6a53fa5050e7d1b9`
  onto base `docker_user` at `1a0b6f0470b4e23f44104a2d727fa0366bdb6586`
  (open, mergeable; only the maintenance-bot check ran and was skipped).

### Recommendation

Do **not** merge the upstream head as it stands. Merge the hardening follow-up into
`docker_user` first, let the resulting Galaxy PR head run normal upstream CI, then merge the
Galaxy PR if that CI is satisfactory. This is a merge-after-follow-up recommendation, not a
request to redesign the feature.

The upstream head still lacks all three material correctness/security fixes from the original
review:

1. Execution-host account resolution is not fail-closed. Failed `id -u`/`id -g` calls can emit
   `--user :`, which Docker's blank-user resolution can default to uid/gid 0. Supplementary-group
   lookup is also unchecked.
2. An OIDC claim exposed through `expose_as_env` is inserted into the host job shell without
   literal quoting, allowing shell expansion/argument splitting before Docker is invoked.
3. A present but unusable access token prevents trying a usable ID token from the same provider.

The follow-up also adds important guardrails absent upstream: shared/validated configuration,
startup validation for static destinations, boolean parsing, rejection of enabled non-Docker
destinations, explicit OIDC-only behavior, and shell-level fail-closed/literal-data tests. These
are not reasons to reject the approach, but they are reasons not to merge `1a0b6f0470b` alone.

### Scope and blast radius

The feature is opt-in. A destination without a truthy
`docker_username_from_oidc_token_claim` configuration follows the existing path, so ordinary
destinations are unaffected. On an enabled destination, however, every routed job is affected:
users without a usable configured-provider token fail, and `set_user: true` changes the identity
of the tool container. The follow-up documents that such a destination is OIDC-only, requires
`docker_enabled`, validates the host UID/GID/groups before any Docker/cache invocation, and keeps
the claimed identity literal in the host shell. This gives the optional feature a bounded and
fail-closed blast radius.

### Ownership and cleanup

Pulsar ownership reclaim is **not a Galaxy merge blocker** provided the follow-up lands and the
deployment prerequisite is stated clearly. Running containers under a facility UID necessarily
means that mounted outputs and nested directories can be owned by that UID; this can break
Pulsar postprocessing or recursive cleanup when modes do not permit its service account access.
That is a real operational limitation, but it is confined to explicitly enabled destinations
whose administrators must provision host accounts and filesystem permissions. It can be handled
as a Pulsar-side, tightly scoped reclaim feature rather than coupled to this Galaxy change.

The author reports that the *approach* has run in their deployment for several years to access
facility-owned data. That supports the use case, but it is not evidence that this exact public
commit has been deployed: no deployment branch/code was linked, their retained-job-directory
practice avoided much of the cleanup surface, and the proposed reclaim helper does not yet
exist. Therefore the report reduces design uncertainty but does not waive the hardening or the
need for upstream CI/representative deployment testing.
