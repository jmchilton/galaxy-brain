# galaxy#23896 — Workflow rename `#{input}` falls back to raw suffix matching and can name an output after the wrong input

[Issue](https://github.com/galaxyproject/galaxy/issues/23896) · [issue draft](issue_draft.md) · [proposal](proposal.md) · [debrief](debrief.md)

Workflow rename `#{name}` with an unqualified name falls back to raw path-suffix matching (from [#15978](https://github.com/galaxyproject/galaxy/pull/15978)), so it can match mid-segment (`#{s}` → `main|barcodes`) and name an output after the wrong input; filed from the [#23877](https://github.com/galaxyproject/galaxy/pull/23877) docs work; next: match whole last segments only (safe, ungated); handle ambiguous/missing references separately (warn and keep first match, or a workflow-level opt-in to reject — not a tool profile).

Closed 2026-10-06.
