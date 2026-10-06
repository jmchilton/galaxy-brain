## The Index

`ISSUES.md` is this agent's triage index: one line per issue that still needs someone's move. Detail lives in the issue's directory under `vault/repositories/PROJECT/issues/STATUS/`, per [`REPOSITORY_ISSUES.md`](REPOSITORY_ISSUES.md). PROJECT is the repository the issue belongs to (e.g. galaxy, planemo, pulsar, gxformat2); one agent directory may cover several.

## Sections

Sections match the status directories, in this order, plus `untriaged`. Write `None yet.` under an empty one. Each heading ends with its key in parentheses, e.g. "Waiting on John (`needs_decision`)".

1. `needs_decision`
2. `wip`
3. `queued`
4. `blocked`
5. `untriaged` — no directory yet.

`delegated` and `closed` issues leave the index: remove the line and move the directory. On close, also prune branches associated with the issue (if present).

A line's section and its directory's status always agree; change both together.

## Entries

Each entry is one bullet:

```text
- [#12345](ISSUE_URL) — what's wrong, at most 120 characters; next: concrete step. [notes](../../repositories/PROJECT/issues/STATUS/12345/index.md)
```

- Prefix `(assigned)` when the issue is assigned to jmchilton on GitHub, and `(large)` when it is too big for a triage agent to take on alone.
- `wip` entries name the branch or PR, never its CI or review state. That lives in the branch tracking file (e.g. `gx_branches/MY_BRANCHES.md`).
- `blocked` entries replace `next:` with `blocked on:`; `needs_decision` entries with `decide:`.
- `untriaged` entries are just the link and a short title.
- Findings, history, open questions and plans go in the issue's `index.md`, not the entry.

## New Issues

When asked for new issues to track, exclude issues already in `ISSUES.md` or under `vault/repositories/PROJECT/issues/` (including `delegated/` and `closed/`), and check first for issues assigned to jmchilton in this repository; all of those should eventually be triaged into `ISSUES.md`. Triaging an issue creates its directory under its status.

When sweeping, check `delegated/` issues for closure and move closed ones to `closed/`.
