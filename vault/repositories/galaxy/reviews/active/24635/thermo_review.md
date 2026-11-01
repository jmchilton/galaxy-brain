# Thermo review: #24635 Restrict the container images user-defined tools may use

- Profile: [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md)
- Model: Opus 5.5 (claude-opus-5-5), effort medium
- Reviewed commit: `64dad7223ea` (merge of `origin/release_26.2` into PR head `fa12a2252dc`), base `release_26.2`
- Follow-up refactor plan: [thermo_followup_refactor_issue.md](thermo_followup_refactor_issue.md)

## Verdict

The new `image_references.py` module is a good, focused abstraction: a parsed, typed `ImageReference`, small grammar, and it already pays for itself by replacing the hand-rolled prefix/regex logic in the linter and `biocontainer_tag_built`. That's the right shape. The main structural problem is the enforcement side. The allowlist *policy* (loop over declared containers, the "not allowed" message, invalid vs disallowed) gets written twice, once in `DynamicToolManager` and once inline in `BaseJobRunner._find_container`. The job-time copy is a `tool_type == "user_defined"` branch in a shared runner helper that has many callers, and Pulsar needs a bespoke `except` for it. Nothing here blocks a release-branch fix, but one small code-judo move removes the duplication. Broader reuse of the parser belongs in a follow-up.

## Findings

### P2 1: Allowlist policy is duplicated and the job-time copy lives in the wrong layer

The rule "this container is allowed for a user-defined tool, or here is why not" is implemented twice:

- `DynamicToolManager.ensure_container_allowed` (`lib/galaxy/managers/tools.py`) calls `allows()`. On `False` it re-parses the reference to tell invalid from disallowed, then builds the message `"Container '…' is not allowed for user defined tools on this Galaxy server. Allowed containers: …"`.
- `BaseJobRunner._find_container` (`lib/galaxy/jobs/runners/__init__.py`, already 1209 lines) adds a `tool.tool_type == "user_defined"` branch. The branch reaches into `self.app.dynamic_tool_manager.container_allowlist`, loops over `tool.containers` and copies the same message by hand. `ContainerNotAllowedError` is also defined in the runners package, so `pulsar.py` imports a policy exception from a runner module.

This is feature logic leaking into a shared runner helper. `_find_container` is about resolving a container, and it has about 8 call sites across runners (prepare path, Pulsar ×2, condor, k8s, aws, chronos, gcp). Each caller has its own error contract, which is why Pulsar needed a new `except ContainerNotAllowedError` arm with its own fail semantics. The `allows() -> bool` API is also too lossy for its callers. It collapses "malformed" and "not listed" into `False`, so the manager has to parse a second time to get the distinction back.

Suggested fix (small, fits the release branch): let the allowlist own the decision and the message, and let the manager own the "user-defined tool" policy:

```python
# image_references.py
class ContainerNotAllowedError(ValueError): ...

class ContainerAllowlist:
    def check(self, identifier: str) -> None:
        """Raise ImageReferenceError if malformed, ContainerNotAllowedError if not listed."""

# managers/tools.py
def ensure_container_allowed(self, container: str) -> None  # wraps check() -> RequestParameterInvalidException
def ensure_tool_containers_allowed(self, tool) -> None       # no-op unless tool.tool_type == "user_defined"
```

`_find_container` (or better, a single pre-resolution hook) then becomes a one-line `self.app.dynamic_tool_manager.ensure_tool_containers_allowed(tool)`. The message text lives in one place, the double parse goes away, and the exception moves next to the allowlist instead of the runners package. Whether the call site should move out of `_find_container` entirely, into a runner-agnostic point that runs once per job so the per-runner `except` arms aren't needed, is part of the follow-up plan. On this branch, at least collapse the two copies.

### P3 1: `biocontainer_tag_built` now has two sources of truth for the biocontainers location

`recommend.py` keeps `QUAY_BIOCONTAINERS_PREFIX = "quay.io/biocontainers"` and `BIOCONTAINERS_NAMESPACE`, but the rewritten check hardcodes `reference.registry != "quay.io"` alongside `namespace != BIOCONTAINERS_NAMESPACE`. The config default `quay.io/biocontainers/*` is a third copy. Suggest deriving registry and namespace from one constant, for example parsing `QUAY_BIOCONTAINERS_PREFIX` once with `_split_name`/the namespace-entry parser, or adding `QUAY_REGISTRY = "quay.io"` next to the prefix. That way the location is defined once.

### P3 2: `ContainerAllowlist` has two attributes both called "entries" with different meanings

`self.entries` holds the raw strings (used only by `describe()`), and `self._entries` holds the parsed `_Entry` objects. `unrestricted` is also public state. Renaming to `raw_entries`/`_rules` (or keeping only the parsed form plus a `describe()` that formats them) makes `allows()` easier to scan. Cheap nit.

## Non-findings / checked

- File size: `runners/__init__.py` (1209) and `pulsar.py` (1557) were already over 1k. The PR adds about 20 lines, and P2 1 shrinks that.
- `image_references.py` (146 lines) is direct and boring in a good way. The `_Entry.matches` tag/digest rules are explicit and documented once in the module docstring.
- Linter rewrite: replacing `CONTAINER_PREFIXES` + `DOCKER_IMAGE_RE` with the parser is a real simplification. `UNCHECKED_PREFIXES` duplicates a bit of scheme knowledge with `_strip_scheme`, which isn't worth a finding.
- Config: the `None` → schema-default special case in `GalaxyAppConfiguration.__init__` is a one-off, but the PR justifies it (galaxy-config can't import tool_util), and it follows the `tool_data_path` precedent.
