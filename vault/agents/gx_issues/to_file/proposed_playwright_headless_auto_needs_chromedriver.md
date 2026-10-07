**Title:** Playwright E2E backend with default headless setting fails unless chromedriver or geckodriver is on PATH

The Playwright E2E backend can't start with default settings on a Playwright-only machine: it fails asking for Selenium's chromedriver/geckodriver, which Playwright never uses.

```console
$ GALAXY_TEST_DRIVER_BACKEND=playwright PYTHONPATH=lib python -c \
    "from galaxy_test.selenium import framework as f; f.get_configured_driver()"
...
  File "lib/galaxy_test/selenium/framework.py", line 1570, in get_configured_driver
    headless=headless_selenium(),
  File "lib/galaxy_test/selenium/framework.py", line 1582, in headless_selenium
    or driver_factory.get_local_browser(GALAXY_TEST_SELENIUM_BROWSER) == "CHROME"
  File "lib/galaxy/selenium/driver_factory.py", line 192, in get_local_browser
    raise Exception("Selenium browser is 'auto' but neither geckodriver or chromedriver are found on PATH.")
Exception: Selenium browser is 'auto' but neither geckodriver or chromedriver are found on PATH.
```

Run on current `dev` (02a2e659909), with `GALAXY_TEST_SELENIUM_HEADLESS` and `GALAXY_TEST_SELENIUM_BROWSER` left at their `auto` defaults, no `pyvirtualdisplay`, and no Selenium drivers on `PATH`. No browser is launched and no Galaxy server is needed to see it. Setting `GALAXY_TEST_SELENIUM_HEADLESS=1` works around it.

With only geckodriver on `PATH` the call doesn't fail. It returns `headless=False`, which is passed straight to Playwright's `launch(headless=...)`, so a visible Chromium window opens.

| `PATH` has (no `pyvirtualdisplay`) | `headless_selenium()` with Playwright backend | expected |
|---|---|---|
| chromedriver | `True` | `True` |
| geckodriver only | `False` (headed Chromium) | `True` |
| neither | raises | `True` |

The Playwright CI workflow sets `GALAXY_TEST_SELENIUM_HEADLESS: 1`, and Selenium dev machines have chromedriver, so the bug stays hidden. You only hit it running Playwright with the defaults on a machine set up just for Playwright.

<details><summary>Why it happens</summary>

- `headless_selenium()` (`lib/galaxy_test/selenium/framework.py` L1575) resolves `auto` by calling `driver_factory.get_local_browser(...)`. That function only works for Selenium: it looks for `chromedriver`/`geckodriver` on `PATH` and raises if it finds neither (`lib/galaxy/selenium/driver_factory.py` L185).
- Playwright resolves the browser on its own, through `get_playwright_browser_type("auto")`, which returns `"chromium"` (driver_factory L225), and `get_playwright_driver()` launches it with whatever `headless` it was given (driver_factory L291). It runs headless without needing a display.
- The sibling `use_virtual_display()` (framework L1591) already checks `GALAXY_TEST_DRIVER_BACKEND == "selenium"` before using the Selenium-only logic. `headless_selenium()` has no such check.

</details>

## Context

This dates back to when the Playwright backend was added in 🔀 #21102. That PR guarded `use_virtual_display()` by backend but not `headless_selenium()`.

## Proposed Approach

In `headless_selenium()`, when the setting is `auto` and the backend is Playwright, return `True` before doing any of the Selenium driver checks. This mirrors the existing check in `use_virtual_display()`.

<details><summary>Sketch and test</summary>

```diff
 def headless_selenium():
     if asbool(GALAXY_TEST_SELENIUM_REMOTE):
         return False

     if GALAXY_TEST_SELENIUM_HEADLESS == "auto":
+        if GALAXY_TEST_DRIVER_BACKEND == "playwright":
+            return True
         if (
             driver_factory.is_virtual_display_available()
             or driver_factory.get_local_browser(GALAXY_TEST_SELENIUM_BROWSER) == "CHROME"
         ):
```

Add a unit test in `test/unit/selenium/` that monkeypatches the module-level settings and `driver_factory._which` so neither driver is found. It should assert that `headless_selenium()` is `True` for Playwright and still raises for Selenium.

</details>

## Alternative Approaches

Another option is to resolve `auto` through the backend's own browser mapping, or to make `get_local_browser` aware of the backend. The proposed check is a smaller change, matches the existing `use_virtual_display()` guard, and leaves Selenium's behavior exactly as it is.

<details><summary>Alternatives In Detail</summary>

### Alternative: Make `get_local_browser` aware of the backend

<details><summary>Description</summary>

#### Details

Pass the backend into `driver_factory.get_local_browser()` and skip the `PATH` checks for Playwright.

#### Why the proposed approach is preferred

`get_local_browser()` is a Selenium helper that `get_local_driver()` also uses. Adding Playwright handling to it mixes two concerns in one function. Whether to run headless is a test-framework decision, and it belongs next to the guard `use_virtual_display()` already has.

</details>

### Alternative: Only document setting `GALAXY_TEST_SELENIUM_HEADLESS` for Playwright

<details><summary>Description</summary>

#### Details

Tell Playwright users to always set `GALAXY_TEST_SELENIUM_HEADLESS` explicitly.

#### Why the proposed approach is preferred

The default should work. Without a fix, the geckodriver-only case still silently opens a headed browser.

</details>

</details>
