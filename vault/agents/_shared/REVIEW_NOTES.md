
Below, PROJECT is the repository the PR belongs to (e.g. galaxy, planemo, pulsar, gxformat2) - one agent directory may cover several.
## Writing reviews

Non-sensitive review notes go in the projects agent directory, one file per PR, along side `AGENTS.md`:
`<PROJECT>_<PR_NUMBER>_<short_description>.md`.

Security findings and sensitive evidence instead follow
[SECURITY_REPORTS.md](SECURITY_REPORTS.md): write them directly to John's home
directory, never into the repository. For mixed reviews, keep only ordinary
findings in the normal note.

`<short_description>` is a lowercase snake_case slug of the PR title, e.g.
`planemo_1678_use_gravity_multiprocessing_for_modern_galaxy.md`.

Review notes are temporary working state, not an archive. When a PR leaves `PULL_REQUESTS.md` (merged, closed, or removed by the user), move all matching `<PROJECT>_<PR_NUMBER>_*` files to `old/` unless the user explicitly promotes or retains an artifact.

**Run reviews in subagents.** Reading a PROJECT PR's diff plus surrounding code burns a
lot of context; keep the main session as a coordinator. One subagent per PR, each
given SECURITY_REPORTS.md and its private output destination before starting.
Tell it to write ordinary findings at the path above and return only a short,
non-sensitive summary; report private security-report locations only to the
coordinator. The coordinator handles galaxy-brain commits and pushes per
[VAULT_SYNC.md](VAULT_SYNC.md).
