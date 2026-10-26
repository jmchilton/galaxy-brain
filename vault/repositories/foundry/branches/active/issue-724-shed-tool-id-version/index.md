---
upstream_base_branch: main
---
# implement-galaxy-tool-step: shed tool_id must be the full versioned GUID

- [View PR #727](https://github.com/galaxyproject/foundry/pull/727)
- [View on GitHub](https://github.com/galaxyproject/foundry/tree/issue-724-shed-tool-id-version)

## Status

Branch `issue-724-shed-tool-id-version` @ `ee92fdca` on `origin/main` `f48c01b6`, cherry-picked from smrnaseq run commit `1c675e1a`.

PR #727 open, not draft; fixes #724.

`make -k check` green locally except machine-local `check-vendored`; CI not yet seen.

## Evidence

[smrnaseq golden v0 build](../../../pipeline_runs/2026-10-25-wb2g-golden-smrnaseq-v0/index.md).
