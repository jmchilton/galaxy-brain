# Polish debrief

- I wrote [pr_description.md](pr_description.md). Its lead is a before/after on the `workflow-brief-to-galaxy-data-flow` bundle: 4 pattern files on `main`, 44 on the branch. The three tools #570 needed (`__FLATTEN__`, `collection_column_join`, `collapse_dataset`) appear 0 times on `main` and once each on the branch.
- **Strengthening round (one).** A subagent verified every number and the claim that the new tests fail on `main` at the bug's assertion, by running the branch's tests on an `origin/main` worktree.
  - **Applied:**
    - swapped the table's `tp_cat` row for `collapse_dataset`, which #570 names;
    - fixed two loose wordings ("the one reference", "every declared map");
    - added bold-italic answers to the likely misreadings: load is on demand, expansion is one level only, why not inline `tool_id`s, the lib hook is generic, and only moc pages are checked;
    - made the unshipped-links risk concrete;
    - added the public-API risk for the lib;
    - listed the dependency bumps.
  - **Not applied:** listing `derive-parameter-from-file` in `galaxy-tabular-patterns`. Two shipped leaves link it, but no map body does, so it's a content call for John. It's named in Risks.
  - **Questions for John:** should expansion follow leaf-to-leaf links, and should non-map pages be held to a body-link rule too?
- I wrote [pr_titles.md](pr_titles.md) and [pr_tags.md](pr_tags.md) (`bug`).
- I opened draft PR [jmchilton/foundry-lib#139](https://github.com/jmchilton/foundry-lib/pull/139) for the lib half.
- **The Foundry draft PR isn't open.** The auto-mode permission classifier denied `gh pr create` against `galaxyproject/foundry` as creating a public surface. John has to open it or allow it. Its body is pr_description.md, with the title from pr_titles.md.
