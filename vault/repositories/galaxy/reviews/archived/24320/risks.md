Mostly a two-way door, but on a release branch it changes which installed version Galaxy treats as "latest" for any tool with `+galaxy10`-style versions, so unversioned tool ids, the tool form's default version, and workflow step upgrades will start resolving to different (newer) versions on servers right after deploy; it also adds a new public `parse_tool_version` in the published `galaxy-tool-util` package that planemo is expected to adopt.

<details><summary>Risk Details</summary>

- Unversioned tool ids (API, tool links, `tool_id` without version) resolve to the newest lineage member; on servers with `+galaxy10`+ installed this silently switches from e.g. `+galaxy9` to `+galaxy10` after upgrade.
- Workflow refactor `upgrade_all_steps` and the editor's "upgrade" prompts will now offer/apply different versions than before for affected tools.
- `+galaxy1` and `+galaxy.1` now compare equal; if both exist in one lineage their relative order becomes arbitrary (both strings are still kept in the `SortedSet`).
- `Interval2Maf1` at `1.0.1+galaxy0` stops being treated as a legacy tool, changing its behaviour under `GALAXY_LIB_TOOLS_VERSIONED` handling.
- Tool Shed TRS version lists for stock tools change order, and the "latest" stock source picked from them may change.
- `parse_tool_version` becomes public API in `galaxy.tool_util.version` (`__all__`); downstream consumers (planemo) will depend on its name and semantics, which are harder to change later than an internal helper.
- `parse_version` itself is deliberately left unchanged, so two orderings now coexist; callers outside the touched sites (conda/mulled resolution, linters, other toolbox paths) keep lexicographic `+galaxyN` ordering.

</details>

<details><summary>Risk Review Advice</summary>

The code change is small and reverts cleanly; the real consideration is shipping a user-visible change in default tool version resolution on `release_26.1`. Reviewers should confirm that newer-version resolution is the intended behaviour for running servers (it fixes a real bug, but admins may notice tools/workflows picking up different versions), and grep for remaining `parse_version` sort keys over tool versions (e.g. toolbox panel/version selection, workflow module upgrade code) that would now disagree with the lineage order.

Also decide whether the separate-helper vs. change-`parse_version` question raised in the PR description is settled, since publishing `parse_tool_version` in `galaxy-tool-util` commits downstream tooling to that name.

</details>
