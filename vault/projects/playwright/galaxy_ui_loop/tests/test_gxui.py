"""gxui tests. Run with a Galaxy venv's Python and PYTHONPATH=<galaxy>/lib:<galaxy_ui_loop> (see README).

The daemon test drives Galaxy's own selenium unit-test fixture page through a real daemon and client.
"""

import functools
import http.server
import json
import os
import subprocess
import sys
import threading
import time
from pathlib import Path
from urllib.request import urlopen

import pytest

import galaxy.selenium
from gxui.context import GxuiContext
from gxui.verbs import (
    _history_id,
    method_listing,
    REGISTRY,
    method_verb,
    register_method_verbs,
    UsageError,
)

GALAXY_ROOT = Path(galaxy.selenium.__file__).resolve().parents[3]
FIXTURES = GALAXY_ROOT / "test" / "unit" / "selenium" / "fixtures"
HERE = Path(__file__).resolve().parents[1]

register_method_verbs(GxuiContext)


class TestVerbParsing:
    def test_positional_from_signature(self):
        assert REGISTRY["history-new"].parse(["My Analysis"]) == (["My Analysis"], {})

    def test_varargs_and_options(self):
        args, kwargs = REGISTRY["upload-url"].parse(["http://a/1.fq", "http://a/2.fq", "--ext", "fastqsanger"])
        assert args == ["http://a/1.fq", "http://a/2.fq"]
        assert kwargs == {"ext": "fastqsanger"}

    def test_unannotated_method_args_become_ints(self):
        assert REGISTRY["dataset-view"].parse(["3"]) == ([3], {})

    def test_method_verb_options_from_method_defaults(self):
        class Context:
            def wait_for(self, hid, allowed_force_refreshes=0):
                """Wait for HID."""

        method_verb("test-wait", "history", "wait_for", Context)
        try:
            assert REGISTRY["test-wait"].parse(["3", "--allowed-force-refreshes", "1"]) == (
                [3],
                {"allowed_force_refreshes": 1},
            )
            assert REGISTRY["test-wait"].summary() == "Wait for HID."
        finally:
            del REGISTRY["test-wait"]

    def test_boolean_flag(self):
        assert REGISTRY["workflow-run"].parse(["QC", "--no-submit"]) == (["QC"], {"submit": False})

    def test_missing_positional_reports_usage(self):
        with pytest.raises(UsageError, match="usage: gxui history-new NAME"):
            REGISTRY["history-new"].parse([])

    def test_unknown_option_reports_usage(self):
        with pytest.raises(UsageError, match="unexpected arguments"):
            REGISTRY["history-new"].parse(["x", "--colour", "red"])

    def test_help_comes_from_method_docstring(self):
        assert "(backs onto display_dataset)" in REGISTRY["dataset-view"].help()


@pytest.fixture(scope="module")
def fixture_url():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(FIXTURES))
    handler.log_message = lambda *args: None
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{server.server_address[1]}/basic.html"
    server.shutdown()


@pytest.fixture
def gxui(tmp_path):
    env = {
        **os.environ,
        "GXUI_HOME": str(tmp_path),  # long on macOS, so this also exercises the short-socket fallback
        "GXUI_SESSION": "t",
        "PYTHONPATH": os.pathsep.join([str(HERE), str(GALAXY_ROOT / "lib")]),
    }

    def run(*argv, check=True):
        result = subprocess.run([sys.executable, "-m", "gxui.client", *argv], env=env, capture_output=True, text=True)
        if check:
            assert result.returncode == 0, result.stderr
        return result

    run.env = env
    yield run
    run("stop", check=False)


def test_daemon_drives_a_page(gxui, fixture_url, tmp_path):
    started = gxui("start", "--url", fixture_url, "--idle-timeout", "0", "--timeout-multiplier", "0.2").stdout
    cdp = next(line.split()[1] for line in started.splitlines() if line.startswith("cdp "))
    assert "already running" in gxui("start", "--url", fixture_url).stdout

    assert "'Basic Test Page'" in gxui("url").stdout
    assert gxui("call", "wait_for_selector_visible", "#header").returncode == 0

    snapshot_path = gxui("snapshot", "--label", "basic").stdout.split()[0]
    assert "Test Page" in Path(snapshot_path).read_text()
    assert Path(gxui("screenshot", "basic").stdout.strip()).exists()

    # Another client (playwright-cli in practice) sees the same page over CDP.
    with urlopen(f"{cdp}/json/list") as response:
        assert fixture_url in [t["url"] for t in json.load(response) if t["type"] == "page"]

    unknown = gxui("histroy-new", "x", check=False)
    assert unknown.returncode == 1 and "unknown verb 'histroy-new'" in unknown.stderr
    failed = gxui("call", "wait_for_selector_visible", "#nope", check=False)
    assert failed.returncode == 1

    gxui("gap", "need", "a", "hover", "verb")
    gxui("note", "box 1 done")
    # `last` skips notes and gaps: it is for recovering a verb result a shell timeout cut off.
    assert json.loads(gxui("last").stdout)["args"] == ["wait_for_selector_visible", "#nope"]

    lines = [json.loads(line) for line in (tmp_path / "t" / "transcript.jsonl").read_text().splitlines()]
    assert [(e["layer"], e["verb"]) for e in lines] == [
        ("verb", "url"),
        ("call", "call"),
        ("verb", "snapshot"),
        ("verb", "screenshot"),
        ("call", "call"),
        ("external", "gap"),
        ("note", "note"),
    ]
    assert lines[4]["ok"] is False and "screenshot" in lines[4]

    gxui("stop")
    assert "no gxui daemon" in gxui("status", check=False).stderr


def test_browser_death_relaunches(gxui, fixture_url):
    started = gxui("start", "--url", fixture_url, "--idle-timeout", "0").stdout
    port = next(line for line in started.splitlines() if line.startswith("cdp ")).rsplit(":", 1)[1]
    subprocess.run(["pkill", "-f", f"remote-debugging-port={port}"], check=True)

    died = gxui("url", check=False)
    assert died.returncode == 1 and "relaunched" in died.stderr
    assert "'Basic Test Page'" in gxui("url").stdout
    assert "browser relaunches 1" in gxui("status").stdout


def test_optional_positional_and_default_true_flag_usage():
    assert REGISTRY["components"].parse(["history_panel"]) == ([], {"prefix": "history_panel"})
    assert REGISTRY["components"].parse([]) == ([], {})
    assert REGISTRY["component"].usage() == "component PATH ACTION [VALUE] [--timeout TIMEOUT]"
    assert "[--no-submit]" in REGISTRY["workflow-run"].usage()


def test_history_wait_is_an_adapter_with_a_deadline():
    assert REGISTRY["history-wait"].parse(["2", "--timeout", "30"]) == ([2], {"timeout": 30.0})


def test_results_are_summarized_for_the_transcript():
    from gxui.daemon import _summarize

    assert _summarize(None) == "ok"
    assert _summarize("hid 2 ok") == "hid 2 ok"
    assert _summarize(object()) == "ok"


def test_component_paths_accept_quoted_arguments():
    from gxui.context import _QUOTED_ARGUMENT

    path = "workflow_run.input_data_div(label='FASTQ reads')"
    assert _QUOTED_ARGUMENT.sub(r"=\2", path) == "workflow_run.input_data_div(label=FASTQ reads)"


def test_workflow_extract_arguments():
    assert REGISTRY["workflow-extract"].parse(["QC", "--input-names", "FASTQ reads", "--exclude-hids", "5"]) == (
        ["QC"],
        {"input_names": "FASTQ reads", "exclude_hids": "5"},
    )


def test_component_rejects_unknown_actions_before_touching_the_page():
    with pytest.raises(UsageError, match="unknown action 'hover'"):
        REGISTRY["component"].func(None, "history_panel.item(hid=1)", "hover")


def test_last_reports_a_running_verb(gxui, fixture_url):
    gxui("start", "--url", fixture_url, "--idle-timeout", "0", "--timeout-multiplier", "0.5")
    env_run = subprocess.Popen(
        [sys.executable, "-m", "gxui.client", "call", "wait_for_selector_visible", "#nope"],
        env={**os.environ, **gxui.env},
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        for _ in range(50):
            if "still running: call wait_for_selector_visible" in gxui("last").stdout:
                break
            time.sleep(0.1)
        else:
            pytest.fail("`last` never reported the running verb")
    finally:
        env_run.wait()


def test_auto_leaves_css_attribute_selectors_alone():
    from gxui.verbs import _auto

    assert _auto('[data-description="name display"]') == '[data-description="name display"]'
    assert _auto('{"input1": 3}') == {"input1": 3}


def test_tool_describe_lines_carry_options_and_conditions():
    from galaxy.selenium.navigates_galaxy import ToolFormParameter
    from gxui.verbs import _describe_line

    parameter = ToolFormParameter("cond|flag", "Flag", "boolean", False, [], "cond|test=b")
    assert _describe_line(parameter) == "cond|flag  (boolean) 'Flag' = False  [when cond|test=b]"
    select = ToolFormParameter("mode", "Mode", "select", "a", [("A", "a"), ("b", "b")])
    assert _describe_line(select) == "mode  (select) 'Mode' = 'a'  options: A=a, b"
    assert REGISTRY["tool-describe"].parse([]) == ([], {})
    assert REGISTRY["tool-describe"].parse(["cat1"]) == ([], {"tool_id": "cat1"})


def test_dataset_copy_and_history_share_arguments():
    assert REGISTRY["dataset-copy"].parse(["2", "--source", "My Analysis"]) == ([2], {"source": "My Analysis"})
    assert REGISTRY["history-share"].parse(["--publish"]) == ([], {"publish": True})


class _HistoriesStub:
    def __init__(self, histories):
        self.histories = histories

    def api_get(self, endpoint):
        assert endpoint.startswith("histories")
        return self.histories

    def current_history_id(self):
        return "c0"


def test_history_names_resolve_to_ids():
    ctx = _HistoriesStub([{"id": "a1", "name": "My Analysis"}, {"id": "b2", "name": "Next"}, {"id": "b3", "name": "Next"}])
    assert _history_id(ctx, "My Analysis") == "a1"
    assert _history_id(ctx, "b3") == "b3"
    assert _history_id(ctx, "") == "c0"
    with pytest.raises(UsageError, match="2 histories named 'Next'"):
        _history_id(ctx, "Next")
    with pytest.raises(UsageError, match="no history 'Nope'"):
        _history_id(ctx, "Nope")


def test_method_listing_filters_and_points_at_verbs():
    listing = method_listing(GxuiContext, "create_new_with_name")
    assert listing.splitlines()[0].startswith("history_panel_create_new_with_name(name)")
    assert "[verb: history-new]" in listing
    assert "_screenshot_path" not in method_listing(GxuiContext, "screenshot")
    assert REGISTRY["methods"].parse(["history"]) == ([], {"text": "history"})
