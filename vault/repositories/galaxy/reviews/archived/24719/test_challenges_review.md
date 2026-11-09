# Test challenges review: #24719

Profile: gx_test_challenger. Model: claude-opus-5-5. Effort: medium. Reviewed commit: `e2c3677d3ae`.

Raw notes and test plan: [test_challenges_debrief.md](test_challenges_debrief.md). No bugs found in passing. New tests were not run locally (no venv or `node_modules` in the worktree); `Unit tests`, `client-unit-test` and `galaxy_api` pass on CI.

## P2 1: Non-default server config is only tested against a fake, and that test can't catch swapped arguments

The PR exists for servers that change these options, but no test boots Galaxy with them. The only serializer-level test, `test/unit/app/managers/test_ConfigSerializer.py`, uses a `SimpleNamespace` config, and its rows repeat cases from `test_effective_duration_matches_new_targets`.

Those rows also miss the one thing the file could add. `effective_storage_duration` returns the smaller value whenever both are set, so swapping `default` and `maximum` in the serializer lambda leaves all three rows green, and the API test too:

| default, maximum | Correct | Swapped |
| --- | --- | --- |
| 86400, 0 (API test, unit row) | 86400 | 86400 |
| 604800, 86400 (unit row) | 86400 | 86400 |
| None, 3600 (unit row) | 3600 | 3600 |
| 172800, 0 (untested here) | 172800 | 86400 |

The last row is the PR's manual test step 2. The PR also claims the API "cannot drift" from what the server does, but `new_target` gets its values through separate wiring in `lib/galaxy/app/__init__.py`, which nothing compares against the API.

Custom config is what `writing_tests.md` routes to integration tests. Drop the unit file and add `test/integration/test_short_term_storage_configuration.py`, following `test_subdomain_switcher_configuration.py`, comparing the API with a real target from the running app (`self._app[ShortTermStorageAllocator]`, as `test_celery_tasks.py:91` does).

<details><summary>Sketch (not run)</summary>

```python
from galaxy.short_term_storage import ShortTermStorageAllocator
from galaxy_test.driver import integration_util


class _BaseEffectiveDurationIntegrationTestCase(integration_util.IntegrationTestCase):
    def assert_api_and_new_targets_report(self, expected: int):
        response = self.galaxy_interactor.get("configuration")
        response.raise_for_status()
        assert response.json()["short_term_storage_effective_duration"] == expected
        allocator = self._app[ShortTermStorageAllocator]  # type: ignore[type-abstract]
        assert allocator.new_target("a.txt", "text/plain").duration == expected


class TestEffectiveDurationNoMaximum(_BaseEffectiveDurationIntegrationTestCase):
    @classmethod
    def handle_galaxy_config_kwds(cls, config):
        super().handle_galaxy_config_kwds(config)
        config["short_term_storage_default_duration"] = 172800

    def test_uses_the_default(self):
        self.assert_api_and_new_targets_report(172800)


class TestEffectiveDurationCapped(_BaseEffectiveDurationIntegrationTestCase):
    @classmethod
    def handle_galaxy_config_kwds(cls, config):
        super().handle_galaxy_config_kwds(config)
        config["short_term_storage_default_duration"] = 604800
        config["short_term_storage_maximum_duration"] = 3600

    def test_caps_at_the_maximum(self):
        self.assert_api_and_new_targets_report(3600)
```

The base class holds only helpers, like `_BaseUserExposeIntegrationTestCase` in `test_config_options_users.py`.

</details>

## P3 1: No browser test connects the API key to the dialog

Nothing in `lib/galaxy_test` or the navigation files touches this dialog, which predates the PR. Here the gap matters because `GalaxyConfiguration` is `any`: a mismatch in the `short_term_storage_effective_duration` string between `configuration.py` and the Vue file passes typing, Vitest (which mocks the key) and the API test.

Add `test/integration_selenium/test_export_to_another_galaxy.py` with `short_term_storage_default_duration: 172800`, following the PR's manual steps 1-2: expand a dataset, click export, wait for the link, assert "usually after 2 days". `IntegrationTestCase` already enables Celery. This needs a `navigation.yml` entry for the export button and the link input. Priority is P3 since the change is one sentence of text.

## P3 2: `formatDurationSeconds` rounding is unpinned

Every row in `duration.test.ts` is an exact multiple of its unit, so removing `Math.round` or `Math.max(1, ...)` fails nothing. Add rows for the rounding and sub-minute floor. Observed values: `10` gives "1 minute", `90` gives "2 minutes", `5400` gives "2 hours", `216000` gives "3 days".

## P3 3: Explicit `duration` argument of the new helper is untested

`effective_storage_duration` takes `duration` first in its `or` chain, and `new_target` passes it through, but no test passes one. Dropping it from the chain fails nothing. No production caller passes it today, which is why the gap is minor. This code moved in the PR, so add rows such as `(duration=300, default=86400, maximum=0) -> 300` and `(duration=7200, default=86400, maximum=3600) -> 3600`.
