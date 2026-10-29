Run via claude-opus-5-5 at low effort.

I made no code changes. The branch is small and direct, and I found no structural regression worth a commit. Lint and `tests/test_shed_install_timeout.py` pass (3 passed).

Findings I didn't act on, and why:

- **`install_timeout` is passed positionally through three functions.** This adds to the long run of positional `self._kwds.get(...)` arguments in `config.py`. Bundling the install settings into one options object would be a cleaner model. That is a pre-existing pattern and a refactor beyond #1768's scope.
- **`_install_shed_repos_from_tools_info` mutates the caller's `admin_gi.timeout` and restores it in `finally`.** This is non-atomic shared-state mutation. It is scoped tightly, restored reliably, and tested (`timeout is None` after the call). A dedicated client would require a new `gi` factory argument, which costs more than it saves.
- **A shed_test `install_repo` timeout raises a raw `requests.exceptions.Timeout` that doesn't name the repository.** The workflow path does name it. Callers already see the failure and the Galaxy log. Wrapping it would duplicate the subclass's message logic for a single call site.
- **`test_shed_test_install_repo_times_out` builds `BaseGalaxyConfig` through `__new__` and sets private attributes.** This is brittle, but it is the cheapest way to exercise the real `install_repo` against a hanging server. Acceptable for a regression test.
- **`config.py` (1844 lines) and `workflows.py` (1189 lines) are over 1k lines.** Both were already over 1k before this branch. The net growth is small, so no decomposition is required.

<details><summary>Full review</summary>

**Structure.** The fix lives in the right layers:
- The CLI option is in `options.py`, with no Galaxy imports: `default=None`, and the fallback is resolved in `BaseGalaxyConfig.shed_install_timeout`.
- The timeout policy is a single property on the config.
- The error translation is an ephemeris `InstallRepositoryManager` subclass that overrides exactly one method.

That subclass is the code-judo move. It keeps the existing ephemeris errored-repo flow, so `ignore_dependency_problems` and `FAILED_REPOSITORIES_MESSAGE` work unchanged with no new branches.

**Constant relocation.** `DEFAULT_TOOL_INSTALL_TIMEOUT` moves to `workflows.py` and is imported back into `config.py`. This is correct because `workflows.py` is the lower layer. It also lets `wait_for_all_installed` and the per-request timeout share one setting, which is a sensible unification.

**`install_repo`.** The comment explains a non-obvious fact: `self.gi` builds a new client on each access. Keep it. The previously used `tool_shed_client` property is still used by `wait_for_all_installed`, so nothing is orphaned.

**Spaghetti check.** The branch adds no new conditionals to shared flows. The large hunk in `_install_shed_repos_from_tools_info` only re-indents the existing body under `try`/`finally`.

**Types.** `install_timeout: float` is annotated on the typed functions. `install_shed_repos` stays untyped, matching its siblings.

**Minor.** The error message reads `self.gi.timeout`, so it reports the timeout that actually applied, not the configured one. This is correct, given the save/restore.

Verdict: approve as-is. The items above are optional follow-ups at most.

</details>
