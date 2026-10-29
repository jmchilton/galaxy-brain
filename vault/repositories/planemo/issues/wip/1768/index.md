# planemo#1768 — Tool Shed repository installs have no timeout

[Issue](https://github.com/galaxyproject/planemo/issues/1768)

Root cause verified against `origin/master` `cd2c1944` with ephemeris 0.10.11 / bioblend 1.9.0: planemo hands ephemeris an admin `GalaxyInstance` with `timeout=None`; ephemeris's `wait_for_install(timeout=3600)` fallback only triggers on a `ConnectionError` mentioning `504` or `Connection aborted`, so a POST that never returns blocks forever. Setting a client timeout alone isn't enough: bioblend raises `requests.exceptions.ReadTimeout` (not a `ConnectionError`), which escapes ephemeris's per-repository handling and aborts the whole install loop without naming the repository.

Correct repository: the timeout belongs to the client planemo owns. A complementary ephemeris change (treat `Timeout` like a 504 and fall into `wait_for_install`) would be nice but isn't required.

Addressed by branch [`shed_install_timeout`](../../../branches/active/shed_install_timeout/index.md).

## Scope decisions

- Recording install failures in `tool_test_output.json`: out of scope. No install failure (timeout or otherwise) reaches test output today — `planemo test` raises before writing it. Follow-up candidate.
