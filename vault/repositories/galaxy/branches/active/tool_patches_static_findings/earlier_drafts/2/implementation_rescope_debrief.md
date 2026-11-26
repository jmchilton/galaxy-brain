# Re-scope debrief

```
created .../tool_patches_static_findings/differential-review/snapshots/20261126T045810Z-revision-ff7567349f06.json
  revision @ ff7567349f06 vs tool_security_static_findings (merge-base d4ae281e442c)
  since 20261126T042109Z-implementation-8e5cda36884c:
    commits: 25 same, 1 rebased, 0 changed, 7 new, 0 dropped
```

The first scope evaluation (now `earlier_drafts/1/scope_evaluation.md`) recommended one opt-in gate.

- John's request names two conditions: targeted findings cleared, and nothing new. The branch checked only nothing new.
- The branch's own fixture collections apply to `identifier_single`, clear nothing, and exited 0.

**`ff7567349f0` adds `--fail-on uncleared`** (it needs `--tool-patch-path`).

- `PatchReview.uncleared` is true when a security unit is `applied` and `cleared` is empty.
- The gate is opt-in, because a patch can fix what the static review can't see, such as a new validator.
- The red-to-green test is parametrized: a cleaning patch exits 0 and a cosmetic patch exits 1.
- The docs, `--help` and the `--tool-patch-path` guard are updated.

**Before the re-scope (in the alt, `812703c96b6`)**, the hardening fixes were:

- severity raises count as introduced;
- `classify()` codes and locations count toward the regression;
- capability findings are matched by message;
- `--fail-on mismatch`;
- the JSON `after` dropped;
- `--guid` guards;
- repeated NOTE lines kept, so the base CLI output is identical to the parent apart from the fixture tool this branch carries.

The flag name `uncleared` is a question for John. Alternatives: `clears-nothing`, `no-clear`, `ineffective`.
