"""Spike S1, part 3: with a passive Python dialog listener, does the CLI get the dialog?"""

import json
import time

from playwright.sync_api import sync_playwright

from spike_s1 import cli, PAGE, PORT

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=[f"--remote-debugging-port={PORT}"])
    page = browser.new_page()
    page.set_content(PAGE)
    seen = []
    page.on("dialog", lambda dialog: seen.append(dialog.message))  # listener present: no auto-dismiss
    cli("attach", f"--cdp=http://127.0.0.1:{PORT}")
    try:
        page.evaluate("() => { window.answer = 'pending'; setTimeout(() => { window.answer = confirm('S1?'); }, 100); }")
        time.sleep(1)
        _, out = cli("snapshot")
        result = {"python_listener_saw": seen, "cli_reports_modal": "Modal state" in out}
        if "Modal state" in out:
            _, accepted = cli("dialog-accept")
            result["cli_dialog_accept_ok"] = "Error" not in accepted
            time.sleep(0.3)
        result["answer"] = page.evaluate("() => window.answer")
    finally:
        cli("detach")
        browser.close()
print(json.dumps(result, indent=2))
