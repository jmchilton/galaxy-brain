"""Spike S1: can Python Playwright (Galaxy's 1.63) and playwright-cli (attach --cdp) drive one page?

Variants:
  launch     - browser.launch(args=[--remote-debugging-port]) + browser.new_page()  (what driver_factory does today)
  persistent - launch_persistent_context(user_data_dir, args=[--remote-debugging-port])  (default context)
Each in headless and headed mode. For each: CLI attaches, sees Python's page, clicks a button,
Python observes the click; Python mutates the DOM, CLI observes it; CLI detaches, Python keeps going.
"""

import json
import os
import subprocess
import sys
import tempfile
import time

from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
HARNESS = os.environ.get("GXUI_LOOP_HOME", os.path.expanduser("~/.cache/gxui-loop"))  # holds node_modules
PORT = 9333
PAGE = """<html><head><title>S1 fixture</title></head><body>
<h1>S1 fixture</h1>
<button id="btn" onclick="document.getElementById('count').textContent = String(Number(document.getElementById('count').textContent) + 1)">Increment</button>
<span id="count">0</span>
<div id="from-python"></div>
</body></html>"""


def cli(*args, session="s1"):
    result = subprocess.run(
        ["npx", "--no-install", "playwright-cli", f"-s={session}", *args],
        cwd=HARNESS,
        capture_output=True,
        text=True,
        timeout=60,
        env={**os.environ, "PWTEST_DAEMON_SESSION_DIR": os.path.join(HARNESS, ".daemon")},
    )
    return result.returncode, result.stdout + result.stderr


def check(variant, headless):
    outcome = {"variant": variant, "headless": headless}
    args = [f"--remote-debugging-port={PORT}"]
    with sync_playwright() as p:
        if variant == "launch":
            browser = p.chromium.launch(headless=headless, args=args)
            page = browser.new_page(viewport={"width": 1280, "height": 1000})
            closer = browser.close
        else:
            context = p.chromium.launch_persistent_context(
                tempfile.mkdtemp(prefix="s1-profile-"), headless=headless, args=args, viewport={"width": 1280, "height": 1000}
            )
            page = context.pages[0] if context.pages else context.new_page()
            closer = context.close
        page.set_content(PAGE)
        try:
            rc, out = cli("attach", f"--cdp=http://127.0.0.1:{PORT}")
            outcome["attach_rc"] = rc
            rc, out = cli("tab-list")
            outcome["cli_tabs"] = [line.strip() for line in out.splitlines() if line.strip().startswith("-")]
            rc, out = cli("snapshot")
            outcome["cli_sees_fixture"] = "S1 fixture" in out
            rc, out = cli("click", "#btn")
            outcome["cli_click_rc"] = rc
            time.sleep(0.3)
            outcome["python_sees_cli_click"] = page.locator("#count").text_content() == "1"
            page.evaluate("document.getElementById('from-python').textContent = 'hello from python'")
            rc, out = cli("snapshot")
            outcome["cli_sees_python_change"] = "hello from python" in out
            rc, out = cli("eval", "() => window.innerWidth")
            outcome["cli_viewport_width"] = out.split("### Result")[-1].split("###")[0].strip() if "### Result" in out else out[-200:]
            rc, out = cli("detach")
            outcome["detach_rc"] = rc
            page.locator("#btn").click()
            outcome["python_works_after_detach"] = page.locator("#count").text_content() == "2"
            outcome["python_viewport_after"] = page.evaluate("() => window.innerWidth")
        except Exception as e:  # report, don't abort the other variants
            outcome["error"] = repr(e)
            cli("detach")
        finally:
            closer()
    return outcome


if __name__ == "__main__":
    modes = [(v, h) for v in ("launch", "persistent") for h in (True, False)]
    if len(sys.argv) > 1:
        modes = [m for m in modes if m[0] == sys.argv[1]]
    for variant, headless in modes:
        print(json.dumps(check(variant, headless)), flush=True)
