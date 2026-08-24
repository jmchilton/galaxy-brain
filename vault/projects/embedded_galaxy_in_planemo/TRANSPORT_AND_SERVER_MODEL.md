# Transport and Server Model

How the embedded engine gets a running Galaxy and how Planemo talks to it. Scoped to the `embedded_galaxy` engine; see `PROBLEM_AND_GOAL.md` for the engine itself and `HANDLING_PACKAGE_VERSIONS.md` for how Galaxy gets installed.

## Decision

Run Galaxy over real HTTP on a loopback socket.

This preserves Planemo's existing boundary: `ensure_runnables_served` yields a real `galaxy_url`, and BioBlend, tool-test interaction, invocation polling, progress reporting, and user-facing links continue unchanged. An in-process ASGI transport would require invasive or process-global monkeypatching because BioBlend and `galaxy.tool_util.verify.interactor` do not expose a transport injection point. Loopback latency is negligible beside Planemo's 250 ms polling interval.

## Ownership boundary

Galaxy owns application assembly. Planemo owns the embedded server lifecycle.

Galaxy now provides `galaxy.webapps.galaxy.fast_factory.build_galaxy_web_app()`. Given programmatic configuration, it returns a bundle containing:

- the `UniverseApplication`;
- the WSGI application;
- the FastAPI/ASGI application.

The same builder is used by Galaxy's production factory and test driver. It does not bind a socket or hide initialization failures. If WSGI or ASGI assembly fails after constructing Galaxy, it shuts down the partial application and re-raises the original exception.

Planemo should call this API with `register_shutdown_at_exit=False`, then own:

- translating Planemo options into Galaxy configuration;
- selecting and binding the loopback port;
- running uvicorn on a dedicated thread and event loop;
- readiness polling;
- cooperative server and Galaxy shutdown.

This is the reusable seam. Planemo should not reimplement Galaxy's WSGI/ASGI assembly, and Galaxy should not absorb Planemo's configuration policy or process lifecycle.

## Configuration

Supply only the settings Planemo actually controls. In particular, leave `tool_path`, `static_dir`, and other checkout-root-derived paths unset so Galaxy's package-aware defaults resolve bundled tools and web assets.

Do not depend on `galaxy-test-driver` from Planemo. Galaxy's test driver now consumes the shared builder, but the package still carries test dependencies and checkout-specific configuration helpers that Planemo does not need.

Interactive tools remain out of scope. They require callback infrastructure, gx-it-proxy state, and Galaxy's Gravity subprocess path; the embedded engine continues to behave as `--disable_gxits`.

## Planemo implementation

Until [Galaxy PR #23350](https://github.com/galaxyproject/galaxy/pull/23350) is merged and included in a Galaxy package release, all Planemo prototype and integration work must use a Galaxy branch containing that change. Released Galaxy packages without `build_galaxy_web_app()` cannot exercise this design. Once the API is released, Planemo can replace the branch dependency with the corresponding minimum Galaxy package version.

1. Build the minimal Galaxy configuration from Planemo's existing option mapping, omitting checkout-root settings.
2. Call `build_galaxy_web_app(..., register_shutdown_at_exit=False)`.
3. Start the returned ASGI app with uvicorn on a loopback socket and wait for `/api/version` to answer.
4. Yield the existing `GalaxyConfig` shape with `galaxy_url`, `master_api_key`, `user_api_key`, and `gi`; downstream consumers should not change.
5. On exit, stop and join uvicorn, then call `galaxy_app.shutdown()`.

## Verification

The checkout-free premise is now verified in Galaxy's package test. It installs coherent Galaxy wheels, changes into an empty temporary directory, constructs the application through `build_galaxy_web_app()`, confirms bundled tools resolve from `site-packages`, and receives HTTP 200 from `/api/version`.

The remaining Planemo acceptance test is a `planemo test` run against a trivial tool with `--engine embedded_galaxy`, asserting the same result payload as the managed engine. That test covers Planemo's configuration translation and uvicorn lifecycle; it does not need to retest Galaxy's application assembly in isolation.

## Remaining lifecycle questions

These belong in `PROCESS_LIFECYCLE.md`:

- Should uvicorn stay on a dedicated thread with its own event loop, matching Galaxy's test driver?
- Should Planemo bind an already-open socket instead of probing and closing a port before uvicorn binds, avoiding the current race?
- What shutdown timeouts and diagnostics should apply if uvicorn or Galaxy threads do not exit cooperatively?
