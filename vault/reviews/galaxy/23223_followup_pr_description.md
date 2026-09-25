Posted by Claude (AI assistant) on behalf of the repository owner — drafted by Claude, not written personally.

# Harden Docker identity resolution from OIDC claims

Target: `SergeyYakubov/galaxy:docker_user` (Galaxy PR https://github.com/galaxyproject/galaxy/pull/23223).
Branches from the current tip of `docker_user`, so the diff is only this follow-up — no `dev` merge is included.

## Summary

Thanks for adding this facility-account integration — the execution-host identity model is the
right call for remote nodes. This follow-up keeps the feature and that model, and makes the
failure modes and the configuration contract predictable.

**Fail closed on the execution host.** UID, GID, and supplementary groups are resolved and
validated before anything invokes Docker — including the image cache command. A failed, empty,
or non-numeric lookup aborts with a diagnostic instead of producing `--user :`, whose blank
user and group fields Docker's user resolver defaults to uid 0 (established from moby
source, not reproduced against a live daemon).

**Keep the identity literal.** The extracted claim is shell data, not a shell expression, in
both the `id` lookup and the container environment directive. Existing expression-based
environment directives are untouched.

**Try the provider's other token.** Access-token precedence is preserved, but the same
provider's ID token is tried when the access token is opaque, lacks the claim, or does not match
the configured template.

**One configuration contract, validated at startup.** The resolution logic lived in three places
with no shared names. It now sits in `galaxy.jobs.oidc_user`, which `JobConfiguration` calls for
every static destination — an admin mistake fails startup rather than a user's job at dispatch.
`docker_util` owns the shell variable names, the `--user` value, and the destination parameter
names, so the runner and the container class cannot drift. An enabled configuration now requires
`docker_enabled` on the same destination; previously it was a silent no-op on, say, a Singularity
destination while still failing every job whose user had no token.

**A resolver that can be tested without a job runner.** The entry point is a module-level function
typed against a small `DescribesJobIdentity` protocol — a job destination and a job's user — rather
than a `BaseJobRunner` method that never used `self`. Tests exercise it directly, and the calls are
type-checked rather than escaping `mypy` through an untyped mock.

**Smaller things.** `set_user` is parsed with Galaxy's boolean parser, so `"false"` does not
enable account switching. `build_docker_run_command` is unchanged from `dev`. A `template` uses
the whole matched prefix as the username, preserving the original behavior even when the regex
contains capture groups. Configuration docs cover provider/token precedence, template semantics,
execution-host provisioning, where lookup diagnostics appear, and the fact that an enabled destination is
effectively OIDC-only.

## Testing

91 tests cover this change directly. The shell-level regressions run generated commands under both
`/bin/sh` and `/bin/bash` with recording `docker` and `id` functions, covering successful
resolution, every failed and malformed lookup shape, and identities containing spaces, quotes,
dollar substitutions and backticks. Resolver tests cover access/ID fallback, provider precedence,
template behavior, and each invalid-configuration case.

The surrounding suites (`test/unit/app/jobs`, container resolution and description) run 452 tests,
all passing except three — `test_expression_run` and two `test_runner_local` cases — which fail
identically on the base commit in this environment and are unrelated to the change. `mypy`, ruff,
flake8, the docstring include list, isort and black are all clean on this branch, and
`job_conf.sample.yml` is a pure insertion.

No real Docker job or integration server was run — Linux CI and a representative facility
account smoke test remain useful validation. Host-account provisioning and filesystem ownership
stay deployment prerequisites, and identity still comes from the configured provider's stored
tokens, so the site's authentication trust model is unchanged.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
