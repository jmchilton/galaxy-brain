"""Presentation screenshots for the compare_runs feature. NOT part of the test suite.

This module drives the real UI with real data (every run, job and dataset shown is produced
by Galaxy running real tools) and writes slide-ready PNGs. It only runs when
``GALAXY_TEST_PRESENTATION=1`` is set, so a normal ``lib/galaxy_test/selenium`` run skips it.

What it changes compared to the regular E2E tests, all inside this module:

- a 1600x1000 CSS px viewport at device scale factor 2 (3200x2000 PNGs), by wrapping
  ``driver_factory.get_playwright_driver`` (Playwright backend only);
- pages opened with Galaxy's own ``hide_panels=true`` query (no activity bar or history panel), except the
  editor, whose own activity bar identifies it; there the side panels are closed through the UI;
- the masthead's storage meter hidden (pure chrome), and the demo user renamed to ``j.analyst``;
- workflows given explicit, tidy ``position:`` values in their gxformat2 source;
- captures wait for loading messages, spinners and skeletons to clear and park the mouse.

Run it (from the worktree root, servers started with galaxy_e2e.bash up; ports in .venv/e2e.env):

    GALAXY_TEST_PRESENTATION=1 \\
    GALAXY_TEST_SCREENSHOTS_DIRECTORY=<galaxy-brain>/vault/repositories/galaxy/branches/active/compare_runs/screenshots/presentation \\
    <galaxy-brain>/vault/repositories/galaxy/branches/active/compare_runs/presentation/galaxy_e2e.bash \\
        run playwright lib/galaxy_test/selenium/test_comparisons_presentation.py

``galaxy_e2e.bash run`` targets Vite (``GALAXY_TEST_EXTERNAL=http://localhost:<VITE_PORT>/``),
runs headless Playwright and points Chrome at the locally extracted libs and fonts.

Optional env:

- ``PRESENTATION_STATE_FILE=<path>``: after building the demo data once, save the user and ids
  there; later runs that find the file log in as that user and skip the ~3 minute data build.
  Delete the file to rebuild from scratch.
- ``PRESENTATION_WIDTH`` / ``PRESENTATION_HEIGHT`` / ``PRESENTATION_SCALE``: viewport override.
- ``PRESENTATION_LAYOUT=manual|gxformat2|none``: workflow node positions (default ``manual``).
- ``PRESENTATION_USERNAME``: the public name shown in the masthead (default ``j.analyst``).
"""

import json
import os
import random
import string
import urllib.parse
from typing import Any

import pytest
import yaml
from gxformat2 import python_to_workflow

from galaxy.selenium import driver_factory
from .framework import (
    retry_assertion_during_transitions,
    selenium_test,
    SharedStateSeleniumTestCase,
)

pytestmark = pytest.mark.skipif(
    os.environ.get("GALAXY_TEST_PRESENTATION") != "1",
    reason="presentation screenshots; set GALAXY_TEST_PRESENTATION=1 to capture them",
)

WIDTH = int(os.environ.get("PRESENTATION_WIDTH", "1600"))
HEIGHT = int(os.environ.get("PRESENTATION_HEIGHT", "1000"))
SCALE = float(os.environ.get("PRESENTATION_SCALE", "2"))
LAYOUT = os.environ.get("PRESENTATION_LAYOUT", "manual")
STATE_FILE = os.environ.get("PRESENTATION_STATE_FILE")
USERNAME = os.environ.get("PRESENTATION_USERNAME", "j.analyst")
TEST_DATA = os.path.join(os.path.dirname(__file__), os.pardir, os.pardir, os.pardir, "test-data")

_original_get_playwright_driver = driver_factory.get_playwright_driver


def _presentation_playwright_driver(browser=driver_factory.DEFAULT_BROWSER, headless=False):
    """The framework's driver, but on a wide, high-DPI page (viewport and scale are fixed per context)."""
    resources = _original_get_playwright_driver(browser=browser, headless=headless)
    resources.page.close()
    context = resources.browser.new_context(viewport={"width": WIDTH, "height": HEIGHT}, device_scale_factor=SCALE)
    return resources._replace(page=context.new_page())


if os.environ.get("GALAXY_TEST_PRESENTATION") == "1":
    driver_factory.get_playwright_driver = _presentation_playwright_driver

# gxformat2 drops ``readme``, so it goes into the native dict; without it the editor's Best Practices flags the workflow.
README = """# Exon selection

Keeps the exons of a BED file that are at least a minimum length (column 3 minus column 2), then reports the first
few and a seeded random sample of them.
"""

FILTER = "Keep long exons"
TOP = "Top exons"
SAMPLE = "Random sample"
REPORT = "Exon report"

# Hand-placed so the graph reads left to right: input, filter, two branches, merge.
MANUAL_POSITIONS = {
    "exons": {"left": 0, "top": 110},
    FILTER: {"left": 270, "top": 100},
    TOP: {"left": 540, "top": 0},
    SAMPLE: {"left": 540, "top": 200},
    REPORT: {"left": 810, "top": 100},
}


def exon_workflow(min_length: int, top_lines: int, layout: str = LAYOUT) -> dict[str, Any]:
    """The demo workflow: keep exons at least ``min_length`` bp, report the first ``top_lines`` and a sample."""
    workflow: dict[str, Any] = {
        "class": "GalaxyWorkflow",
        "name": "Exon selection",
        "doc": "Keep exons above a minimum length, then report the first few and a random sample.",
        "license": "MIT",
        "creator": [{"class": "Organization", "name": "Exon study demo"}],
        "inputs": {"exons": {"type": "data", "format": "bed", "doc": "Coding exons, BED"}},
        "outputs": {
            "long exons": {"outputSource": f"{FILTER}/out_file1"},
            "top exons": {"outputSource": f"{TOP}/out_file1"},
            "exon report": {"outputSource": f"{REPORT}/out_file1"},
        },
        "steps": {
            FILTER: {
                "tool_id": "Filter1",
                "in": {"input": "exons"},
                "tool_state": {"cond": f"c3-c2>={min_length}", "header_lines": 0},
                "out": {"out_file1": {"rename": "Long exons"}},
            },
            TOP: {
                "tool_id": "head",
                "in": {"input": f"{FILTER}/out_file1"},
                "tool_state": {"lineNum": top_lines},
                "out": {"out_file1": {"rename": "Top exons"}},
            },
            SAMPLE: {
                "tool_id": "random_lines1",
                "in": {"input": f"{FILTER}/out_file1"},
                "tool_state": {
                    "num_lines": 5,
                    "seed_source": {"seed_source_selector": "set_seed", "seed": "galaxy"},
                },
                "out": {"out_file1": {"rename": "Random sample"}},
            },
            REPORT: {
                # cat_list's one multiple input draws as one connection in the editor; cat1's repeat
                # input drew as an invalid (red) terminal there.
                "tool_id": "cat_list",
                "in": {"input1": [f"{TOP}/out_file1", f"{SAMPLE}/out_file1"]},
                "out": {"out_file1": {"rename": "Exon report"}},
            },
        },
    }
    return _positioned(workflow, MANUAL_POSITIONS, layout)


BATCH_POSITIONS = {"exon sets": {"left": 0, "top": 20}, FILTER: {"left": 300, "top": 0}}


def batch_workflow(layout: str = LAYOUT) -> dict[str, Any]:
    """The filter step mapped over a list of exon sets."""
    workflow: dict[str, Any] = {
        "class": "GalaxyWorkflow",
        "name": "Exon selection (batch)",
        "inputs": {"exon sets": {"type": "collection", "collection_type": "list"}},
        "outputs": {"long exons": {"outputSource": f"{FILTER}/out_file1"}},
        "steps": {
            FILTER: {
                "tool_id": "Filter1",
                "in": {"input": "exon sets"},
                "tool_state": {"cond": "c3-c2>=200", "header_lines": 0},
                "out": {"out_file1": {"rename": "Long exons"}},
            },
        },
    }
    return _positioned(workflow, BATCH_POSITIONS, layout)


def nested_workflow(layout: str = LAYOUT) -> dict[str, Any]:
    """The filter as a subworkflow of an outer workflow, for the subworkflow limitation beat."""
    inner = {
        "class": "GalaxyWorkflow",
        # an embedded workflow takes its name from ``label`` (gxformat2 defaults it to "Workflow")
        "label": "Select long exons",
        "inputs": {"exons": {"type": "data"}},
        "outputs": {"long exons": {"outputSource": f"{FILTER}/out_file1"}},
        "steps": {
            FILTER: {
                "tool_id": "Filter1",
                "in": {"input": "exons"},
                "tool_state": {"cond": "c3-c2>=200", "header_lines": 0},
                "out": {"out_file1": {"rename": "Long exons"}},
                "position": {"left": 270, "top": 0},
            },
        },
    }
    inner["inputs"]["exons"]["position"] = {"left": 0, "top": 10}
    workflow: dict[str, Any] = {
        "class": "GalaxyWorkflow",
        "name": "Exon selection (nested)",
        "inputs": {"exons": {"type": "data", "format": "bed"}},
        "outputs": {"top exons": {"outputSource": f"{TOP}/out_file1"}},
        "steps": {
            "Select long exons": {"run": inner, "in": {"exons": "exons"}},
            TOP: {
                "tool_id": "head",
                "in": {"input": "Select long exons/long exons"},
                "tool_state": {"lineNum": 10},
            },
        },
    }
    positions = {
        "exons": {"left": 0, "top": 10},
        "Select long exons": {"left": 270, "top": 0},
        TOP: {"left": 540, "top": 0},
    }
    return _positioned(workflow, positions, layout)


def _positioned(workflow: dict[str, Any], positions: dict[str, dict[str, int]], layout: str) -> dict[str, Any]:
    if layout == "manual":
        for section in ("inputs", "steps"):
            for label, item in workflow[section].items():
                item["position"] = positions[label]
    elif layout == "gxformat2":
        from gxformat2.layout import apply_layout

        workflow = apply_layout(workflow, strategy="layered")
    return workflow


class TestComparisonsPresentation(SharedStateSeleniumTestCase):
    """One test per story beat; ``setup_shared_state`` builds the demo data once for all of them."""

    # Filled in by setup_shared_state (or the state file).
    email: str
    workflow_id: str
    batch_workflow_id: str
    runs: list[dict[str, Any]]  # oldest first: {"id", "version", "exons"}
    batch_runs: list[str]  # [first run, rerun reusing the job cache]
    nested_run: str

    # ------------------------------------------------------------------ data

    def setup_shared_state(self):
        if STATE_FILE and os.path.exists(STATE_FILE):
            with open(STATE_FILE) as f:
                for key, value in json.load(f).items():
                    setattr(self.__class__, key, value)
            return
        suffix = "".join(random.choices(string.ascii_lowercase, k=4))
        email = f"analyst-{suffix}@example.org"
        self.register(email=email, username=f"analyst-{suffix}")
        self._rename_user(USERNAME)
        history_id = self.current_history_id()
        self.dataset_populator.rename_history(history_id, "Exon selection study")
        exons = {
            "CCDS": self._upload(history_id, "1.bed", "CCDS coding exons"),
            "RefSeq": self._upload(history_id, "2.bed", "RefSeq coding exons"),
        }

        # v1: exons of at least 200 bp, top 10. v2 relaxes the filter to 100 bp. v3 reports the top 5.
        workflow_id = self.workflow_populator.import_workflow(self._native(exon_workflow(200, 10)), fill_defaults=True)[
            "id"
        ]
        runs = []
        plan = [(1, None, ["CCDS", "RefSeq"]), (2, (100, 10), ["CCDS", "RefSeq"]), (3, (100, 5), ["CCDS"])]
        for version, change, inputs in plan:
            if change:
                self._save_version(workflow_id, exon_workflow(*change))
            for name in inputs:
                invocation_id = self._invoke(workflow_id, history_id, {"exons": {"src": "hda", "id": exons[name]}})
                runs.append({"id": invocation_id, "version": version, "exons": name})

        batch_history_id = self.dataset_populator.new_history("Exon selection batch")
        exon_sets = self.dataset_collection_populator.create_list_in_history(
            batch_history_id,
            contents=[("CCDS", self._read("1.bed")), ("RefSeq", self._read("2.bed"))],
            ext="bed",
            name="Exon sets",
            wait=True,
        ).json()
        exon_sets_id = (exon_sets.get("output_collections") or exon_sets["outputs"])[0]["id"]
        batch_workflow_id = self.workflow_populator.upload_yaml_workflow(yaml.safe_dump(batch_workflow()))
        batch_inputs = {"exon sets": {"src": "hdca", "id": exon_sets_id}}
        first_batch = self._invoke(batch_workflow_id, batch_history_id, batch_inputs)
        reused_batch = self._invoke(batch_workflow_id, batch_history_id, batch_inputs, use_cached_job=True)
        self._assert_jobs_reused(reused_batch, count=2)

        nested_workflow_id = self.workflow_populator.upload_yaml_workflow(yaml.safe_dump(nested_workflow()))
        nested_run = self._invoke(nested_workflow_id, history_id, {"exons": {"src": "hda", "id": exons["CCDS"]}})

        state = {
            "email": email,
            "workflow_id": workflow_id,
            "batch_workflow_id": batch_workflow_id,
            "runs": runs,
            "batch_runs": [first_batch, reused_batch],
            "nested_run": nested_run,
        }
        for key, value in state.items():
            setattr(self.__class__, key, value)
        if STATE_FILE:
            with open(STATE_FILE, "w") as f:
                json.dump(state, f, indent=2)

    def _read(self, name: str) -> str:
        with open(os.path.join(TEST_DATA, name)) as f:
            return f.read()

    def _upload(self, history_id: str, name: str, label: str) -> str:
        return self.dataset_populator.new_dataset(
            history_id, content=self._read(name), file_type="bed", name=label, wait=True
        )["id"]

    def _native(self, workflow: dict[str, Any]) -> dict[str, Any]:
        native = python_to_workflow(workflow, galaxy_interface=None, workflow_directory=None)
        native["readme"] = README
        return native

    def _save_version(self, workflow_id: str, workflow: dict[str, Any]):
        response = self.workflow_populator.update_workflow(workflow_id, self._native(workflow))
        response.raise_for_status()

    def _rename_user(self, username: str):
        """Give the demo user a plausible public name; keeps the random one if the name is taken."""
        user = self.dataset_populator._get("users/current").json()
        if user["username"] == username:
            return
        response = self.dataset_populator._put(f"users/{user['id']}", data={"username": username}, json=True)
        if response.status_code != 200:
            print(f"Could not rename the demo user to {username!r}: {response.text}")

    def _invoke(self, workflow_id: str, history_id: str, inputs: dict, use_cached_job: bool = False) -> str:
        request: dict[str, Any] = {"history": f"hist_id={history_id}"}
        if use_cached_job:
            request["use_cached_job"] = True
        return self.workflow_populator.invoke_workflow_and_wait(
            workflow_id, inputs=inputs, request=request, inputs_by="name"
        ).json()["id"]

    def _assert_jobs_reused(self, invocation_id: str, count: int):
        jobs = self.dataset_populator.invocation_jobs(invocation_id)
        assert len(jobs) == count, jobs
        for job in jobs:
            details = self.dataset_populator.get_job_details(job["id"], full=True).json()
            assert details["copied_from_job_id"], f"Expected the job cache to reuse a job: {details}"

    def _run(self, version: int, exons: str) -> str:
        (run,) = [run for run in self.runs if run["version"] == version and run["exons"] == exons]
        return run["id"]

    @property
    def latest_run(self) -> str:
        return self.runs[-1]["id"]

    def _step(self, invocation_id: str, label: str) -> dict[str, Any]:
        steps = self.workflow_populator.get_invocation(invocation_id, step_details=True)["steps"]
        (step,) = [step for step in steps if step["workflow_step_label"] == label]
        return step

    # ------------------------------------------------------------ page prep

    def setup_with_driver(self):
        super().setup_with_driver()
        self.submit_login(self.email, password=self.default_password, assert_valid=True)

    def snapshot(self, description: str):
        """Skip the framework's per-step debug screenshots; at scale 2 they can hang mid-login."""

    def _open(self, path: str, panels: bool = False):
        """Navigate; unless ``panels``, through Galaxy's ``hide_panels`` query (no activity bar, no history panel)."""
        if not panels:
            path = f"{path}{'&' if '?' in path else '?'}hide_panels=true"
        self.get(path)
        self.components.masthead._.wait_for_visible()
        self._close_side_panels()

    def _reopen_without_panels(self):
        """After a real click navigated somewhere, reload that page through ``hide_panels``."""
        url = urllib.parse.urlsplit(self.page.url)
        self._open(f"{url.path.lstrip('/')}{'?' + url.query if url.query else ''}")

    def _close_side_panels(self):
        # An open activity panel (Tools by default) closes by clicking its active activity; the
        # choice is kept in local storage. The history panel collapses with its FlexPanel button.
        self._wait_on(
            lambda: self.execute_script("""
                const bars = [...document.querySelectorAll('.activity-bar')];
                let open = false;
                for (const bar of bars) {
                    const panel = bar.parentElement.querySelector('.activity-panel');
                    if (panel && panel.offsetParent !== null) {
                        open = true;
                        bar.querySelector('.nav-item-active a')?.click();
                    }
                }
                const history = document.querySelector('#right .collapse-button.open');
                if (history) { open = true; history.click(); }
                // Pure chrome: the collapsed history's floating "History" tab (over the page's top-right
                // buttons) and the masthead's storage meter.
                if (!document.getElementById('presentation-style')) {
                    const style = document.createElement('style');
                    style.id = 'presentation-style';
                    style.textContent = '.history-expand-button, #masthead .quota-meter { display: none !important; }';
                    document.head.appendChild(style);
                }
                return !open;
                """),
            "side panels to close",
        )

    def _settle(self):
        """Wait out loading messages, spinners and skeletons, then park the mouse off any hover target."""
        self._wait_on(
            lambda: self.execute_script("""
                const busy = document.querySelectorAll(
                    '[data-description="loading message"], .fa-spin, .spinner-border, .b-skeleton, .loading-span');
                return ![...busy].some((el) => el.offsetParent !== null);
                """),
            "loading indicators to clear",
            wait_type=self.wait_types.DATABASE_OPERATION,
        )
        self.page.mouse.move(WIDTH - 2, HEIGHT - 2)
        # no DOM signal marks the end of fade-in transitions, so give them a render cycle
        self.sleep_for(self.wait_types.UX_RENDER)

    def _capture(
        self,
        label: str,
        subject=None,
        crop_to: str | None = None,
        min_height: int = 450,
        pad: int = 24,
        snap: bool = True,
    ):
        """Screenshot the viewport; with ``crop_to``, cut it just below that element to drop empty space.

        The cut moves down to the end of any table row or button it would slice through.
        """
        if subject is not None:
            self.scroll_into_view(subject.wait_for_visible())
        self.execute_script("document.activeElement && document.activeElement.blur && document.activeElement.blur();")
        self._settle()
        # some pages open the Tools panel after their first render
        self._close_side_panels()
        self._settle()
        if crop_to is None:
            self.screenshot(label)
            return
        height = self.execute_script(f"""
            const els = [...document.querySelectorAll({json.dumps(crop_to)})].filter((el) => el.offsetParent !== null);
            let cut = Math.max({min_height}, Math.max(...els.map((el) => el.getBoundingClientRect().bottom)) + {pad});
            const blocks = [...document.querySelectorAll({json.dumps("tr, .btn" if snap else ":not(*)")})]
                .filter((el) => el.offsetParent !== null)
                .map((el) => el.getBoundingClientRect());
            for (let moved = true; moved; ) {{
                moved = false;
                for (const box of blocks) {{
                    // a table's expanded detail is a row too; only snap past ordinary rows
                    if (box.top < cut - 1 && box.bottom > cut + 1 && box.height < 120) {{
                        cut = box.bottom;
                        moved = true;
                    }}
                }}
            }}
            return Math.ceil(Math.min({HEIGHT}, cut));
            """)
        path = self._screenshot_path(label)
        if path:
            self.page.screenshot(path=path, clip={"x": 0, "y": 0, "width": WIDTH, "height": height})

    def _hide_columns(self, *labels: str):
        """Untick columns in the table's Show/Hide Columns menu (the cog)."""
        self.execute_script("""
            const toggles = [...document.querySelectorAll('.comparison-table .list-header-filters .dropdown-toggle')];
            toggles.find((t) => t.querySelector('svg[data-icon="gear"], svg[data-icon="cog"]')).click();
            """)
        for label in labels:
            self._wait_on(
                lambda label=label: self.execute_script(f"""
                    const items = [...document.querySelectorAll('.dropdown-menu.show [role="menuitemcheckbox"], .dropdown-menu.show .dropdown-item')];
                    const item = items.find((i) => i.textContent.trim() === {json.dumps(label)});
                    if (item) {{ item.click(); return true; }}
                    return false;
                    """),
                f"{label} in the column menu",
            )
        self.page.keyboard.press("Escape")
        self.execute_script("document.body.click();")

    def _scroll_center(self, selector: str, offset: int = 0):
        """Scroll the element's nearest scrolling ancestor so the element starts ``offset`` px below its top."""
        self.execute_script(f"""
            const target = document.querySelector({json.dumps(selector)});
            let scroller = target.parentElement;
            while (scroller && !(scroller.scrollHeight > scroller.clientHeight
                    && ['auto', 'scroll'].includes(getComputedStyle(scroller).overflowY))) {{
                scroller = scroller.parentElement;
            }}
            scroller = scroller || document.scrollingElement;
            const delta = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
            scroller.scrollTop += delta - {offset};
            """)
        self.sleep_for(self.wait_types.UX_RENDER)

    def _show_metadata(self, column_key: str, element: str):
        """Show a metadata element in a column's cells, through the column's header menu."""
        comparisons = self.components.comparisons
        header = comparisons.column_header(key=column_key)
        header.wait_for_visible()
        self.wait_for_and_click_selector(f"{header.selector} .comparison-column-menu")
        self._wait_on(
            lambda: self.execute_script(f"""
                const items = [...document.querySelectorAll('.dropdown-menu.show [role="menuitemradio"]')];
                const item = items.find((item) => item.textContent.trim() === {json.dumps(element)});
                if (item) {{ item.click(); return true; }}
                return false;
                """),
            f"{element} in the {column_key} display menu",
        )
        self.execute_script("document.activeElement && document.activeElement.blur();")

    def _step_runs_path(self, label: str, **extra) -> str:
        query = {"kind": "step_runs", "workflow_id": self.workflow_id, "step_label": label, **extra}
        return f"comparisons?{urllib.parse.urlencode(query, doseq=True)}"

    def _assert_rows(self, count: int):
        @retry_assertion_during_transitions
        def check(self):
            rows = self.components.comparisons.rows.all()
            assert len(rows) == count, f"Expected {count} rows, found {len(rows)}"

        check(self)

    def _open_step_card(self, invocation_id: str, label: str, zoom_outs: int = 1, recenter=("Next", "Prev")):
        """Open an invocation's graph with ``label``'s step card, the graph centred and scrolled to the top."""
        self._open(f"workflows/invocations/{invocation_id}")
        self.invocation_graph_wait_for_polling_to_stop()
        # The run summary (state bars, history) isn't the story here; its collapse is remembered.
        self.wait_for_and_click_selector('[title="Collapse header"]')
        self.invocation_graph_click_node(label)
        self.assert_invocation_step_card_title(label)
        # The graph centres the clicked node before the card shrinks it; stepping away and back
        # centres it again in the final pane.
        for button in recenter:
            self._click_card_header_button(button)
        self.assert_invocation_step_card_title(label)
        for _ in range(zoom_outs):
            self.wait_for_and_click_selector('.invocation-graph .zoom-control [title="Zoom Out"]')
        self._scroll_center(".graph-pane", offset=0)

    def _click_card_header_button(self, text: str):
        self._wait_on(
            lambda: self.execute_script(f"""
                const buttons = [...document.querySelectorAll('.invocation-step-card button, .card-header button')];
                const button = buttons.find((b) => b.textContent.trim() === {json.dumps(text)});
                if (button) {{ button.click(); return true; }}
                return false;
                """),
            f"{text} button in the step card",
        )
        self.sleep_for(self.wait_types.UX_RENDER)

    def _open_step_runs_page(self):
        """The full-page runs of the filter step, output line counts shown, the always-empty Reused column hidden."""
        self._open(self._step_runs_path(FILTER))
        self._assert_rows(len(self.runs))
        self._show_metadata("output:out_file1", "data_lines")
        self._hide_columns("Reused")

    # ---------------------------------------------------------------- beats

    def _click_text(self, selector: str, text: str):
        self._wait_on(
            lambda: self.execute_script(f"""
                const els = [...document.querySelectorAll({json.dumps(selector)})];
                const el = els.find((e) => e.textContent.trim() === {json.dumps(text)});
                if (el) {{ el.click(); return true; }}
                return false;
                """),
            f"{text!r} to click",
        )

    @selenium_test
    def test_01_invocation_step_all_runs_tab(self):
        self._open_step_card(self.latest_run, FILTER, zoom_outs=0)
        self.components.comparisons.step_all_runs_tab.wait_for_and_click()
        self._assert_rows(len(self.runs))
        self._show_metadata("output:out_file1", "data_lines")
        self._hide_columns("Reused")
        self._capture("01_invocation_step_all_runs_tab")

    @selenium_test
    def test_02_step_runs_page(self):
        self._open_step_runs_page()
        self._capture("02_step_runs_page", crop_to=".comparison-view > *")

    @selenium_test
    def test_03_row_detail_parameter_diff(self):
        # The invocation's Steps tab gives the step the page's full width (its own route, so hide_panels stays).
        self._open(f"workflows/invocations/{self.latest_run}/steps")
        # The run summary isn't this beat; its collapse is remembered.
        self.wait_for_and_click_selector('[title="Collapse header"]')
        order_index = self._step(self.latest_run, FILTER)["order_index"]
        self.components.invocations.step_title(order_index=order_index).wait_for_and_click()
        comparisons = self.components.comparisons
        self.wait_for_and_click_selector(f'[data-step="{order_index}"] .invocation-step-all-runs-tab > a.nav-link')
        self._assert_rows(len(self.runs))
        self._show_metadata("output:out_file1", "data_lines")
        self._hide_columns("Reused")
        older = self._run(1, "CCDS")
        comparisons.row_expand(run_id=older).wait_for_and_click()
        comparisons.row_detail_changed_parameter.wait_for_visible()
        self._settle()
        # Scrolls the step list (the page itself doesn't scroll) so the step's header is at its top.
        self._scroll_center(f'[data-step="{order_index}"]', offset=0)
        self._capture("03_row_detail_parameter_diff", crop_to=".job-parameters-diff")

    @selenium_test
    def test_04_selected_runs_diff(self):
        self._open_step_runs_page()
        comparisons = self.components.comparisons
        comparisons.row_select(run_id=self.latest_run).wait_for_and_click()
        comparisons.row_select(run_id=self._run(1, "RefSeq")).wait_for_and_click()
        comparisons.compare_selected.wait_for_and_click()
        comparisons.diff_panel.wait_for_visible()
        self._capture("04_selected_runs_diff_only_differences", crop_to=".comparison-view > *")

    @selenium_test
    def test_05_transposed(self):
        self._open_step_runs_page()
        comparisons = self.components.comparisons
        comparisons.transpose_toggle.wait_for_and_click()
        comparisons.transposed_run_links.wait_for_visible()
        self._capture("05_transposed", crop_to=".comparison-view > *")

    @selenium_test
    def test_06_stored_workflow_invocations(self):
        self._open(f"workflows/{self.workflow_id}/invocations")
        self.components.comparisons.compare_outputs_button.wait_for_visible()
        self._capture(
            "06_stored_workflow_invocations_compare_outputs", crop_to='table, [data-description="grid pager"]'
        )

    @selenium_test
    def test_07_output_runs_page(self):
        self._open(f"workflows/{self.workflow_id}/invocations")
        comparisons = self.components.comparisons
        comparisons.compare_outputs_button.wait_for_and_click()
        self._assert_rows(len(self.runs))
        self._reopen_without_panels()
        self._assert_rows(len(self.runs))
        for label in ("long exons", "top exons", "exon report"):
            self._show_metadata(f"output:{label}", "data_lines")
        self._capture("07_output_runs_page", crop_to=".comparison-view > *")

    @selenium_test
    def test_08_filters(self):
        # The open state menu covers the version checkboxes and adds nothing a caption can't, so one shot.
        self._open_step_runs_page()
        self._click_text(".comparison-filter-versions label", "v1")
        self._assert_rows(2)
        comparisons = self.components.comparisons
        comparisons.state_filter_toggle.wait_for_and_click()
        comparisons.state_filter(state="ok").wait_for_visible()
        self._click_text(".comparison-filter-states label", "successful")
        self._assert_rows(2)
        self.page.keyboard.press("Escape")
        self.execute_script("document.body.click();")
        self.wait_for_selector_absent_or_hidden(".comparison-filter-states")
        self._capture("08_filters_v1_successful", crop_to=".comparison-view > *", min_height=0)

    @selenium_test
    def test_09_job_page_other_runs(self):
        job_id = self._step(self.latest_run, FILTER)["jobs"][0]["id"]
        self._open(f"jobs/{job_id}/view")
        comparisons = self.components.comparisons
        comparisons.other_runs_action.wait_for_visible()
        # Down to the job details card, which ends with the link; parameters and metrics aren't this beat.
        self._capture("09_job_page_other_runs_action", crop_to=comparisons.other_runs_action.selector)
        comparisons.other_runs_action.wait_for_and_click()
        comparisons.row(run_id=job_id).wait_for_visible()
        self._reopen_without_panels()
        comparisons.row(run_id=job_id).wait_for_visible()
        self._capture("10_tool_runs_page", crop_to=".comparison-view > *")

    @selenium_test
    def test_11_dataset_details_other_runs(self):
        dataset_id = self._step(self.latest_run, FILTER)["outputs"]["out_file1"]["id"]
        self._open(f"datasets/{dataset_id}/details")
        comparisons = self.components.comparisons
        comparisons.other_runs_action.wait_for_visible()
        self._settle()
        self._scroll_center(comparisons.other_runs_action.selector, offset=HEIGHT - 260)
        self._capture("11_dataset_details_other_runs_action")

    @selenium_test
    def test_12_editor_compare_runs_link(self):
        # The editor keeps its own activity bar: it is what says "this is the workflow editor".
        self._open(f"workflows/edit?id={self.workflow_id}", panels=True)
        self.workflow_editor_ensure_tool_form_open(FILTER)
        self.components.workflow_editor.label_input.wait_for_visible()
        self._close_side_panels()
        self._center_editor_graph()
        self._capture("12_editor_compare_runs_link", self.components.comparisons.editor_compare_runs_link)

    def _center_editor_graph(self):
        """Drag the editor canvas (from an empty spot) so the graph sits mid-height instead of at the top."""
        box = self.execute_script("""
            const canvas = document.querySelector('#canvas-container').getBoundingClientRect();
            const nodes = [...document.querySelectorAll('#canvas-container .workflow-node')]
                .map((node) => node.getBoundingClientRect());
            const top = Math.min(...nodes.map((n) => n.top));
            const bottom = Math.max(...nodes.map((n) => n.bottom));
            const left = Math.min(...nodes.map((n) => n.left));
            return { top, bottom, left, canvasTop: canvas.top, canvasBottom: canvas.bottom };
            """)
        dy = (box["canvasTop"] + box["canvasBottom"]) / 2 - (box["top"] + box["bottom"]) / 2
        if dy < 20:
            return
        x, y = box["left"] + 400, box["bottom"] + 40
        self.page.mouse.move(x, y)
        self.page.mouse.down()
        self.page.mouse.move(x, y + dy, steps=12)
        self.page.mouse.up()
        self.sleep_for(self.wait_types.UX_RENDER)

    @selenium_test
    def test_13_mapped_step_reused_job(self):
        first, reused = self.batch_runs
        query = {"kind": "step_runs", "workflow_id": self.batch_workflow_id, "step_label": FILTER}
        self._open(f"comparisons?{urllib.parse.urlencode(query)}")
        self._assert_rows(2)
        comparisons = self.components.comparisons
        comparisons.row_expand(run_id=reused).wait_for_and_click()
        comparisons.row_detail_reused_badge.wait_for_visible()
        comparisons.row_detail_job_pager.wait_for_visible()
        self._capture("13_mapped_step_batch_reused_job", crop_to=".comparison-view > *")

    @selenium_test
    def test_14_subworkflow_all_runs_unavailable(self):
        steps = self.workflow_populator.get_invocation(self.nested_run, step_details=True)["steps"]
        (nested,) = [step for step in steps if step["workflow_step_label"] == "Select long exons"]
        # the filter is the subworkflow's last step, so step back and forward to centre it
        self._open_step_card(nested["subworkflow_invocation_id"], FILTER, zoom_outs=0, recenter=("Prev", "Next"))
        comparisons = self.components.comparisons
        comparisons.step_all_runs_tab.wait_for_and_click()
        comparisons.step_all_runs_unavailable.wait_for_visible()
        self._settle()
        self._capture(
            "14_subworkflow_all_runs_unavailable",
            crop_to=".invocation-step-card .nav-tabs, .invocation-step-all-runs-unavailable",
        )

    @selenium_test
    def test_15_export_menu(self):
        self._open_step_runs_page()
        self.wait_for_and_click_selector(".comparison-table .comparison-export")
        self.wait_for_visible(self.navigation.comparisons.selectors._)  # page still there
        self.wait_for_selector_visible(".comparison-export-csv")
        self._capture("15_export_menu", crop_to=".comparison-view > *, .dropdown-menu.show")

    @selenium_test
    @pytest.mark.skipif(not os.environ.get("PRESENTATION_EXPLORE_DIR"), reason="layout exploration only")
    def test_99_layout_options(self):
        """Not a beat: the same workflow laid out by hand, by gxformat2's layered layout, and by the editor."""
        out = os.environ["PRESENTATION_EXPLORE_DIR"]
        for layout in ("manual", "gxformat2", "none"):
            workflow_id = self.workflow_populator.upload_yaml_workflow(
                yaml.safe_dump(exon_workflow(200, 10, layout=layout)), name=f"Exon selection ({layout} layout)"
            )
            self._open(f"workflows/edit?id={workflow_id}", panels=True)
            self.components.workflow_editor.node._(label=FILTER).wait_for_visible()
            self._close_side_panels()
            self._settle()
            self.page.screenshot(path=os.path.join(out, f"layout_{layout}.png"))
            if layout == "none":
                self.components.workflow_editor.tool_bar.auto_layout.wait_for_and_click()
                self.sleep_for(self.wait_types.UX_TRANSITION)
                self._settle()
                self.page.screenshot(path=os.path.join(out, "layout_editor_auto.png"))
