@REPOSITORY_ISSUES.md

## The Index

`vault/repositories/PROJECT/issues/MY_ISSUES.md` is the triage index for PROJECT's issues: one line per issue that still needs someone's move. Detail lives in the issue's directory beside it, under `STATUS/`, per [`REPOSITORY_ISSUES.md`](REPOSITORY_ISSUES.md), so entry links are relative (`STATUS/12345/index.md`). An agent covering several projects keeps one index per PROJECT.

## Sections

Sections match the status directories, in this order, plus `untriaged`. Write `None yet.` under an empty one. Each heading ends with its key in parentheses, e.g. "Waiting on John (`needs_decision`)".

1. `needs_decision`
2. `wip`
3. `queued`
4. `blocked`
5. `untriaged` — no directory yet.

`delegated` and `closed` issues leave the index: remove the line and move the directory. Its branches follow the branch queue's own rules in `MY_BRANCHES_INDEX.md`, not the issue's.

A line's section and its directory's status always agree; change both together.

## Entries

Each entry is one bullet:

```text
- [#12345](ISSUE_URL) — what's wrong, at most 120 characters; next: concrete step. [notes](STATUS/12345/index.md)
```

- Mark assignment on the exception, not the rule: the header says whether issues in this index are assigned to jmchilton by default, and lines that differ carry `(assigned)` or `(unassigned)`.
- Prefix `(large)` when the issue is too big for a triage agent to take on alone.
- `wip` entries name the branch or PR, never its CI or review state. That lives in the branch queue (`../branches/MY_BRANCHES.md`).
- `blocked` entries replace `next:` with `blocked on:`; `needs_decision` entries with `decide:`.
- `untriaged` entries are just the link and a short title.
- Findings, history, open questions and plans go in the issue's `index.md`, not the entry.

## New Issues

When asked for new issues to track, exclude issues already in `MY_ISSUES.md` or under `vault/repositories/PROJECT/issues/` (including `delegated/` and `closed/`), and check first for issues assigned to jmchilton in this repository; all of those should eventually be triaged into `MY_ISSUES.md`. Triaging an issue creates its directory under its status.

When sweeping, check every tracked issue (`MY_ISSUES.md` lines and every status directory except `closed/`) for closure on GitHub, and close out the ones that closed as above. Then refresh the index's snapshot date.
