# review_0 branch — PR #24610

Branch `pr_24610_review_0` (from `e085821c3565`, local in `~/projects/worktrees/galaxy/pr/24610`, pushed to jmchilton fork) replaces the single-occurrence `$tool_directory` index slicing in `HasDockerLikeVolumes._expand_volume_str` with a per-entry filter, so every unresolved `$tool_directory` / `${tool_directory}` volume entry is dropped for tools without a tool directory. Two new parametrizations of the PR's test cover the brace form and a second subpath entry; they were red on the PR head and pass with the fix (12 passed; module doctests, ruff, black clean).

- `963d461f102` Strip every unresolved $tool_directory volume entry, brace form too — per-entry filter plus brace-form and multi-entry test cases (P3 1).
