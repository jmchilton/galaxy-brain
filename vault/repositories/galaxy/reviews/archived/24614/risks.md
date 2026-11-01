Risks are minimal - this change only alters the developer/CI dependency-update script and is easily reverted (a two-way door); the main side effect is that the weekly `Update dependencies` bot PR will now also move the uv version every CI workflow uses.

<details><summary>Risk Details</summary>

- `.tool-versions` drives `astral-sh/setup-uv` in ~10+ workflows, so each weekly bot PR that bumps the pin changes the uv used across all of CI, bundled with the dependency bumps.
- A full `make update-dependencies` installs whatever uv is newest on PyPI at that moment, with no age/cooldown; a freshly released, buggy uv would be pinned and generate the lock in the same run.
- The lock is regenerated with the new uv, so lockfile/export format churn from uv upgrades lands in the same PR as dependency changes, making review and bisecting harder.
- Running the target locally now modifies `.tool-versions` in the developer's checkout; `-p <pkg>`, `--check`, and `--export-only` are unaffected.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether auto-following uv's latest release is wanted, or whether a cooldown (e.g. uv `--exclude-newer`-style age limit) or separating the uv bump from the dependency bump is preferable. Everything here is reversible by reverting the script or the bot PR.

</details>
