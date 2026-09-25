
Below, PROJECT is the repository the PR belongs to (e.g. galaxy, planemo, pulsar, gxformat2) - one agent directory may cover several.
## Writing reviews

Review notes go in the projects agent directory, one file per PR, along side `AGENTS.md`:
`<PROJECT>_<PR_NUMBER>_<short_description>.md`.

`<short_description>` is a lowercase snake_case slug of the PR title, e.g.
`planemo_1678_use_gravity_multiprocessing_for_modern_galaxy.md`.

Review notes are temporary working state, not an archive. When a PR leaves `PULL_REQUESTS.md`, move all matching `<PROJECT>_<PR_NUMBER>_*` files to `old/` unless the user explicitly promotes or retains an artifact.

**Run reviews in subagents.** Reading a PROJECT PR's diff plus surrounding code burns a
lot of context; keep the main session as a coordinator. One subagent per PR, each told to
write its own file at the path above and return only a short summary.
