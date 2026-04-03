# Simplify gxformat2 Contract in Galaxy

Galaxy uses gxformat2 for Format2↔native workflow conversion but also depends on test-infrastructure abstractions (`convert_and_import_workflow`, `ImporterGalaxyInterface`) that conflate format conversion with Galaxy API interaction. This PR simplifies that contract.

## Context

- `import_tool` has been removed from gxformat2 — `GalaxyUserTool` support is now pure source conversion (`tool_representation` field), no Galaxy API call needed
- `convert_and_import_workflow` is only used by Galaxy's test populators, not production code
- `ImporterGalaxyInterface` exists to support `convert_and_import_workflow` — production Galaxy uses `Format2ConverterGalaxyInterface` which raises `NotImplementedError` on `import_workflow`
- `python_to_workflow` accepts `galaxy_interface` but never uses it during conversion

## What Galaxy actually needs from gxformat2

Production (`lib/galaxy/managers/workflows.py`):
- `python_to_workflow` — Format2→native conversion
- `from_galaxy_native` — native→Format2 export
- `ImportOptions` — deduplication, encoding config
- `from_dict` (abstract CWL), `to_cytoscape`, `ordered_dump`/`ordered_load`

That's it. Everything else is test scaffolding.

## Changes

### 1. Rewrite `upload_yaml_workflow` in populators

**File:** `lib/galaxy_test/base/populators.py` (~line 2355)

Replace `convert_and_import_workflow(yaml_content, galaxy_interface=self, **kwds)` with inline logic:

```python
def upload_yaml_workflow(self, yaml_content, **kwds):
    round_trip_conversion = kwds.get("round_trip_format_conversion", False)
    client_convert = kwds.pop("client_convert", not round_trip_conversion)

    if client_convert:
        from gxformat2 import python_to_workflow
        from gxformat2.yaml import ordered_load
        as_python = ordered_load(yaml_content) if not isinstance(yaml_content, dict) else yaml_content
        workflow = python_to_workflow(as_python, galaxy_interface=None, workflow_directory=None)
    else:
        workflow = {"yaml_content": yaml_content} if not isinstance(yaml_content, dict) else yaml_content

    name = kwds.get("name")
    if name is not None:
        workflow["name"] = name
    import_kwds = {"fill_defaults": kwds.get("fill_defaults", True)}
    if kwds.get("publish"):
        import_kwds["publish"] = True
    if kwds.get("exact_tools"):
        import_kwds["exact_tools"] = True

    result = self.import_workflow(workflow, **import_kwds)
    workflow_id = result["id"]

    if round_trip_conversion:
        workflow_yaml_wrapped = self.download_workflow(workflow_id, style="format2_wrapped_yaml")
        round_trip_content = workflow_yaml_wrapped["yaml_content"]
        workflow_id = self.upload_yaml_workflow(round_trip_content, client_convert=False, round_trip_conversion=False)
    return workflow_id
```

Consider moving to `BaseWorkflowPopulator` so both API and Selenium populators share one implementation.

### 2. Same change in Selenium populator

**File:** `lib/galaxy_test/selenium/framework.py` (~line 983)

Same replacement, or inherit from `BaseWorkflowPopulator` if unified in step 1.

### 3. Remove `ImporterGalaxyInterface` from class hierarchies

**File:** `lib/galaxy_test/base/populators.py`
```python
# Before
class WorkflowPopulator(GalaxyInteractorHttpMixin, BaseWorkflowPopulator, ImporterGalaxyInterface):
# After
class WorkflowPopulator(GalaxyInteractorHttpMixin, BaseWorkflowPopulator):
```

**File:** `lib/galaxy_test/selenium/framework.py`
```python
# Before
class SeleniumSessionWorkflowPopulator(..., ImporterGalaxyInterface):
# After
class SeleniumSessionWorkflowPopulator(...):
```

`import_workflow` methods stay — they're used directly. They just no longer satisfy a gxformat2 abstract interface.

### 4. Remove `import_tool` from `WorkflowPopulator`

**File:** `lib/galaxy_test/base/populators.py` (~line 3061)

Remove the `import_tool` method. It was only there to implement `ImporterGalaxyInterface`. If tests need `create_tool`, they use `dataset_populator.create_tool()` directly.

### 5. Update imports

**File:** `lib/galaxy_test/base/populators.py`
```python
# Remove
from gxformat2 import convert_and_import_workflow, ImporterGalaxyInterface
# Keep/add
from gxformat2 import python_to_workflow
```

**File:** `lib/galaxy_test/selenium/framework.py`
```python
# Remove
from gxformat2 import convert_and_import_workflow, ImporterGalaxyInterface
```

### 6. Follow-up: Remove `Format2ConverterGalaxyInterface`

**File:** `lib/galaxy/managers/workflows.py` (~line 2473)

Once gxformat2 makes `galaxy_interface` optional on `python_to_workflow`, remove this class and pass `None`. This is a 1-liner follow-up, not blocking for this PR. For now passing `None` already works since the parameter is never used during conversion.

## Verification

- All Galaxy API tests pass (the upload path is functionally identical)
- All Selenium tests pass
- `grep -r "convert_and_import_workflow\|ImporterGalaxyInterface" lib/` returns no hits
- `grep -r "import_tool" lib/galaxy_test/` returns no hits for the removed method

## Questions

- Unify `upload_yaml_workflow` into `BaseWorkflowPopulator`? Selenium version is simpler (no round_trip) — unifying means adding `import_workflow` as abstract on `BaseWorkflowPopulator`
- Pass `None` as `galaxy_interface` now or wait for gxformat2 to formally make it optional?
- Does removing `import_tool` from `WorkflowPopulator` break any test that calls it directly? (Search found no direct callers beyond the interface requirement.)
- Minimum gxformat2 version bump needed? Current gxformat2 still exports these symbols — Galaxy just stops using them
