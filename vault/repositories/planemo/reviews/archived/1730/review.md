# Planemo PR #1730 — Keep localhost as advertised GxIT URL when binding 0.0.0.0

PR: https://github.com/galaxyproject/planemo/pull/1730

Reviewed head: `279b8561a2f597f1d8d5b4330b3d18b6c7d7eaeb`.
Base: merge-base with `origin/master`, `b1002b01f871b55a3dc0c7523b9d423c20e60eef`.
Worktree: `/Users/jxc755/projects/worktrees/planemo/pr/1730`.

## Verdict

No actionable correctness findings. The local Galaxy configuration keeps the bind address separate from the advertised hostname, and the new override works through the existing CLI/global configuration abstraction. Suitable to merge within its local-development scope.

## Evidence

- `planemo/galaxy/config.py:595–598` maps wildcard and IPv4 loopback binds to `localhost`, or uses the explicit override. Gunicorn still binds to the original host at line 628. Galaxy's `InteractiveToolManager.target_if_active()` uses `interactivetools_proxy_host` for the browser URL, confirming that replacing `*.interactivetool.0.0.0.0` addresses the reported browser failure.
- `planemo/options.py:255–268,1577` exposes the option through the common serve options and `planemo_option(use_global_config=True)`. Four CLI-to-generated-config probes verified wildcard default, explicit CLI override, `default_infrastructure_host` from the global configuration, and CLI precedence over that default. All retained `0.0.0.0:9090` as the Gunicorn bind and generated the expected infrastructure URL and proxy hostname in the serialized configuration.
- Seven GxIT configuration tests passed using the existing Planemo virtual environment with imports confirmed to resolve to this worktree. Command: `/Users/jxc755/projects/repositories/planemo/.venv/bin/python -m pytest -q -p no:cacheprovider tests/test_galaxy_config.py -k gxits`.
- The existing custom-host test now uses `example.org`, preserving coverage of unchanged non-loopback behavior; wildcard behavior gets a separate test. No assertions were weakened to mask a failure.

## Container callback caveat

`galaxy_infrastructure_url` also supplies `$__galaxy_url__` to tools and Galaxy's optional container-monitor callback URL. A literal `localhost` inside an ordinary bridged container addresses that container, so the remap alone does not make arbitrary direct API clients reach the host.

This does not establish a regression introduced by this PR: the previous `0.0.0.0` value was also unsuitable as a general container-to-host URL. The author's tested `galaxy_ie_helpers.get_galaxy_connection()` explicitly tries the advertised URL and then falls back to the Docker default gateway with `GALAXY_WEB_PORT`. The [helper's source](https://github.com/bgruening/galaxy_ie_helpers/blob/master/galaxy_ie_helpers/__init__.py) confirms that fallback. Binding Galaxy to `0.0.0.0` makes the fallback reachable while advertising `localhost` fixes browser resolution. The new override supports deployments that have a hostname reachable by both clients.

## Validation limits

Did not launch a real Galaxy, GxIT proxy, browser, or Docker tool container. Container reachability conclusions are based on Galaxy consumers and the referenced helper source, together with the author's documented manual test. The CLI probes replaced server startup with configuration generation; they exercised actual option parsing and serialized configuration, not a running server.

The first restricted test run failed on the existing `get_free_port()` socket binding because of sandbox permissions. The same tests passed with that sandbox restriction lifted. Source was not changed and no review was posted to GitHub.

The Docker-Galaxy engine follows a separate pre-existing configuration path and does not consume this new local-Galaxy override. This PR addresses locally served Galaxy with Dockerized interactive tools; it does not establish Docker-Galaxy support for the option.
