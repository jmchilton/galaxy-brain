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

## Follow-up (2026-11-05, John asked to verify both open claims)

Ran each test on HEAD and on base `lib` (temp worktree at `origin/release_26.2`, HEAD tests copied in), eager + cached toolboxes:

- `test_create_workflow_with_unversioned_shed_tool_id` (`POST` create, asserts `latest_workflow.has_errors` false): base fails at `assert not True` (has_errors) on both toolboxes; HEAD passes. Folded into fix commit → `25e9da890f9`; branch now `752f657a172` (force-pushed; tree checked identical to tested state).
- Editor save (download `style=editor`, PUT `{"workflow": …, "from_tool_form": true}` like `saveWorkflow`): passes on **base** too. Editor builds modules with `exact_tools=False`, so `content_id` is the versioned guid `…/0.1.0`. Not added to the branch (doesn't exercise the change); copy kept out of repo. Description row says editor unaffected.

```
created .../snapshots/20261105T114736Z-polishing-752f657a1723.json
  polishing @ 752f657a1723 vs origin/release_26.2 (merge-base 5b43cbd11de0)
  since 20261104T222130Z-polishing-0e76ac8e20b1:
    commits: 2 same, 1 rebased, 1 changed, 0 new, 0 dropped
    hunks:   9 carried, 1 changed, 1 new, 0 dropped
    changed 25e9da890f90 Accept unversioned shed tool ids for exact-version workflow invocation (2 differing hunks)
```

Fork CI on `752f657a172` pending.

## Left over

- Optional: trim long docstrings/comments (`get_tool_at_version`, `_describe_missing_tools`) to one line.
