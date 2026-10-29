Run via claude-opus-5-5 at low effort.

Acted on the P1 (shed_test `install_repo` timeout was set on a throwaway `GalaxyInstance`, because `BaseGalaxyConfig.gi` builds a new one per access), the missing `--shed_install_timeout` on `shed_test`, and the help-text wording (per request, not per repository). Verified ephemeris 0.10.3 keeps `self.gi` and `install_repository_revision(self, repository, log)`. Added a `shed_test`-path test; it hangs against the pre-fix `install_repo` and passes after. Fixed in `90852d38`.

Not acted on:

- 504 path can take timeout + ephemeris's hardcoded 1h `wait_for_install`: still bounded; a planemo-side cap would mean reimplementing ephemeris's fallback.
- Pass the timeout into the manager instead of reading `self.gi.timeout`: the admin client isn't shared across threads here.
- Generated `docs/commands/*.rst`: regenerated at release time.
- `default=DEFAULT_TOOL_INSTALL_TIMEOUT` on the option: keeps `options.py` free of Galaxy-module imports; the help text states the default.
- First-commit tests red via `TypeError` on base: the hang itself was confirmed on base separately (see `implementation_debrief.md`).

<details><summary>Full review</summary>

- **P1** `install_repo` timeout ineffective — `config.py` `gi` property returns a fresh `GalaxyInstance`; `self.gi.timeout = ...` and `self.tool_shed_client` use different instances. Fix: hold one instance for the call; add a test.
- **P2** `shed_test` lacks `--shed_install_timeout` (`cmd_shed_test.py` uses neither `engine_options` nor `galaxy_serve_options`).
- **P2** Per-request timeout also covers lookup requests (`filter_installed_repos`, `get_repositories`, `complete_repo_information`); fine. 504 path may take timeout + 1h. Help text "for each repository" slightly inaccurate.
- **P2** Override relies on `install_repository_revision(self, repository, log)` and `self.gi`; confirm back to ephemeris 0.10.3 or raise the floor.
- **P3** Error message reads `self.gi.timeout`; pass the timeout in for robustness.
- **P3** Tests are not flaky; `do_GET` returning `[]` for all GETs is loose but sufficient.
- **P3** Generated command docs missing the option.
- **P3** `or DEFAULT` fallback fine since `IntRange(1)` excludes 0; could set the click default instead.

</details>
