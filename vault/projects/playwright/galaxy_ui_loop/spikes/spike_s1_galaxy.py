"""Spike S1, part 2: refs, dialogs, and NavigatesGalaxy + playwright-cli on a live Galaxy page.

Needs a Galaxy lib with the selenium_context_timeout_handler fix on PYTHONPATH.
The debugging port is injected by wrapping BrowserType.launch - the spike stand-in for a
driver_factory option.
"""

import json
import re
import time

from playwright.sync_api._generated import BrowserType

from galaxy.selenium.context import GalaxySeleniumContextImpl
from spike_s1 import cli, PAGE, PORT

_launch = BrowserType.launch
BrowserType.launch = lambda self, **kwds: _launch(self, **{**kwds, "args": [f"--remote-debugging-port={PORT}"]})

result = {}
ctx = GalaxySeleniumContextImpl(
    {"driver": {"backend_type": "playwright", "headless": True}, "local_galaxy_url": "https://test.galaxyproject.org"}
)
page = ctx.configured_driver.driver_impl.page
try:
    assert cli("attach", f"--cdp=http://127.0.0.1:{PORT}")[0] == 0

    # 1. Ref-based click: snapshot ref from the CLI, click by ref, Python observes.
    page.set_content(PAGE)
    _, out = cli("snapshot")
    ref = re.search(r'button "Increment" \[ref=(\w+)\]', out).group(1)
    rc, _ = cli("click", ref)
    result["ref_click"] = {"ref": ref, "rc": rc, "python_count": page.locator("#count").text_content()}

    # 2. Dialog while both are attached: Python has no handler (auto-dismiss); CLI tracks modal state.
    page.evaluate("() => { window.answer = 'pending'; setTimeout(() => { window.answer = confirm('S1?'); }, 100); }")
    time.sleep(1)
    _, out = cli("snapshot")
    result["dialog"] = {
        "python_sees_answer": page.evaluate("() => window.answer"),
        "cli_reports_modal": "Modal state" in out,
    }
    if "Modal state" in out:
        result["dialog"]["cli_accept"] = cli("dialog-accept")[1][:200]
        result["dialog"]["python_sees_answer_after"] = page.evaluate("() => window.answer")

    # 3. NavigatesGalaxy on live Galaxy, CLI observing and acting on the same page.
    ctx.home()
    ctx.components.masthead.login_masthead_button.wait_for_visible()
    _, out = cli("find", "Login")
    result["cli_finds_login_after_python_home"] = "Login" in out
    rc, out = cli("click", '[data-description="login masthead button"]')
    time.sleep(1)
    result["python_url_after_cli_click"] = page.url
    ctx.components.login.form.wait_for_visible()  # smart component wait on the CLI-driven navigation
    result["python_sees_login_form"] = True
finally:
    cli("detach")
    ctx.configured_driver.quit()
print(json.dumps(result, indent=2))
