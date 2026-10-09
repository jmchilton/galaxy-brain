Fix `galaxy.selenium.context.init()` and the Jupyter browser automation contexts, which have raised `TypeError` since 🔀 #21102.

On `dev`, every way of building a standalone Galaxy browser context fails before any browser starts:

```python
>>> from galaxy.selenium import jupyter_context
>>> jupyter_context.init({"driver": {"backend_type": "playwright", "headless": True}})
TypeError: ConfiguredDriver.__init__() missing 1 required positional argument: 'timeout_handler'
```

| Entry point | `dev` | This PR |
| --- | --- | --- |
| `galaxy.selenium.context.init()` | `TypeError` 😬 | ✅ |
| `galaxy.selenium.jupyter_context.init()` | `TypeError` 😬 | ✅ |
| `galaxy_test.selenium.jupyter_context.init()` (`make serve-selenium-notebooks`) | `TypeError` 😬 | ✅ |
| `timeout_multiplier` in the context config | ignored | applied to every wait |

#21102 made `ConfiguredDriver` require a `timeout_handler`, but `GalaxySeleniumContextImpl` still built it from the YAML/dict `driver` section alone, and a config file can't supply a callable. The fix passes `galaxy_timeout_handler(timeout_multiplier)`, as the test framework (`framework.py`) and the CLI (`cli.py`) already do, through the existing `ConfiguredDriver.from_dict`. That one change also makes `timeout_multiplier` work again. Since #21102 waits go through the driver's timeout handler, so the context's stored multiplier was never read.

***This only affects driving Galaxy from notebooks and scripts. The Selenium and Playwright test suites build their drivers in `framework.py` and never hit this path.***

***It restores building the context and its wait timeouts. The notebooks themselves aren't otherwise changed.***

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Context

Fixes a regression from 🔀 #21102 (Playwright backend support). Found while planning a Galaxy UI automation skill that drives Galaxy through this context.

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? A working context instead of a `TypeError`. Real failures are now browser-launch errors from `ConfiguredDriver`, as in the test framework.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They check that a configured `timeout_multiplier` scales the waits the context really uses.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `test/unit/selenium/test_context.py::test_jupyter_init_from_config` goes through both Jupyter `init()`s (`galaxy.selenium` and `galaxy_test.selenium`) with a real `ConfiguredDriver` and only the Playwright launch stubbed, so it runs in unit CI, which installs no Playwright browsers. On `dev` both cases fail with the `TypeError` above.
- `test_context_from_dict` builds the context directly with a real headless Chromium. It's skipped unless a Playwright browser is installed, so it runs locally but not in CI. It was also red on `dev` with the same `TypeError`.
- `test_driver_factory.py` passes, apart from three Selenium factory tests that need `chromedriver` on `PATH`.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
