---
type: research
subtype: component
component: API Tests
tags:
  - research/component
  - galaxy/testing
  - galaxy/api
status: draft
created: 2026-02-16
revised: 2026-02-16
revision: 1
ai_generated: true
---

# Writing Galaxy API Tests

Galaxy API tests live in `lib/galaxy_test/api/` and test backend functionality by exercising the Galaxy REST API. This document covers the plumbing, helpers, and patterns for writing them.

## Class Hierarchy

```python
class ApiTestCase(FunctionalTestCase, UsesApiTestCaseMixin, UsesCeleryTasks):
    # Multiple inheritance - combines all three parent classes
```

- `FunctionalTestCase` (`lib/galaxy_test/base/testcase.py`) - server config, URL setup
- `UsesApiTestCaseMixin` - HTTP methods, assertions, user switching
- `UsesCeleryTasks` - async task handling

`ApiTestCase` lives in `lib/galaxy_test/api/_framework.py`. It wires together server lifecycle with API interaction utilities and Celery configuration. unittest-style API test classes inherit from it. Modern pytest-style tests use fixtures directly instead (see below).

### UsesApiTestCaseMixin

Provides HTTP verb wrappers, assertion helpers, and user context switching. Key members:

- `_get(path, data, admin)` / `_post(path, data, json, admin)` / `_put()` / `_patch()` / `_delete()` / `_head()` / `_options()`
- `_assert_status_code_is(response, code)` / `_assert_has_keys(dict, *keys)` / `_assert_error_code_is(response, code)`
- `_api_url(path, params, use_key, use_admin_key)` - construct full URL with auth
- `_different_user(email, anon)` - context manager for user switching
- `galaxy_interactor` property - the underlying `ApiTestInteractor`

### GalaxyInteractorApi / ApiTestInteractor

`ApiTestInteractor` (in `lib/galaxy_test/base/api.py`) wraps `requests` and handles API key auth. It's what the HTTP methods delegate to. There's also `AnonymousGalaxyInteractor` which overrides `_get_user_key()` to return `None`, simulating unauthenticated API access.

---

## Test Structure

### unittest-style (Classic Pattern)

```python
from galaxy_test.base.populators import DatasetPopulator
from ._framework import ApiTestCase

class TestMyFeatureApi(ApiTestCase):
    dataset_populator: DatasetPopulator

    def setUp(self):
        super().setUp()
        self.dataset_populator = DatasetPopulator(self.galaxy_interactor)

    def test_something(self):
        history_id = self.dataset_populator.new_history()
        # ... assertions ...
```

### pytest-style (Modern Pattern)

```python
from galaxy_test.base.populators import (
    DatasetPopulator,
    RequiredTool,
    TargetHistory,
)
from galaxy_test.base.decorators import requires_tool_id

@requires_tool_id("cat1")
def test_cat_tool(target_history: TargetHistory, required_tool: RequiredTool):
    hda = target_history.with_dataset("hello\nworld").src_dict
    execution = required_tool.execute().with_inputs({"input1": hda})
    execution.assert_has_single_job.with_output("out_file1").with_contents("hello\nworld\n")
```

Both styles work. unittest-style (class-based) tests dominate the codebase; pytest-style is newer and growing.

---

## HTTP Methods

All paths are relative to `/api/`. The `admin=True` flag uses the master API key. These methods accept additional `**kwds` beyond what's shown here (headers, files, etc.) that pass through to the underlying `requests` call.

```python
# Basic CRUD
response = self._get("histories")
response = self._post("histories", data={"name": "Test"})
response = self._put(f"histories/{history_id}", data=payload)
response = self._patch(f"histories/{history_id}", data=updates)
response = self._delete(f"histories/{history_id}")

# Send JSON body (not form-encoded)
response = self._post("histories", data=payload, json=True)

# Admin operations
response = self._get("users", admin=True)

# Run-as (impersonate another user; requires admin)
response = self._post("histories", data=data,
                      headers={"run-as": other_user_id}, admin=True)
```

---

## Populators

Populators are the primary abstraction for creating test data. They wrap Galaxy API calls into convenient high-level operations.

### Architecture

Populators use an abstract-concrete pattern:
1. **Abstract base** (`BaseDatasetPopulator`, etc.) defines operations
2. **HTTP mixin** (`GalaxyInteractorHttpMixin`) implements `_get()`, `_post()`, etc.
3. **Concrete class** (`DatasetPopulator`) combines both

### DatasetPopulator

The workhorse. Despite the name, it covers far more than datasets - users, pages, object stores, etc.

```python
self.dataset_populator = DatasetPopulator(self.galaxy_interactor)
```

**Histories:**
```python
history_id = self.dataset_populator.new_history("Test History")

# Context manager with auto-cleanup
with self.dataset_populator.test_history() as history_id:
    # use history_id
# history deleted here
```

**Creating datasets:**
```python
# Inline content (preferred for simple tests)
hda = self.dataset_populator.new_dataset(history_id, content="test data", wait=True)

# From file
hda = self.dataset_populator.new_bam_dataset(history_id, self.test_data_resolver)

# Deferred (don't download yet - downloads on first job access)
hda = self.dataset_populator.create_deferred_hda(history_id, uri="https://...", ext="bam")
```

**Reading dataset content:**
```python
# Most recent dataset in history (default)
content = self.dataset_populator.get_history_dataset_content(history_id)

# By hid
content = self.dataset_populator.get_history_dataset_content(history_id, hid=7)

# By dataset ID
content = self.dataset_populator.get_history_dataset_content(history_id, dataset_id=hda["id"])

# By dataset dict
content = self.dataset_populator.get_history_dataset_content(history_id, dataset=hda)

# Metadata instead of content
details = self.dataset_populator.get_history_dataset_details(history_id, dataset_id=hda["id"])
```

**Running tools:**
```python
result = self.dataset_populator.run_tool(
    tool_id="cat1",
    inputs={"input1": {"src": "hda", "id": dataset_id}},
    history_id=history_id
)
self.dataset_populator.wait_for_tool_run(history_id, result, assert_ok=True)
```

### WorkflowPopulator

```python
self.workflow_populator = WorkflowPopulator(self.galaxy_interactor)

# Simple workflow
workflow_id = self.workflow_populator.simple_workflow("Test Workflow")

# From YAML (gxformat2)
workflow_id = self.workflow_populator.upload_yaml_workflow("""
class: GalaxyWorkflow
inputs:
  input1: data
steps:
  step1:
    tool_id: cat1
    in:
      input1: input1
""")

# Invoke and wait
invocation_id = self.workflow_populator.invoke_workflow(
    workflow_id,
    request={"history_id": history_id, "inputs": {"0": {"src": "hda", "id": hda_id}}}
)
self.workflow_populator.wait_for_invocation(workflow_id, invocation_id)
```

### DatasetCollectionPopulator

```python
self.dataset_collection_populator = DatasetCollectionPopulator(self.galaxy_interactor)

# List
hdca = self.dataset_collection_populator.create_list_in_history(
    history_id, contents=["data1", "data2", "data3"], wait=True
)

# Pair
pair = self.dataset_collection_populator.create_pair_in_history(
    history_id,
    contents=[("forward", "ACGT"), ("reverse", "TGCA")],
    wait=True
)

# Nested (list:paired)
identifiers = self.dataset_collection_populator.nested_collection_identifiers(
    history_id, "list:paired"
)
```

### LibraryPopulator

```python
self.library_populator = LibraryPopulator(self.galaxy_interactor)
library = self.library_populator.new_private_library("Test Library")
```

### TargetHistory (Fluent API)

Used with pytest fixtures. Returns objects with `.src_dict` for tool inputs.

```python
def test_tool(target_history: TargetHistory, required_tool: RequiredTool):
    hda1 = target_history.with_dataset("1\t2\t3", named="Input1")
    hda2 = target_history.with_dataset("4\t5\t6", named="Input2")
    execution = required_tool.execute().with_inputs({
        "input1": hda1.src_dict,
        "input2": hda2.src_dict,
    })
```

---

## The `*_raw` Pattern

Many populator methods come in pairs - a convenience method that returns parsed JSON and a `_raw` variant that returns the raw `Response`:

```python
# Convenience: asserts success, returns parsed dict
result = self.dataset_populator.run_tool("cat1", inputs, history_id)

# Raw: returns Response for testing error/edge cases
response = self.dataset_populator.run_tool_raw("cat1", inputs, history_id)
assert_status_code_is(response, 200)
```

Use raw methods when testing error responses, status codes, or validation:

```python
response = self.dataset_populator.create_landing_raw(invalid_request, "tool")
assert_status_code_is(response, 400)
assert "Field required" in response.json()["err_msg"]
```

---

## Assertions

Module: `lib/galaxy_test/base/api_asserts.py`

### Status Codes
```python
from galaxy_test.base.api_asserts import (
    assert_status_code_is,
    assert_status_code_is_ok,
)

assert_status_code_is(response, 200)       # exact match
assert_status_code_is_ok(response)          # any 2XX
```

Error messages include the JSON body for debugging.

### Response Structure
```python
from galaxy_test.base.api_asserts import assert_has_keys, assert_not_has_keys

assert_has_keys(response.json()[0], "id", "name", "state")
assert_not_has_keys(response.json()[0], "admin_only_field")
```

### Galaxy Error Codes
```python
from galaxy_test.base.api_asserts import (
    assert_error_code_is,
    assert_error_message_contains,
    assert_object_id_error,
)

# Can use raw int or import named codes
from galaxy.exceptions.error_codes import error_codes_by_name
assert_error_code_is(response, error_codes_by_name["MALFORMED_ID"])
assert_error_code_is(response, 400009)                    # equivalent
assert_error_message_contains(response, "required field")
assert_object_id_error(response)                          # accepts 400 or 404
```

### Instance Methods

The test class also provides wrapper methods:
`self._assert_status_code_is()`, `self._assert_has_keys()`, `self._assert_error_code_is()`, etc.

---

## Decorators

Module: `lib/galaxy_test/base/decorators.py`

```python
from galaxy_test.base.decorators import (
    requires_admin,
    requires_new_user,
    requires_new_history,
    requires_new_library,
    requires_new_published_objects,
    requires_celery,
)
from galaxy_test.base.populators import skip_without_tool

@requires_admin
def test_admin_only(self): ...

@requires_new_user
def test_fresh_user(self): ...

@requires_new_history
def test_clean_history(self): ...

@skip_without_tool("cat1")
def test_cat_tool(self): ...
```

Decorators add pytest markers and check `GALAXY_TEST_SKIP_IF_REQUIRES_<tag>` env vars at runtime. When running against external Galaxy, tests skip if the required capability isn't available.

### `@requires_tool_id` (Modern Fixture-Based)

```python
from galaxy_test.base.decorators import requires_tool_id

@requires_tool_id("cat1")
def test_cat(required_tool: RequiredTool):
    execution = required_tool.execute().with_inputs({...})
```

The `conftest.py` auto-checks tool availability and injects `required_tool` fixture.

---

## Pytest Fixtures

Defined in `lib/galaxy_test/api/conftest.py`.

### Session-Scoped (shared across all tests)

| Fixture | Type | Purpose |
|---------|------|---------|
| `galaxy_interactor` | `ApiTestInteractor` | API interaction object |
| `dataset_populator` | `DatasetPopulator` | Dataset creation helper |
| `dataset_collection_populator` | `DatasetCollectionPopulator` | Collection creation |
| `anonymous_galaxy_interactor` | `AnonymousGalaxyInteractor` | Unauthenticated access |

### Function-Scoped (fresh per test)

| Fixture | Type | Purpose |
|---------|------|---------|
| `history_id` | `str` | Fresh history, cleaned up after test |
| `target_history` | `TargetHistory` | Fluent API for test data |
| `required_tool` | `RequiredTool` | Tool from `@requires_tool_id` marker |
| `required_tools` | `list[RequiredTool]` | Multiple tools |
| `tool_input_format` | `DescribeToolInputs` | Parametrized: `"legacy"`, `"21.01"`, `"request"` - tests using this run 3x |

### Auto-Used (session-scoped)

| Fixture | Purpose |
|---------|---------|
| `check_required_tools` | Auto-skips tests if `@requires_tool_id` tools unavailable (function-scoped) |
| `request_celery_app` | Celery application (depends on `celery_session_app` from pytest-celery) |
| `request_celery_worker` | Celery worker with Galaxy queues (depends on `celery_session_worker` from pytest-celery) |

Note: unittest-style tests get Celery via `UsesCeleryTasks` mixin methods (`_request_celery_app`, `_request_celery_worker`) instead of these fixtures.

---

## User Context Switching

```python
def test_permissions(self):
    # Create resource as default user
    history_id = self.dataset_populator.new_history()

    # Test as different user (auto-created if email doesn't exist)
    with self._different_user("other@example.com"):
        response = self._get(f"histories/{history_id}")
        self._assert_status_code_is(response, 403)

    # No args = uses OTHER_USER default account
    with self._different_user():
        response = self._get(f"histories/{history_id}")
        self._assert_status_code_is(response, 403)

    # Test anonymous access
    with self._different_user(anon=True):
        response = self._get("histories")
        # verify anonymous behavior
```

---

## Async & Job Waiting

### Waiting for Jobs/History

```python
# Wait for all jobs in history
self.dataset_populator.wait_for_history(history_id, assert_ok=True)

# Wait for specific job
self.dataset_populator.wait_for_job(job_id, assert_ok=True)

# Wait for workflow invocation
self.workflow_populator.wait_for_invocation(workflow_id, invocation_id)
```

### Celery Tasks

Galaxy uses Celery for background tasks. `UsesCeleryTasks` (mixed into `ApiTestCase`) auto-configures the test Celery worker.

```python
# Tool requests (modern async tool execution)
response = self.dataset_populator.tool_request_raw(tool_id, inputs, history_id)
tool_request_id = response.json()["tool_request_id"]
task_result = response.json()["task_result"]

self.dataset_populator.wait_on_task_object(task_result)
state = self.dataset_populator.wait_on_tool_request(tool_request_id)
```

### Short-Term Storage Downloads

```python
url = f"histories/{history_id}/prepare_store_download"
download_response = self._post(url, {"model_store_format": "tgz"}, json=True)
storage_request_id = self.dataset_populator.assert_download_request_ok(download_response)
self.dataset_populator.wait_for_download_ready(storage_request_id)
content = self._get(f"short_term_storage/{storage_request_id}")
```

### Generic Task Waiting

```python
# wait_on_state: callable must return a Response whose JSON has a "state" key.
# Polls until state is terminal (ok, error, etc). assert_ok=True fails on error states.
from galaxy_test.base.populators import wait_on_state
wait_on_state(lambda: self._get(f"jobs/{job_id}"), desc="job state", assert_ok=True)

# wait_on: generic callable returning truthy value when done, or None/falsy to keep polling.
from galaxy_test.base.populators import wait_on
wait_on(
    lambda: self._get(f"histories/{history_id}").json()["state"] == "ok" or None,
    desc="history ready",
    timeout=60
)
```

---

## Common Test Patterns

### Basic API Endpoint

```python
def test_list_endpoint(self):
    response = self._get("histories")
    assert_status_code_is(response, 200)
    data = response.json()
    assert isinstance(data, list)
    if data:
        assert_has_keys(data[0], "id", "name")
```

### CRUD

```python
def test_crud(self):
    # Create
    create_resp = self._post("histories", data={"name": "test"}, json=True)
    item_id = create_resp.json()["id"]

    # Read
    show_resp = self._get(f"histories/{item_id}")
    assert_status_code_is(show_resp, 200)

    # Update
    update_resp = self._put(f"histories/{item_id}", data={"name": "updated"}, json=True)
    assert_status_code_is(update_resp, 200)

    # Delete
    delete_resp = self._delete(f"histories/{item_id}")
    assert_status_code_is(delete_resp, 200)
```

### Error Response Testing

```python
def test_invalid_id(self):
    response = self._get("histories/invalid_id_12345")
    assert_object_id_error(response)  # accepts 400 MalformedId or 404 NotFound

def test_missing_field(self):
    response = self._post("items", data={})  # name required
    assert_status_code_is(response, 400)
    assert_error_message_contains(response, "name")
```

### Permission Isolation

```python
@requires_admin
def test_user_isolation(self):
    user_role_id = self.dataset_populator.user_private_role_id()

    with self._different_user():
        other_role_id = self.dataset_populator.user_private_role_id()

    admin_roles = self._get("roles", admin=True).json()
    user_roles = self._get("roles").json()

    assert user_role_id in [r["id"] for r in admin_roles]
    assert other_role_id not in [r["id"] for r in user_roles]
```

### Tool Execution (Classic)

```python
def test_tool(self):
    history_id = self.dataset_populator.new_history()
    hda = self.dataset_populator.new_dataset(history_id, content="hello", wait=True)

    result = self.dataset_populator.run_tool(
        tool_id="cat1",
        inputs={"input1": {"src": "hda", "id": hda["id"]}},
        history_id=history_id
    )
    self.dataset_populator.wait_for_tool_run(history_id, result, assert_ok=True)

    content = self.dataset_populator.get_history_dataset_content(history_id)
    assert "hello" in content
```

### Tool Execution (Modern Fluent)

```python
@requires_tool_id("cat1")
def test_cat(target_history: TargetHistory, required_tool: RequiredTool):
    hda = target_history.with_dataset("hello").src_dict
    execution = required_tool.execute().with_inputs({"input1": hda})
    execution.assert_has_single_job.with_output("out_file1").with_contents("hello\n")
```

### Tool Input Format Variations

The `tool_input_format` fixture parametrizes tests across legacy, 21.01, and request input formats:

```python
@requires_tool_id("multi_data_param")
def test_multidata(target_history, required_tool, tool_input_format: DescribeToolInputs):
    hda1 = target_history.with_dataset("A").src_dict
    hda2 = target_history.with_dataset("B").src_dict

    inputs = (
        tool_input_format.when.flat({
            "f1": {"batch": False, "values": [hda1, hda2]},
        })
        .when.nested({...})
        .when.request({...})
    )
    required_tool.execute().with_inputs(inputs)
```

---

## Fetch vs Upload

Two different dataset creation endpoints:

```python
# Upload: uses tools/upload1 tool directly
payload = self.dataset_populator.upload_payload(history_id, content="data")
response = self.dataset_populator.tools_post(payload)

# Fetch: uses tools/fetch endpoint (can fetch URLs, supports more sources)
payload = self.dataset_populator.fetch_payload(history_id, content="data")
response = self.dataset_populator.fetch(payload)
```

`new_dataset()` with `fetch_data=True` (the default) uses the fetch endpoint.

---

## Flaky Test Handling

```python
from galaxy.util.unittest_utils import transient_failure

@transient_failure(issue=21224)
def test_sometimes_fails(self):
    # Known intermittent failure tracked by GitHub issue
    ...

@transient_failure(issue=21242, potentially_fixed=True)
def test_maybe_fixed(self):
    # Fix submitted; CI monitors for continued failures
    ...
```

---

## Key File Reference

| File | Purpose |
|------|---------|
| `lib/galaxy_test/api/_framework.py` | `ApiTestCase` base class |
| `lib/galaxy_test/api/conftest.py` | Pytest fixtures |
| `lib/galaxy_test/base/populators.py` | Populators (DatasetPopulator, WorkflowPopulator, etc.) |
| `lib/galaxy_test/base/api_asserts.py` | Assertion helpers |
| `lib/galaxy_test/base/decorators.py` | Test decorators |
| `lib/galaxy_test/base/api.py` | `ApiTestInteractor`, `AnonymousGalaxyInteractor` |
| `lib/galaxy_test/base/testcase.py` | `FunctionalTestCase` base class |
| `lib/galaxy_test/driver/driver_util.py` | Test server lifecycle |

## Example Test Files

| Pattern | File | Style | Shows |
|---------|------|-------|-------|
| Simple CRUD | `lib/galaxy_test/api/test_roles.py` | unittest | GET/POST, admin vs user, `_different_user` |
| Dataset ops | `lib/galaxy_test/api/test_datasets.py` | unittest | Upload, search, update, delete |
| Modern fluent | `lib/galaxy_test/api/test_tool_execute.py` | pytest | `TargetHistory`, `RequiredTool`, `DescribeToolInputs` |
| History import/export | `lib/galaxy_test/api/test_histories.py` | unittest | Async tasks, short-term storage |
| User management | `lib/galaxy_test/api/test_users.py` | unittest | Permission testing, user context |
