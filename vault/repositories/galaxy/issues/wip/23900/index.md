# galaxy#23900 — Workflow rename leaves a literal `#{...}` in the output name when an empty placeholder sits right before another

[Issue](https://github.com/galaxyproject/galaxy/issues/23900) · [issue draft](issue_draft.md) · [proposal](proposal.md) · [debrief](debrief.md)

Branch `issue_23900_rename_single_pass` (stacked on `issue_23896_rename_input_segments`) — Workflow rename cursor loop skips a `#{...}` placeholder when the previous one resolves to 0–1 chars within one char of it (main trigger: unresolved reference → `""`, #23896), leaving a literal placeholder in the output name; inserted input names were also rescanned as template text; found while working on the #23896 branch; fix: single-pass `re.sub`; next: parent branch PR, then fork CI.
