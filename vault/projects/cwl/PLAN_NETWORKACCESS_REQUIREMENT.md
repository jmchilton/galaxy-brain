# Plan: Implement CWL NetworkAccess Requirement

## Problem

CWL conformance test `networkaccess_disabled` (v1.1, v1.2) expects a Docker job to
fail when it attempts network access without declaring `NetworkAccess: true`. Galaxy
runs all Docker containers with full network access by default, so the test passes
(job succeeds) when it should fail.

Galaxy lists `NetworkAccess` in `SUPPORTED_TOOL_REQUIREMENTS` (parser.py:87) but
never reads or acts on it.

## CWL spec behavior

- No `NetworkAccess` declared → network disabled inside container
- `NetworkAccess: {networkAccess: true}` → network enabled
- `NetworkAccess: {networkAccess: false}` → network disabled (explicit)

Docker equivalent: `--net=none` disables all networking.

## Test files

- `networkaccess2.cwl` — no NetworkAccess, runs `urllib.request.urlopen(...)` inside
  `python:3` container. Should fail (network disabled).
- `networkaccess.cwl` — has `NetworkAccess: {networkAccess: true}`, same command.
  Should succeed.

## Current code path

```
CwlToolSource.parse_requirements()          # parser/cwl.py:304
  → tool_proxy.docker_identifier()          # parser.py:334 → DockerRequirement
  → tool_proxy.docker_output_directory()    # parser.py:343 → DockerRequirement
  → builds ContainerDescription             # requirements.py:184
    (no network_access field)
  → ContainerDescription passed to DockerContainer
DockerContainer.containerize_command()      # container_classes.py:447
  → net=self.prop("net", None)              # line 491 — always None
  → build_docker_run_command(net=None)      # docker_util.py:97
    → no --net flag added                   # docker_util.py:158-159
    → container has full network access
```

## Changes

### 1. `lib/galaxy/tool_util/cwl/parser.py` — extract NetworkAccess

Add method to `ToolProxy` alongside `docker_output_directory()`:

```python
def network_access(self):
    for hint in self.hints_or_requirements_of_class("NetworkAccess"):
        return hint.get("networkAccess", False)
    return False
```

Default `False` matches CWL spec — network disabled unless explicitly enabled.

### 2. `lib/galaxy/tool_util/parser/cwl.py` — pass through to container dict

In `parse_requirements()` (line 304), after the `docker_output_directory` block:

```python
network_access = self.tool_proxy.network_access()
if network_access is not None:
    container["network_access"] = network_access
```

### 3. `lib/galaxy/tool_util/deps/requirements.py` — add field to ContainerDescription

Add `network_access` parameter to `ContainerDescription.__init__` (line 185):

```python
def __init__(
    self,
    identifier: str,
    type: str = DEFAULT_CONTAINER_TYPE,
    resolve_dependencies: bool = DEFAULT_CONTAINER_RESOLVE_DEPENDENCIES,
    shell: str = DEFAULT_CONTAINER_SHELL,
    docker_output_directory: Optional[str] = None,
    network_access: Optional[bool] = None,
) -> None:
    ...
    self.network_access = network_access
```

Add to `to_dict()` (line 213) and `from_dict()` (line 224) following the
`docker_output_directory` pattern.

### 4. `lib/galaxy/tool_util/deps/container_classes.py` — apply --net=none

In `containerize_command()` (line 447), change the `net=` argument at line 491:

```python
# Current:
net=self.prop("net", None),

# New:
net=self._resolve_net(),
```

Add helper:

```python
def _resolve_net(self):
    # Explicit destination-level override always wins
    explicit_net = self.prop("net", None)
    if explicit_net is not None:
        return explicit_net
    # CWL NetworkAccess: disable network unless explicitly allowed
    if self.container_description and hasattr(self.container_description, 'network_access'):
        if self.container_description.network_access is False or self.container_description.network_access is None:
            return "none"
    return None
```

**Important**: destination-level `net` setting takes precedence. Only apply
`--net=none` when the container description says network is not needed AND
no destination override exists. This avoids breaking existing Galaxy-native
tools that don't declare NetworkAccess.

**Scope concern**: This must ONLY apply to CWL tools, not Galaxy-native tools.
Galaxy-native tools don't declare NetworkAccess and would all break if we
defaulted to `--net=none`. The `network_access` field on ContainerDescription
will only be set by the CWL parser path, so native tools will have
`network_access=None` and we should NOT disable networking for None — only
for explicit `False`.

Revised logic:

```python
def _resolve_net(self):
    explicit_net = self.prop("net", None)
    if explicit_net is not None:
        return explicit_net
    if self.container_description and getattr(self.container_description, 'network_access', None) is False:
        return "none"
    return None
```

And in `parse_requirements()`, set `network_access=False` (not None) when a CWL
tool does not declare NetworkAccess:

```python
if docker_identifier:
    container = {"type": "docker", "identifier": docker_identifier}
    ...
    container["network_access"] = self.tool_proxy.network_access()  # False if not declared
```

### 5. `lib/galaxy/tool_util/deps/requirements.py` — parse_requirements_from_lists

The `containers` list flows through `parse_requirements_from_lists()`. Check that
`network_access` is passed through to `ContainerDescription`:

```python
# In parse_requirements_from_lists or wherever ContainerDescription is built from dict:
network_access = container_dict.get("network_access")
```

This should already work if `from_dict()` is updated (step 3).

## Testing

Red-to-green: run `networkaccess_disabled` from the integration test harness:

```bash
pytest -s -v test/integration/test_containerized_cwl_conformance.py \
  -k networkaccess_disabled
```

Also verify `networkaccess` (the positive test, network enabled) still passes if
it's in the conformance suite — it should continue to work since it declares
`NetworkAccess: {networkAccess: true}`.

Verify Galaxy-native Docker tools are unaffected — `network_access` will be None
for them, and `_resolve_net()` only acts on explicit `False`.

## Unresolved questions

- Should `_resolve_net` live on the base `Container` class or just `DockerContainer`? Singularity has different network semantics.
- The `networkaccess` (positive) test — is it in the conformance suite and currently passing, or also red? Need to check.
- Should we also handle the case where `NetworkAccess` is in hints vs requirements? CWL spec treats hints as advisory — unclear if network should still be restricted.
