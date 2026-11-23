# Polish debrief

Polished at head `d355bf5a070` (base `dev`). No code changes; description, checklist, titles and tags written.

```
created .../differential-review/snapshots/20261123T211523Z-polishing-d355bf5a0702.json
  polishing @ d355bf5a0702 vs origin/dev (merge-base e7a3f2254c07)
  since 20261123T203851Z-revision-d355bf5a0702:
    commits: 31 same, 0 rebased, 0 changed, 0 new, 0 dropped
    hunks:   57 carried, 0 changed, 0 new, 0 dropped
```

## Steps

1. **CI** (fork, `d355bf5a070`): pending. 6 passed, 14 still running; 2 failed runs (Pulsar package test, CWL conformance) have no failed jobs and don't exercise the change. Branch tests not yet reported.
2. **Checklist**: GENERAL only (no workflow code). [pr_checklist.md](pr_checklist.md): all 6 pass.
3. **Description**: [pr_description.md](pr_description.md). Opener "Follow-up to #18722" (no Galaxy issue exists; motivation quoted from galaxy-iuc/standards#95). Codex, thermo-nuclear and performance checks marked as run on the round-2 branch.
4. **Strengthening round** (one): no code tasks taken. Description changes:
   - Added a `.. figure::` row (shed figure targets are broken on `dev`).
   - SVG claim narrowed: help no longer links to the unsandboxed `shed_tool_static`; the legacy route itself is unchanged.
   - Highlighted the `path` containment answer near the top.
   - Risk: `/build` help HTML of shed tools now has tool-relative srcs, so non-Galaxy-client consumers must rewrite them.
   - Risk: tool-dir-before-repo-root ordering re-checked by a new sweep (tools-iuc `b9b16be49`, tools-devteam `ddbe2a1`, galaxytools `a8748eb`): across `.shed.yml` repositories, no help image target exists at both levels (only one target sits in a tool dir below its repo root).
5. **Galaxy check**: `make format` clean. Full `mypy . ../test` from `lib`: 32 errors, none in the 12 changed Python files (all in untouched modules, local env).
6. [Titles](pr_titles.md), [tags](pr_tags.md): `kind/enhancement`, `area/tool-framework`, `area/API`, `area/UI-UX`. Labeler would also add testing areas; dropped as not central.

## Left for John

- Add CSP/`nosniff` to the legacy `shed_tool_static` route too (a few lines in the controller)? The scope evaluation lists the route's headers/removal as a follow-up, so not done here.
- Tools list builds the image URL with the card's version but fetches help from `/build` without one. Fine as is?
- Still open from earlier: split the icon fixes (`1bfb47160cb` .. `5879cabce8a`) into their own PR?
