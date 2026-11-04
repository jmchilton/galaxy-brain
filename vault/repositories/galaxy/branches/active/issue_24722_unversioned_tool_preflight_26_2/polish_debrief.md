Run via Claude Opus 5.5 at low effort.

# Polish debrief

No code changes; branch stays at `0e76ac8e20b`. Only the description and supporting files are new.

```
created .../differential-review/snapshots/20261104T222130Z-polishing-0e76ac8e20b1.json
  polishing @ 0e76ac8e20b1 vs origin/release_26.2 (merge-base 5b43cbd11de0)
  first snapshot: 4 commits, 6 files, 10 hunks
```

The CLI reports "first snapshot" although the hardening debrief recorded one; the earlier snapshot files were likely lost with the worktree/record dir (gitignored). Code is unchanged since hardening.

| Step | Result |
| --- | --- |
| 1. CI | Fork had the hardened head `0e76ac8e20b` (index was stale). All runs green except `macOS startup`: 3.10 job cancelled, 3.14 passed; unrelated. Worktree was missing and was recreated from the fork branch. |
| 2–3. Checklist | GENERAL + WORKFLOW_RELATED, all 9 pass ([pr_checklist.md](pr_checklist.md), claude-opus medium). Noted some docstrings exceed one-line style; not archeology, left as is. |
| 4. Description | [pr_description.md](pr_description.md): before/after table, highlighted exact-version guarantees. |
| 5–6. Strengthening | One round (claude-opus medium). Applied: table row 2 now `PUT` update with its real base failure (400 "This workflow contains missing tools"), dropped untested `POST` create "silently flagged" claim, qualified the `has_tool`/`get_tool` risk as eager-only, listed all three suffix-updated tests, added a highlighted scope sentence (message change + short ids). |
| 7. Check Galaxy | No code change; fork CI `Python linting` (`tox -e lint,mypy,format`) green on `0e76ac8e20b`. |
| 8–9. Titles, tags | [pr_titles.md](pr_titles.md) (`[26.2]` prefix), [pr_tags.md](pr_tags.md): `kind/bug`, `area/workflows`, `area/API`. |

## Left over

- POST create path: no integration test asserts create no longer sets `has_errors`. Description no longer claims it; a test could be added.
- Does editor save hit the `PUT` failure on base? The editor may send back the resolved versioned id. Unverified; would need a manual/Playwright check.
- Optional: trim long docstrings/comments (`get_tool_at_version`, `_describe_missing_tools`) to one line.
