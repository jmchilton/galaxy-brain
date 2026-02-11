---
type: research
subtype: component
tags: [research/component, galaxy/testing, galaxy/client]
status: draft
created: 2026-02-11
revised: 2026-02-11
revision: 1
ai_generated: true
component: E2E Testing
galaxy_areas: [testing, client]
---

# Writing E2E Tests in Galaxy: A Comprehensive Guide

This document is a practical reference for writing end-to-end (E2E) browser-automation tests in the Galaxy codebase. It covers the infrastructure, patterns, component system, and best practices. It is intentionally agnostic about *running* tests; consult `doc/source/dev/writing_tests.md` and `./run_tests.sh --help` for execution details.

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Key Files and Directory Structure](#2-key-files-and-directory-structure)
3. [Test Class Hierarchy](#3-test-class-hierarchy)
4. [The Smart Component System and navigation.yml](#4-the-smart-component-system-and-navigationyml)
5. [Core Decorators and Fixtures](#5-core-decorators-and-fixtures)
6. [Common Patterns](#6-common-patterns)
7. [API Setup vs UI Interaction](#7-api-setup-vs-ui-interaction)
8. [Waiting and Retry Strategies](#8-waiting-and-retry-strategies)
9. [Accessibility Testing](#9-accessibility-testing)
10. [Selenium Integration Tests](#10-selenium-integration-tests)
11. [Playwright Compatibility](#11-playwright-compatibility)
12. [Debugging and Error Diagnosis](#12-debugging-and-error-diagnosis)
13. [Best Practices](#13-best-practices)

---

## 1. Architecture Overview

Galaxy's E2E test infrastructure has a layered architecture:

```
Test files (lib/galaxy_test/selenium/test_*.py)
  |
  v
SeleniumTestCase  (lib/galaxy_test/selenium/framework.py)
  |  combines:
  |-- FunctionalTestCase        (server lifecycle, URL setup)
  |-- TestWithSeleniumMixin     (browser setup, login, screenshots)
  |     |-- GalaxySeleniumContext   (populators via browser session)
  |     |     |-- NavigatesGalaxy   (all UI helper methods)
  |     |           |-- HasDriverProxy -> HasDriver / HasPlaywrightDriver
  |     |-- UsesApiTestCaseMixin    (HTTP methods: _get, _post, etc.)
  |     |-- UsesCeleryTasks         (async task configuration)
  |
  v
Smart Component System
  |-- navigation.yml         (client/src/utils/navigation/navigation.yml)
  |-- Component / Target     (lib/galaxy/navigation/components.py)
  |-- SmartComponent / SmartTarget  (lib/galaxy/selenium/smart_components.py)
```

The test framework starts a Galaxy server (unless `GALAXY_TEST_EXTERNAL` is set), launches a browser via Selenium or Playwright, and provides a rich set of helper methods and component abstractions for interacting with the Galaxy UI.

Both Selenium and Playwright backends share the same test files. The backend is selected at runtime via `GALAXY_TEST_DRIVER_BACKEND` (default: `"selenium"`). A unified `HasDriverProtocol` interface ensures tests written against one backend work with both, except for backend-specific features gated by `@selenium_only` or `@playwright_only`.

---

## 2. Key Files and Directory Structure

### Test Files

| Path | Description |
|------|-------------|
| `lib/galaxy_test/selenium/test_*.py` | All E2E test files (Selenium + Playwright) |
| `lib/galaxy_test/selenium/framework.py` | `SeleniumTestCase`, decorators (`@selenium_test`, `@managed_history`), mixins |
| `lib/galaxy_test/selenium/conftest.py` | pytest fixtures: `real_driver`, `embedded_driver` |
| `test/integration_selenium/` | E2E tests requiring custom Galaxy config |
| `test/integration_selenium/framework.py` | `SeleniumIntegrationTestCase` base class |

### Infrastructure

| Path | Description |
|------|-------------|
| `lib/galaxy/selenium/navigates_galaxy.py` | `NavigatesGalaxy` -- all UI helper methods (1600+ lines) |
| `lib/galaxy/selenium/smart_components.py` | `SmartComponent` / `SmartTarget` -- driver-aware component wrappers |
| `lib/galaxy/selenium/has_driver.py` | `HasDriver` -- Selenium driver abstraction |
| `lib/galaxy/selenium/has_playwright_driver.py` | `HasPlaywrightDriver` -- Playwright driver abstraction |
| `lib/galaxy/selenium/driver_factory.py` | `ConfiguredDriver` -- creates/manages driver instances |
| `lib/galaxy/selenium/wait_methods_mixin.py` | `WaitMethodsMixin` -- shared wait methods for both backends |
| `lib/galaxy/selenium/context.py` | `GalaxySeleniumContext` -- builds URLs, manages screenshots |
| `lib/galaxy/selenium/axe_results.py` | Accessibility assertion helpers |

### Navigation / Component Definition

| Path | Description |
|------|-------------|
| `client/src/utils/navigation/navigation.yml` | Component selector definitions (the source of truth) |
| `lib/galaxy/navigation/components.py` | `Component`, `SelectorTemplate`, `Target` classes |
| `lib/galaxy/navigation/data.py` | `load_root_component()` -- loads navigation.yml at runtime |

### Populators (API helpers)

| Path | Description |
|------|-------------|
| `lib/galaxy_test/base/populators.py` | `DatasetPopulator`, `WorkflowPopulator`, `DatasetCollectionPopulator` |

---

## 3. Test Class Hierarchy

### SeleniumTestCase (Standard E2E Tests)

The primary base class for E2E tests. Located in `lib/galaxy_test/selenium/framework.py`.

```python
from .framework import (
    managed_history,
    selenium_test,
    SeleniumTestCase,
    UsesHistoryItemAssertions,
)

class TestMyFeature(SeleniumTestCase, UsesHistoryItemAssertions):
    ensure_registered = True  # auto-login before each test

    @selenium_test
    @managed_history
    def test_something(self):
        # test code here
        pass
```

#### Class Attributes

| Attribute | Default | Purpose |
|-----------|---------|---------|
| `ensure_registered` | `False` | Auto-register/login before each test |
| `run_as_admin` | `False` | Login as admin user |
| `framework_tool_and_types` | `True` | Use sample tools/datatypes |

### SharedStateSeleniumTestCase (Shared Setup)

For tests with expensive one-time setup (multiple users, published resources). The `setup_shared_state()` method runs once per class:

```python
from .framework import selenium_test, SharedStateSeleniumTestCase

class TestPublishedPages(SharedStateSeleniumTestCase):
    @selenium_test
    def test_index(self):
        self.navigate_to_pages()
        assert len(self.get_grid_entry_names("#pages-published-grid")) == 2

    def setup_shared_state(self):
        self.user1_email = self._get_random_email("test1")
        self.register(self.user1_email)
        self.new_public_page()
        self.logout_if_needed()

        self.user2_email = self._get_random_email("test2")
        self.register(self.user2_email)
        self.new_public_page()
```

### SeleniumIntegrationTestCase (Custom Galaxy Config)

For E2E tests that need a specific Galaxy configuration. Located in `test/integration_selenium/framework.py`:

```python
from test.integration_selenium.framework import (
    selenium_test,
    SeleniumIntegrationTestCase,
)

class TestUploadFtp(SeleniumIntegrationTestCase):
    ensure_registered = True

    @classmethod
    def handle_galaxy_config_kwds(cls, config):
        super().handle_galaxy_config_kwds(config)
        config["ftp_upload_dir"] = cls.temp_config_dir("ftp")
        config["ftp_upload_site"] = "ftp://ftp.galaxyproject.com"

    @selenium_test
    def test_upload(self):
        # test code using FTP upload UI
        pass
```

### Available Mixins

| Mixin | Source | What It Provides |
|-------|--------|-----------------|
| `UsesHistoryItemAssertions` | `framework.py` | `assert_item_summary_includes()`, `assert_item_name()`, `assert_item_dbkey_displayed_as()`, etc. |
| `UsesWorkflowAssertions` | `framework.py` | `_assert_showing_n_workflows()` |
| `UsesLibraryAssertions` | `framework.py` | `assert_num_displayed_items()` |
| `RunsWorkflows` | `framework.py` | `workflow_run_open_workflow()`, `workflow_run_submit()`, `workflow_run_wait_for_ok()` |
| `TestsGalaxyPagers` | `framework.py` | `_assert_current_page_is()`, `_next_page()`, `_previous_page()` |

---

## 4. The Smart Component System and navigation.yml

### Overview

Galaxy uses a declarative component system to decouple tests from raw CSS/XPath selectors. UI element locations are defined in `navigation.yml` and wrapped at runtime with driver-aware methods.

The data flow:

```
navigation.yml  -->  Component / SelectorTemplate  -->  SmartComponent / SmartTarget
   (YAML)            (lib/galaxy/navigation/)           (lib/galaxy/selenium/smart_components.py)
```

Tests access components via `self.components`, which returns a `SmartComponent` wrapping the root `Component` loaded from `navigation.yml`.

### navigation.yml Structure

The file is located at `client/src/utils/navigation/navigation.yml` (and bundled as a package resource for the Python side via `lib/galaxy/navigation/data.py`). Its structure:

```yaml
# Top-level keys are component names
component_name:
  selectors:
    _: '#root-selector'           # _ is the "self" selector
    child_element: '.child-class'
    parameterized: '[data-hid="${hid}"]'  # supports ${var} interpolation

  sub_component:
    selectors:
      _: '${_} .sub-selector'    # ${_} references parent's _ selector
      button: '${_} button'

  text:
    some_label: 'Display Text'

  labels:
    link_text: 'Click Me'
```

**Selector types** (default is `css`):

```yaml
# CSS selector (default)
my_element: '.my-class'

# Explicit CSS
my_element:
  type: css
  selector: '.my-class'

# XPath
my_element:
  type: xpath
  selector: '//button[contains(text(), "Submit")]'

# data-description shorthand
my_element:
  type: data-description
  selector: 'my description'
  # Becomes: [data-description="my description"]

# Sizzle (jQuery-style, rare)
my_element:
  type: sizzle
  selector: '.menu > a:contains("Label")'
```

**Parameterized selectors** use `${variable}` syntax:

```yaml
history_panel:
  item:
    selectors:
      # Multiple selector variants - first matching template wins
      _:
      - '#current-history-panel [data-hid="${hid}"][data-state="${state}"]'
      - '#current-history-panel #${history_content_type}-${id}'
      - '#current-history-panel [data-hid="${hid}"]'

      title: '${_} .content-title'  # ${_} expands to the resolved parent _ selector
      name: '${_} .name'
      summary: '${_} .summary'
```

When a selector is a list, `SelectorTemplate` tries each template in order, using the first one whose `${variable}` references can be fully substituted from the provided keyword arguments. This allows a single component to be addressed by different identifying attributes -- for instance, by `hid` + `state`, by `history_content_type` + `id`, or by `hid` alone.

**Key top-level components** defined in `navigation.yml`:

| Component | Purpose |
|-----------|---------|
| `_` (global) | Center panel, editable text, tooltips |
| `masthead` | Top navigation bar, login/logout, user menu |
| `history_panel` | History panel, items, editor, tags, collections |
| `tool_panel` | Tool search, tool links |
| `tool_form` | Tool execution form, parameters |
| `workflow_editor` | Workflow editor canvas, nodes, connections |
| `workflow_run` | Workflow run form, inputs |
| `workflows` | Workflow list, import, cards |
| `histories` | History list, sharing |
| `login` | Login form |
| `registration` | Registration form |
| `upload` | Upload dialog, rule builder |
| `invocations` | Invocation grid, export |
| `pages` | Page editor |
| `admin` | Admin panel |
| `collection_builders` | Collection creation dialogs |
| `edit_dataset_attributes` | Dataset attribute editing form |

### How Components Are Loaded

`lib/galaxy/navigation/data.py` contains:

```python
def load_root_component() -> Component:
    new_data_yaml = resource_string(__name__, "navigation.yml")
    navigation_raw = yaml.safe_load(new_data_yaml)
    return Component.from_dict("root", navigation_raw)
```

This is called once at module load time and cached in `NavigatesGalaxy._root_component`. The `self.components` property wraps this with `SmartComponent`:

```python
@property
def components(self) -> SmartComponent:
    return SmartComponent(self.navigation, self)
```

### Using Components in Tests

Access components via `self.components`:

```python
# Simple component access
editor = self.components.workflow_editor
editor.canvas_body.wait_for_visible()

# Parameterized selectors -- parameters passed as keyword arguments
item = self.components.history_panel.item(hid=1)
item.title.wait_for_and_click()
item.name.wait_for_text()

# State-aware selectors -- uses the first template variant that has both hid and state
item_ok = self.components.history_panel.item(hid=1, state="ok")
item_ok.wait_for_visible()

# Sub-component with scope parameter
editor = self.components.history_panel.editor.selector(scope=".history-index")
editor.toggle.wait_for_visible()

# Child selectors that reference parent via ${_}
# Given: title: '${_} .content-title' and _: '#current-history-panel [data-hid="1"]'
# Resolves to: '#current-history-panel [data-hid="1"] .content-title'
self.components.history_panel.item(hid=1).title.wait_for_and_click()
```

### SmartTarget Methods

When you reach a leaf selector in the component tree, you get a `SmartTarget`. It wraps the raw selector with driver-aware operations:

| Method | Purpose |
|--------|---------|
| `wait_for_visible(**kwds)` | Wait for element visibility, return element |
| `wait_for_and_click(**kwds)` | Wait for visibility then click |
| `wait_for_and_double_click(**kwds)` | Wait then double-click |
| `wait_for_text(**kwds)` | Wait for visibility, return `.text` |
| `wait_for_value(**kwds)` | Wait for visibility, return input value |
| `wait_for_clickable(**kwds)` | Wait until element is clickable |
| `wait_for_present(**kwds)` | Wait for element in DOM (may be hidden) |
| `wait_for_absent(**kwds)` | Wait for element to leave DOM |
| `wait_for_absent_or_hidden(**kwds)` | Wait for element to disappear or hide |
| `wait_for_and_send_keys(*text)` | Wait for visibility, send keystrokes |
| `wait_for_and_clear_and_send_keys(*text)` | Clear input then type |
| `wait_for_and_clear_aggressive_and_send_keys(*text)` | Aggressively clear (select-all + delete) then type |
| `wait_for_and_send_enter()` | Wait then press Enter |
| `assert_absent()` | Fail if element is in DOM |
| `assert_absent_or_hidden()` | Fail if element is visible |
| `assert_absent_or_hidden_after_transitions()` | Same but retries during transitions |
| `assert_disabled()` | Verify element is disabled |
| `has_class(class_name)` | Check if element has CSS class |
| `all()` | Return list of all matching elements |
| `wait_for_element_count_of_at_least(n)` | Wait for N+ matching elements |
| `is_displayed` (property) | Check display status without waiting |
| `is_absent` (property) | Check absence without waiting |
| `data_value(attribute)` | Read a `data-*` attribute |
| `assert_data_value(attribute, expected)` | Assert `data-*` attribute value |
| `axe_eval()` | Run accessibility audit on this component |
| `assert_no_axe_violations_with_impact_of_at_least(impact, excludes)` | Accessibility assertion |

### SmartComponent Traversal

`SmartComponent` wraps a `Component` (branch node in the tree). Attribute access on it returns either another `SmartComponent` (for sub-components) or a `SmartTarget` (for selectors):

```python
# SmartComponent -> SmartComponent -> SmartTarget
self.components.history_panel.item(hid=1).name.wait_for_text()
#     ^Component    ^Component     ^Target
```

Calling a `SmartComponent` with keyword arguments invokes the `_` selector of that component with those parameters:

```python
# These are equivalent:
self.components.history_panel.content_item(suffix='[data-hid="1"]')
# accesses history_panel.content_item._  with suffix='[data-hid="1"]'
```

---

## 5. Core Decorators and Fixtures

### @selenium_test

**Required on every E2E test method.** Wraps the test with:
- Debug dump on failure (screenshots, DOM, stack traces to `GALAXY_TEST_ERRORS_DIRECTORY`)
- Automatic retries (controlled by `GALAXY_TEST_SELENIUM_RETRIES`)
- Baseline accessibility assertion after test passes (via axe-core)

```python
@selenium_test
def test_my_feature(self):
    # test code
    pass
```

### @managed_history

Creates an isolated, named history for the test and cleans it up afterward. Internally calls `self.home()` and `self.history_panel_create_new_with_name()`. Also wraps with `@requires_new_history`.

```python
@selenium_test
@managed_history
def test_with_clean_history(self):
    # self.history_id is available
    self.perform_upload(self.get_filename("1.sam"))
    self.history_panel_wait_for_hid_ok(1)
```

### @selenium_only / @playwright_only

Skip a test if running with the wrong backend:

```python
@selenium_only("Uses Selenium Select class which requires tag_name attribute")
@selenium_test
def test_select_element(self):
    pass

@playwright_only("Uses Playwright-specific network interception")
@selenium_test
def test_network_logging(self):
    pass
```

### @requires_admin

Skip unless admin user is available:

```python
from galaxy_test.base.decorators import requires_admin

@selenium_test
@requires_admin
def test_admin_feature(self):
    self.admin_login()
    self.admin_open()
```

### @transient_failure

Mark known flaky tests with a GitHub issue link:

```python
from galaxy.util.unittest_utils import transient_failure

@transient_failure(issue=21224)
@selenium_test
def test_flaky_sharing(self):
    pass

# When a potential fix is merged:
@transient_failure(issue=21224, potentially_fixed=True)
@selenium_test
def test_flaky_sharing(self):
    pass
```

### pytest conftest.py Fixtures

`lib/galaxy_test/selenium/conftest.py` provides two fixtures:

- `real_driver` (session scope) -- starts a `GalaxyTestDriver` if `GALAXY_TEST_ENVIRONMENT_CONFIGURED` is not set; yields `None` otherwise
- `embedded_driver` (class scope) -- attaches `real_driver` to `request.cls._test_driver`

---

## 6. Common Patterns

### Pattern 1: Basic Upload and Verify

From `lib/galaxy_test/selenium/test_uploads.py`:

```python
class TestUploads(SeleniumTestCase, UsesHistoryItemAssertions):
    @selenium_only("Not yet migrated to support Playwright backend")
    @selenium_test
    def test_upload_file(self):
        self.perform_upload(self.get_filename("1.sam"))
        self.history_panel_wait_for_hid_ok(1)

        history_count = len(self.history_contents())
        assert history_count == 1

        self.history_panel_click_item_title(hid=1, wait=True)
        self.assert_item_summary_includes(1, "28 lines")
```

### Pattern 2: Register, Logout, Login

From `lib/galaxy_test/selenium/test_login.py`:

```python
class TestLogin(SeleniumTestCase):
    @selenium_test
    def test_logging_in(self):
        email = self._get_random_email()
        self.register(email)
        self.logout_if_needed()
        self.home()
        self.submit_login(email, assert_valid=True)
        self.assert_no_error_message()
        assert self.is_logged_in()
```

### Pattern 3: Workflow Execution via RunsWorkflows Mixin

From `lib/galaxy_test/selenium/test_workflow_run.py`:

```python
class TestWorkflowRun(SeleniumTestCase, UsesHistoryItemAssertions, RunsWorkflows):
    ensure_registered = True

    @selenium_only("Not yet migrated to support Playwright backend")
    @selenium_test
    @managed_history
    def test_simple_execution(self):
        self.perform_upload(self.get_filename("1.fasta"))
        self.wait_for_history()
        self.workflow_run_open_workflow(WORKFLOW_SIMPLE_CAT_TWICE)
        self.screenshot("workflow_run_simple_ready")
        self.workflow_run_submit()
        self.sleep_for(self.wait_types.UX_TRANSITION)
        self.screenshot("workflow_run_simple_submitted")
        self.workflow_run_wait_for_ok(hid=2, expand=True)
        self.assert_item_summary_includes(2, "2 sequences")
        self.screenshot("workflow_run_simple_complete")
```

### Pattern 4: Admin Tests

From `lib/galaxy_test/selenium/test_admin_app.py`:

```python
class TestAdminApp(SeleniumTestCase):
    run_as_admin = True

    @selenium_only("Not yet migrated to support Playwright backend")
    @selenium_test
    @requires_admin
    def test_html_allowlist(self):
        admin_component = self.components.admin
        self.admin_login()
        self.admin_open()
        self.sleep_for(self.wait_types.UX_RENDER)
        self.screenshot("admin_landing")
        admin_component.index.allowlist.wait_for_and_click()
        self.sleep_for(self.wait_types.UX_RENDER)
        self.screenshot("admin_allowlist_landing")
```

### Pattern 5: Dataset Editing with Component Assertions

From `lib/galaxy_test/selenium/test_dataset.py`:

```python
class TestDataset(SeleniumTestCase):
    ensure_registered = True

    @selenium_test
    @managed_history
    def test_history_dataset_rename(self):
        history_entry = self.perform_single_upload(self.get_filename("1.txt"))
        hid = history_entry.hid
        self.wait_for_history()
        self.history_panel_wait_for_hid_ok(hid)
        self.history_panel_item_edit(hid=hid)

        edit = self.components.edit_dataset_attributes
        name_component = edit.name_input
        assert name_component.wait_for_value() == "1.txt"

        # Accessibility check on the edit form
        edit._.assert_no_axe_violations_with_impact_of_at_least(
            "critical", excludes=FORMS_VIOLATIONS
        )

        name_component.wait_for_and_clear_and_send_keys("newname.txt")
        edit.save_button.wait_for_and_click()
        edit.alert.wait_for_visible()

        assert edit.alert.has_class("alert-success")
        assert name_component.wait_for_value() == "newname.txt"
        assert self.history_panel_item_component(hid=hid).name.wait_for_text() == "newname.txt"
```

### Pattern 6: Invocation Grid with Paging (API Setup + UI Test)

From `lib/galaxy_test/selenium/test_invocation_grid.py`:

```python
class TestInvocationGridSelenium(SeleniumTestCase, TestsGalaxyPagers):
    ensure_registered = True

    @selenium_only("Not yet migrated to support Playwright backend")
    @selenium_test
    def test_grid(self):
        # API setup -- create 30 invocations programmatically
        history_id = self.dataset_populator.new_history()
        self.workflow_populator.run_workflow(
            WORKFLOW_RENAME_ON_INPUT,
            history_id=history_id,
            assert_ok=True,
            wait=True,
            invocations=30,
        )

        # UI testing -- verify paging behavior
        self.navigate_to_invocations_grid()
        invocations = self.components.invocations
        invocations.invocations_table.wait_for_visible()

        self._assert_showing_n_invocations(25)
        invocations.pager.wait_for_visible()
        self._next_page(invocations)
        self._assert_current_page_is(invocations, 2)
        self._assert_showing_n_invocations(5)

    @retry_assertion_during_transitions
    def _assert_showing_n_invocations(self, n):
        assert len(self.invocation_index_table_elements()) == n
```

### Pattern 7: History Panel with Inline Retry Assertions

From `lib/galaxy_test/selenium/test_history_panel.py`:

```python
class TestHistoryPanel(SeleniumTestCase):
    ensure_registered = True

    @selenium_only("Not yet migrated to support Playwright backend")
    @selenium_test
    def test_history_panel_annotations_change(self):
        history_panel = self.components.history_panel

        @retry_assertion_during_transitions
        def assert_current_annotation(expected, is_equal=True):
            text_component = history_panel.annotation_editable_text
            current_annotation = text_component.wait_for_visible()
            if is_equal:
                assert current_annotation.text == expected
            else:
                assert current_annotation.text != expected

        # Assert no annotation initially
        history_panel.annotation_area.assert_absent_or_hidden()

        # Set and verify annotation
        initial_annotation = self._get_random_name(prefix="arbitrary_annotation_")
        self.set_history_annotation(initial_annotation)
        assert_current_annotation(initial_annotation)

        # Change and verify
        changed_annotation = self._get_random_name(prefix="arbitrary_annotation_")
        self.set_history_annotation(changed_annotation)
        assert_current_annotation(initial_annotation, is_equal=False)
        assert_current_annotation(changed_annotation, is_equal=True)
```

### Pattern 8: Workflow Editor with Component Chains

From `lib/galaxy_test/selenium/test_workflow_editor.py`:

```python
class TestWorkflowEditor(SeleniumTestCase, RunsWorkflows):
    ensure_registered = True

    @selenium_only("Not yet migrated to support Playwright backend")
    @selenium_test
    def test_basics(self):
        editor = self.components.workflow_editor
        annotation = "basic_test"
        name = self.workflow_create_new(annotation=annotation)
        self.assert_wf_name_is(name)
        self.assert_wf_annotation_is(annotation)

        editor.canvas_body.wait_for_visible()

        # Verify save button is disabled on fresh load
        save_button = self.components.workflow_editor.save_button
        save_button.assert_disabled()

        self.screenshot("workflow_editor_blank")
```

---

## 7. API Setup vs UI Interaction

A critical pattern in Galaxy E2E tests: use the API for test setup and the UI only for what you are actually testing.

**Use API/populator methods for:**
- Creating histories, datasets, workflows, pages
- Running tools/workflows to produce test data
- Any setup that is not the subject of the test

**Use UI methods for:**
- The specific UI interaction you are testing

```python
@selenium_test
@managed_history
def test_dataset_details_shows_metadata(self):
    # API setup - fast and reliable, not what we're testing
    self.dataset_populator.new_dataset(
        self.history_id,
        content="chr1\t100\t200\ntest",
        file_type="bed",
    )

    # UI interaction - THIS is what we're testing
    self.history_panel_wait_for_hid_ok(1)
    self.history_panel_click_item_title(hid=1)
    self.assert_item_dbkey_displayed_as(1, "?")
```

| Scenario | Use | Method |
|----------|-----|--------|
| Testing upload form | UI | `self.perform_upload()` |
| Need dataset for other test | API | `self.dataset_populator.new_dataset()` |
| Testing workflow editor | UI | `self.workflow_run_open_workflow()` |
| Need workflow for invocation test | API | `self.workflow_populator.run_workflow()` |
| Testing history panel display | UI | `self.history_panel_click_item_title()` |
| Need history with 10 datasets | API | loop with `new_dataset()` |

### Available Populators

All `SeleniumTestCase` instances have these properties:

| Populator | Access | Key Methods |
|-----------|--------|-------------|
| `DatasetPopulator` | `self.dataset_populator` | `new_history()`, `new_dataset()`, `run_tool()`, `wait_for_history()`, `get_history_dataset_content()` |
| `DatasetCollectionPopulator` | `self.dataset_collection_populator` | `create_list_in_history()`, `create_pair_in_history()` |
| `WorkflowPopulator` | `self.workflow_populator` | `upload_yaml_workflow()`, `run_workflow()`, `simple_workflow()` |

These populators use the browser session cookies for authentication (via `SeleniumSessionGetPostMixin`), so they operate as the currently logged-in user.

---

## 8. Waiting and Retry Strategies

### Wait Types

Galaxy defines named wait types with sensible defaults (in seconds), scalable via `GALAXY_TEST_TIMEOUT_MULTIPLIER`:

| Wait Type | Default | Use Case |
|-----------|---------|----------|
| `UX_RENDER` | 1s | Form rendering, callback registration |
| `UX_TRANSITION` | 5s | Fade in/out, slide animations |
| `UX_POPUP` | 15s | Toastr popups, dismiss animations |
| `DATABASE_OPERATION` | 10s | Creating histories, saving |
| `JOB_COMPLETION` | 45s | Tool jobs, workflow steps |
| `GIE_SPAWN` | 30s | Interactive environment launch |
| `SHED_SEARCH` | 30s | Tool Shed queries |
| `REPO_INSTALL` | 60s | Tool Shed installation |
| `HISTORY_POLL` | 3s | History state polling interval |

Usage:

```python
# Sleep for a specific wait type
self.sleep_for(self.wait_types.UX_RENDER)

# Get the actual timeout value (with multiplier applied)
timeout = self.wait_length(self.wait_types.JOB_COMPLETION)
```

### SmartTarget Waits (Preferred)

Always prefer SmartTarget waits over raw selectors:

```python
# Good: SmartTarget wait
self.components.history_panel.item(hid=1).wait_for_visible()

# Less good: raw selector wait (use only when no component exists)
self.wait_for_selector_visible(".some-element")
```

### History Wait Methods

```python
# Wait for a specific HID to reach "ok" state
self.history_panel_wait_for_hid_ok(1)

# Wait for a specific HID + state
self.history_panel_wait_for_hid_state(1, "error")

# Wait for all jobs in current history to complete
self.wait_for_history()

# Wait for an HID to be hidden (e.g. after collection creation hides source items)
self.history_panel_wait_for_hid_hidden(1)

# Wait for HID ok, with fallback refresh if panel hasn't polled yet
self.history_panel_wait_for_hid_ok(hid, allowed_force_refreshes=1)
```

### retry_during_transitions

For assertions that may fail during UI transitions (stale elements, intercepted clicks), use `@retry_during_transitions`:

```python
from galaxy.selenium.navigates_galaxy import retry_during_transitions

@retry_during_transitions
def assert_workflow_has_changes_and_save(self):
    save_button = self.components.workflow_editor.save_button
    save_button.wait_for_visible()
    assert not save_button.has_class("disabled")
    save_button.wait_for_and_click()
```

This retries the decorated function up to 10 times (with 0.1s sleep between attempts) when exceptions indicate a page transition (stale element, not clickable, click intercepted).

The variant `retry_assertion_during_transitions` (from `framework.py`) also retries on `AssertionError`, making it suitable for assertion methods:

```python
from .framework import retry_assertion_during_transitions

@retry_assertion_during_transitions
def _assert_showing_n_invocations(self, n):
    assert len(self.invocation_index_table_elements()) == n
```

Both can be used as inline decorators within test methods:

```python
def test_something(self):
    @retry_assertion_during_transitions
    def assert_annotation(expected):
        text = self.components.history_panel.annotation_editable_text.wait_for_text()
        assert text == expected

    assert_annotation("my annotation")
```

### Custom Waits with _wait_on

For situations not covered by SmartTarget methods, use `self._wait_on()`:

```python
def wait_for_history(self, assert_ok=True):
    def history_becomes_terminal(driver=None):
        state = self.api_get(f"histories/{self.current_history_id()}")["state"]
        if state not in ["running", "queued", "new", "ready"]:
            return state
        return None

    final_state = self._wait_on(
        history_becomes_terminal,
        "history to become terminal",
        wait_type=WAIT_TYPES.JOB_COMPLETION,
    )
    if assert_ok:
        assert final_state == "ok"
```

---

## 9. Accessibility Testing

### Automatic Baseline Testing

The `@selenium_test` decorator automatically runs baseline accessibility checks after each test using [axe-core](https://github.com/dequelabs/axe-core). This can be disabled with `GALAXY_TEST_SKIP_AXE=1`.

### Component-Level Accessibility Assertions

```python
# Assert no violations at or above "moderate" impact on the login form
login = self.components.login
login.form.assert_no_axe_violations_with_impact_of_at_least("moderate")

# With known violations excluded (for components that have recognized issues)
VIOLATION_EXCEPTIONS = ["heading-order", "label"]
self.components.history_panel._.assert_no_axe_violations_with_impact_of_at_least(
    "moderate", VIOLATION_EXCEPTIONS
)
```

Impact levels (from least to most severe): `"minor"`, `"moderate"`, `"serious"`, `"critical"`.

---

## 10. Selenium Integration Tests

Tests in `test/integration_selenium/` combine browser automation with custom Galaxy configuration. They inherit from `SeleniumIntegrationTestCase`, which merges `IntegrationTestCase` (for Galaxy config control) with `TestWithSeleniumMixin` (for browser control).

```python
# test/integration_selenium/framework.py
class SeleniumIntegrationTestCase(
    integration_util.IntegrationTestCase,
    framework.TestWithSeleniumMixin,
    framework.UsesLibraryAssertions,
):
    def setUp(self):
        super().setUp()
        self.setup_selenium()

    def tearDown(self):
        self.tear_down_selenium()
        super().tearDown()
```

### Example: FTP Upload Testing

From `test/integration_selenium/test_upload_ftp.py`:

```python
import os
from .framework import selenium_test, SeleniumIntegrationTestCase

class TestUploadFtpSeleniumIntegration(SeleniumIntegrationTestCase):
    ensure_registered = True

    @classmethod
    def handle_galaxy_config_kwds(cls, config):
        super().handle_galaxy_config_kwds(config)
        ftp_dir = cls.ftp_dir()
        os.makedirs(ftp_dir)
        config["ftp_upload_dir"] = ftp_dir
        config["ftp_upload_site"] = "ftp://ftp.galaxyproject.com"

    @classmethod
    def ftp_dir(cls):
        return cls.temp_config_dir("ftp")

    @selenium_test
    def test_upload_simplest(self):
        user_ftp_dir = self._create_ftp_dir()
        file_path = os.path.join(user_ftp_dir, "0.txt")
        with open(file_path, "w") as f:
            f.write("Hello World!")

        self.home()
        self.components.upload.start.wait_for_and_click()
        self.components.upload.file_dialog.wait_for_and_click()
        self.components.upload.file_source_selector(path="gxftp://").wait_for_and_click()
        self.components.upload.file_source_selector(path="gxftp://0.txt").wait_for_and_click()
        self.components.upload.file_dialog_ok.wait_for_and_click()
        self.upload_start()
        self.sleep_for(self.wait_types.UX_RENDER)
        self.wait_for_history()
```

Key differences from regular E2E tests:
- Each test class spins up its own Galaxy server (expensive)
- Can modify any Galaxy config option via `handle_galaxy_config_kwds`
- Can access Galaxy internals via `self._app`
- Cannot be run against external Galaxy instances

---

## 11. Playwright Compatibility

Selenium and Playwright tests share the same test files. Both backends implement a common interface via `HasDriverProxy`, which delegates to either `HasDriver` (Selenium) or `HasPlaywrightDriver` (Playwright).

### Writing Backend-Agnostic Tests

To ensure tests work with both backends:

1. **Prefer SmartTarget/SmartComponent methods** over raw Selenium API calls. These work identically across both backends.

2. **Avoid `self.driver`** -- this only works with Selenium. If you need it, gate the test:

   ```python
   @selenium_only("Uses ActionChains which requires Selenium driver")
   @selenium_test
   def test_drag_and_drop(self):
       action_chains = self.action_chains()
       # ...
   ```

3. **File uploads differ by backend**. The `upload_queue_local_file` method in `navigates_galaxy.py` handles this transparently:

   ```python
   def upload_queue_local_file(self, test_path, tab_id="regular"):
       if self.backend_type == "playwright":
           with self.page.expect_file_chooser() as fc_info:
               self.wait_for_and_click_selector(f"div#{tab_id} button#btn-local")
           file_chooser = fc_info.value
           file_chooser.set_files(test_path)
       else:
           self.wait_for_and_click_selector(f"div#{tab_id} button#btn-local")
           file_upload = self.wait_for_selector(f'div#{tab_id} input[type="file"]')
           file_upload.send_keys(test_path)
   ```

4. **Check `self.backend_type`** when absolutely necessary:

   ```python
   if self.backend_type == "playwright":
       # playwright-specific code
   else:
       # selenium-specific code
   ```

### Known Incompatibilities

| Feature | Selenium | Playwright |
|---------|----------|------------|
| `self.driver` | WebDriver instance | Raises `NotImplementedError` |
| `self.page` | Raises `NotImplementedError` | Playwright Page instance |
| `ActionChains` | Available | Not available |
| `Select` class | Available | Not available |
| Browser logs | Available via `driver.get_log()` | Not available |
| File upload | `send_keys()` on file input | `expect_file_chooser()` |
| `wait_for_element_count_of_at_least()` | Works | Raises `NotImplementedError` |

---

## 12. Debugging and Error Diagnosis

### Automatic Debug Dumps

When a test fails, `@selenium_test` automatically writes debug information to `GALAXY_TEST_ERRORS_DIRECTORY` (default: `database/test_errors/`):

| File | Content |
|------|---------|
| `stacktrace.txt` | Python stack trace |
| `last.png` | Screenshot at failure |
| `page_source.txt` | HTML page source |
| `DOM.txt` | Full DOM outer HTML |
| `last.a11y.json` | Accessibility audit results |
| `browser.log.json` | Browser console errors/warnings |
| `browser.log.verbose.json` | Full browser console log |

A `latest` symlink always points to the most recent failure directory.

### Snapshots

Insert debug snapshots at specific points in your test. These are saved only on failure:

```python
@selenium_test
def test_complex_workflow(self):
    self.snapshot("before-upload")
    self.perform_upload(self.get_filename("data.txt"))
    self.snapshot("after-upload")
    self.history_panel_wait_for_hid_ok(1)
    self.snapshot("upload-ok")
```

Each snapshot captures: screenshot (PNG), traceback, and stack trace. They are numbered sequentially and written to the test's error directory.

### Screenshots

Write screenshots regardless of pass/fail (requires `GALAXY_TEST_SCREENSHOTS_DIRECTORY` to be set):

```python
self.screenshot("workflow_editor_blank")
self.screenshot_if(screenshot_name)  # only if name is not None
```

### setup_with_driver()

Override this instead of `setUp()` for per-test setup that should dump debug info on failure and re-run on retries:

```python
def setup_with_driver(self):
    super().setup_with_driver()
    self.perform_upload(self.get_filename("fixture.fasta"))
    self.wait_for_history()
```

### Galaxy Logging in Browser

The test framework automatically injects JavaScript to enable Galaxy's client-side debug logging:

```javascript
window.localStorage.setItem("galaxy:debug", true);
window.localStorage.setItem("galaxy:debug:flatten", true);
```

This ensures console messages from Galaxy's client are captured in the browser log dumps.

---

## 13. Best Practices

### Test Isolation

1. **Always use `@managed_history`** when your test creates datasets. This ensures cleanup and prevents interference between tests.

2. **Use `ensure_registered = True`** on the test class to auto-login with a fresh user (or configured credentials).

3. **Generate random names and emails** to avoid collisions:
   ```python
   email = self._get_random_email()
   name = self._get_random_name(prefix="test_")
   ```

### Test Reliability

4. **Prefer SmartTarget waits over `sleep_for`**. Explicit waits (`wait_for_visible`, `wait_for_and_click`) are self-adjusting; sleeps are not.

5. **Use `@retry_assertion_during_transitions`** for assertions that check DOM state during UI transitions.

6. **Use `wait_for_absent_or_hidden` (not `assert_absent`)** when an element might still be transitioning out.

7. **Use API methods for test setup** to minimize flakiness from unrelated UI interactions. Only use UI methods for the interaction under test.

8. **Use `allowed_force_refreshes` parameter** on history wait methods when the history panel might not have polled recently:
   ```python
   self.history_panel_wait_for_hid_ok(hid, allowed_force_refreshes=1)
   ```

### Component System

9. **Always define selectors in `navigation.yml`** rather than hardcoding selectors in tests. If a selector you need does not exist, add it to `navigation.yml`.

10. **Prefer `data-description` attributes** for new selectors. They are stable, semantic, and self-documenting:
    ```yaml
    # In navigation.yml
    my_button:
      type: data-description
      selector: 'my feature button'
    ```
    ```html
    <!-- In Vue component -->
    <button data-description="my feature button">Click</button>
    ```

11. **Use parameterized selectors** to avoid constructing CSS strings in test code:
    ```yaml
    # Good: parameterized in navigation.yml
    item: '[data-hid="${hid}"]'
    ```
    ```python
    # Good: parameters passed at call site
    self.components.history_panel.item(hid=1).wait_for_visible()
    ```

### Code Organization

12. **Prefix helper methods** with the component/page name they operate on (following `NavigatesGalaxy` convention):
    ```python
    def history_panel_wait_for_hid_ok(self, hid, ...):
    def workflow_editor_click_save(self):
    def upload_start_click(self):
    ```

13. **Add reusable UI operations to `NavigatesGalaxy`** (in `lib/galaxy/selenium/navigates_galaxy.py`), not to individual test files. This makes them available to all tests and to Jupyter interactive sessions.

14. **Add reusable assertion patterns as mixins** in `framework.py` (e.g., `UsesHistoryItemAssertions`).

15. **Use `self.home()`** to reset to a known state. It navigates to the root URL and waits for the masthead.

### Playwright Compatibility

16. **Avoid direct Selenium/Playwright API calls** when possible. Use the abstraction layer (SmartTarget, NavigatesGalaxy methods).

17. **Mark backend-specific tests** with `@selenium_only` or `@playwright_only` with a reason string explaining why.

18. **Test with both backends** if your test should be backend-agnostic. Most tests should work with both.

### Performance

19. **Use `SharedStateSeleniumTestCase`** for tests that share expensive setup (multiple users, published resources) rather than repeating setup in each test.

20. **Batch API operations** when setting up test data. The populators handle this efficiently.

21. **Minimize `sleep_for` calls**. Each one adds wall-clock time to the test suite. Use explicit waits instead whenever possible.

---

## Appendix: Key NavigatesGalaxy Methods

A selection of the most commonly used methods from `NavigatesGalaxy` (in `lib/galaxy/selenium/navigates_galaxy.py`):

### Navigation

| Method | Purpose |
|--------|---------|
| `home()` | Navigate to Galaxy root, wait for masthead |
| `get(url)` | Navigate to relative URL |
| `navigate_to_histories_page()` | Open histories list |
| `navigate_to_invocations_grid()` | Open invocations grid |
| `navigate_to_pages()` | Open pages list |
| `navigate_to_published_workflows()` | Open published workflows |
| `navigate_to_user_preferences()` | Open user preferences |
| `navigate_to_published_histories()` | Open published histories |
| `navigate_to_saved_visualizations()` | Open saved visualizations |

### Authentication

| Method | Purpose |
|--------|---------|
| `register(email, password, username)` | Register new user |
| `submit_login(email, password)` | Login existing user |
| `logout_if_needed()` | Logout if logged in |
| `admin_login()` | Login as admin |
| `is_logged_in()` | Check login state |
| `get_user_email()` | Get current user's email |
| `get_logged_in_user()` | Get current user dict via API |

### History Panel

| Method | Purpose |
|--------|---------|
| `history_panel_create_new()` | Create new history |
| `history_panel_create_new_with_name(name)` | Create named history |
| `history_panel_rename(name)` | Rename current history |
| `history_panel_wait_for_hid_ok(hid)` | Wait for dataset to reach "ok" |
| `history_panel_wait_for_hid_state(hid, state)` | Wait for specific state |
| `history_panel_wait_for_hid_deferred(hid)` | Wait for deferred state |
| `history_panel_click_item_title(hid)` | Expand/collapse dataset |
| `history_panel_wait_for_hid_hidden(hid)` | Wait for item to hide |
| `history_panel_item_component(hid)` | Get SmartTarget for item |
| `history_panel_expand_collection(hid)` | Expand collection view |
| `wait_for_history()` | Wait for all jobs to finish |
| `current_history_id()` | Get current history ID |
| `history_contents()` | Get history contents via API |

### File Upload

| Method | Purpose |
|--------|---------|
| `perform_upload(path, ext, genome)` | Upload file from local path |
| `perform_single_upload(path)` | Upload and return `HistoryEntry` |
| `perform_upload_of_pasted_content(content)` | Upload pasted text |
| `upload_list(paths, name)` | Upload files as a list collection |
| `upload_pair(paths, name)` | Upload files as a pair |
| `upload_paired_list(paths, name)` | Upload as list of pairs |
| `upload_uri(uri, wait)` | Upload from file source URI |

### Workflow Operations

| Method | Purpose |
|--------|---------|
| `workflow_create_new()` | Create new workflow in editor |
| `workflow_run_with_name(name)` | Open workflow run form by name |
| `workflow_run_submit()` | Submit workflow run |
| `workflow_editor_add_input(item_name)` | Add input to workflow |
| `workflow_editor_connect(source, sink)` | Connect nodes |
| `workflow_editor_click_save()` | Save workflow |
| `workflow_editor_add_tool_step(tool_id)` | Add tool step |

### Miscellaneous

| Method | Purpose |
|--------|---------|
| `sleep_for(wait_type)` | Sleep for scaled duration |
| `snapshot(description)` | Save debug snapshot |
| `screenshot(label)` | Save screenshot to directory |
| `_get_random_email()` | Generate random email |
| `_get_random_name(prefix, suffix)` | Generate random string |
| `api_get(endpoint)` | GET Galaxy API as current user |
| `api_post(endpoint, data)` | POST Galaxy API as current user |
| `api_delete(endpoint)` | DELETE Galaxy API as current user |
| `assert_no_error_message()` | Assert no error alert visible |
| `assert_error_message()` | Assert error alert is visible |
| `clear_tooltips()` | Dismiss any open tooltips |
| `fill(form_element, info_dict)` | Fill form fields by name |
