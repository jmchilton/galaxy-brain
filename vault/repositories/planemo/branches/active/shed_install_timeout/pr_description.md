Fix 🎯 #1768 - put a time limit on Tool Shed repository installs so a hung Galaxy install fails instead of blocking planemo forever.

In #1768, the `card/rgi` install hung on the Galaxy side (#1767). `planemo test` then printed nothing for about 41 hours, until the job was killed externally. No `tool_test_output.json` was written and there was no clue which repository was stuck. `--test_timeout` doesn't cover installs, and nothing else does either. The admin `GalaxyInstance` planemo hands to ephemeris has no request timeout. Ephemeris only falls back to its one-hour `wait_for_install` polling after a 504 or an aborted connection, and a request that simply never returns produces neither.

**With this change, a hung install fails after `--shed_install_timeout` seconds (default one hour), naming the repository:**

```
Timed out after 3600 seconds installing repository card/rgi at revision 84bd24ac33fd from https://toolshed.g2.bx.psu.edu/.
Failed to install one or more repositories.
```

**This doesn't fix why the `card/rgi` install hung (#1767); it stops planemo from waiting on it forever.** A single install request that legitimately takes longer than an hour now fails too; raise `--shed_install_timeout` for slow Galaxies.

**A timeout is an ordinary install failure.** The repository is counted as errored, so `--ignore_dependency_problems` warns and continues exactly as it does for any other failed install, and the remaining repositories still install. Simply setting a timeout on the client wouldn't be enough: bioblend raises `requests.exceptions.ReadTimeout`, which isn't the `ConnectionError` ephemeris handles. It would escape and abort every remaining install without naming the stuck one.

**The timeout is per Galaxy API request, not a total budget for all installs.** It applies to every request made while installing (`test`, `run`, `serve` and friends, and `shed_test`, including `shed_test`'s install-status polling), and the admin client's timeout is restored afterwards. `shed_test` names the repository the same way; a hung status poll there raises the bare request timeout, since it isn't tied to one repository. A 504 still goes through ephemeris's own one-hour polling as before; by reading the code, that path is bounded at roughly timeout plus one hour (not tested).

**This does not make install failures show up in `tool_test_output.json`.** No install failure, timeout or otherwise, reaches test output today: `planemo test` raises before writing it. That's left for a follow-up.

<details><summary>Implementation</summary>

- `--shed_install_timeout` is added to `engine_options` (`test`, `run`), `galaxy_serve_options` (`serve` and serve-based commands) and `shed_test`. It defaults to the existing `DEFAULT_TOOL_INSTALL_TIMEOUT`, which moved from `galaxy/config.py` to `galaxy/workflows.py`.
- `_install_shed_repos_from_tools_info` sets the timeout on the admin client for the install/update calls and restores the previous value in a `finally`.
- `_TimeoutInstallRepositoryManager` subclasses ephemeris's `InstallRepositoryManager` and overrides `install_repository_revision`, turning `requests.exceptions.Timeout` into an `"error"` result plus the log line above. The overridden method and its `self.gi` attribute are unchanged back to ephemeris 0.10.3, the current floor.
- For `shed_test`, `BaseGalaxyConfig.gi` builds a new client on every access. `install_repo` and `wait_for_all_installed` therefore share one timeout-bearing Tool Shed client instead of setting a timeout on a throwaway instance. `install_repo` re-raises a timeout with the same message (`install_timeout_message`).

</details>

**Tested against a fake Galaxy whose install request (or status request) never answers; no live Galaxy install was run.** `tests/test_shed_install_timeout.py` covers five cases: the workflow install path raising with the repository named, the same path under `ignore_dependency_problems`, a hung repository followed by one that installs, `shed_test`'s `install_repo`, and `shed_test`'s status poll. On `master`, the workflow install call against the fake Galaxy was still blocked after 10 seconds, and the process couldn't exit. The two `shed_test` tests hang on the code before their fixes. With this branch all five pass in about 8 seconds. `make lint` passes.

## Risks

Risks are minimal - this change doesn't lock the project into particular difficult to change choices (a two-way door). The one behavior change to weigh: a single install request taking longer than an hour now fails where it previously waited indefinitely. `--shed_install_timeout` raises the limit.

## Context

Ephemeris could also treat a request timeout like a 504 and fall back to `wait_for_install`. That would be a complementary upstream improvement, but this fix doesn't need it.

## Agentic Checks

### ✅ Normal review

<details><summary>Found that the <code>shed_test</code> timeout was set on a throwaway client; fixed and tested.</summary>

`BaseGalaxyConfig.gi` returns a new `GalaxyInstance` per access, so the first version's `shed_test` timeout never reached the request. Also wired the option into `shed_test`, reworded the help as a per-request limit, and confirmed ephemeris 0.10.3 compatibility. Generated command docs were left for release-time regeneration.

[Full report](https://galaxy-brain.jmchilton.net/repositories/planemo/branches/shed_install_timeout/subagents/normal_review/). Run via claude-opus-5-5 at low effort.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural changes needed; approved as-is.</summary>

Considered and declined: bundling the positional install settings into an object (outside this fix) and a dedicated install client (the scoped set-and-restore is tested). Its third point, an unnamed `shed_test` timeout, was later addressed by sharing one message helper.

[Full report](https://galaxy-brain.jmchilton.net/repositories/planemo/branches/shed_install_timeout/thermo_nuclear_review/). Run via claude-opus-5-5 at low effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>Found that <code>shed_test</code> status polling could still hang; fixed and tested.</summary>

`wait_for_all_installed` polled through a fresh client with no request timeout, so a hung status request could outlast the `wait_on` deadline. It now shares the timeout-bearing client, with a test whose status request never answers.

[Full report](https://galaxy-brain.jmchilton.net/repositories/planemo/branches/shed_install_timeout/codex_review/). Run via gpt-6.1-sol (Codex reported reasoning effort "none").

</details>
