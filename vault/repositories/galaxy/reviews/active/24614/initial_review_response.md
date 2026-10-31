LGTM - thanks so much! -John

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

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

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24614_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[`pr_24614_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24614_review_0) builds on the reviewed commit `cbb45b061b1` and addresses both P3 findings: a full upgrade now writes the bumped uv pin to `.tool-versions` only after the lock and all exports succeed, together with the other checked-in exports, and `packages/README.md` stops hardcoding the uv version that the weekly update will now change.

- [`f798982402b`](https://github.com/jmchilton/galaxy/commit/f798982402b) Write the bumped uv pin only after lock and exports succeed — moves the `.tool-versions` copy into the final non-check block, guarded by the temp file existing (P3 1).
- [`39fa0d409e3`](https://github.com/jmchilton/galaxy/commit/39fa0d409e3) Drop hardcoded uv version from packages/README.md — removes the "(`uv 0.12.23`)" parenthetical (P3 2).

</details>

</details>

### P3 1: `.tool-versions` is bumped before the lock and exports succeed (implementation verified)

`update.sh` copies the new uv pin into `.tool-versions` right after installing the latest uv, before `uv lock --upgrade` and the exports run. If the lock or an export fails (`set -e`), a local run leaves the checkout with a bumped pin but the old `uv.lock` and exports, which is the state `dependency_exports.yaml` rejects. It also departs from the script's own rule a few lines later: "Generate all files before updating any checked-in export."

<details><summary>Evidence</summary>

Ran `update.sh` from `cbb45b061b1` in a scratch workspace with a stub `uv` whose installed "latest" uv reports `0.99.0` and fails `uv lock`:

```
simulated lock failure
exit=1
--- .tool-versions after:
python 3.12.0
uv 0.99.0
nodejs 22.0.0
```

</details>

Keep writing the rewritten file to `"$temp_dir/tool-versions"` where it is, and copy it into place in the final `if [ "$mode" != check ]` block alongside the exports, guarded by the temp file's existence.

<details><summary>Details</summary>

```diff
     awk -v v="$latest_uv_version" '$1 == "uv" { $2 = v } { print }' .tool-versions > "$temp_dir/tool-versions"
-    cp "$temp_dir/tool-versions" .tool-versions
 else
...
         cp "$temp_dir/$file" "$requirements_dir/$file"
     done
+    if [ -f "$temp_dir/tool-versions" ]; then
+        cp "$temp_dir/tool-versions" .tool-versions
+    fi
 fi
```

</details>

Fixed on the review branch in [`f798982402b`](https://github.com/jmchilton/galaxy/commit/f798982402b).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: with the fix the same stubbed failure leaves `.tool-versions` at `uv 0.12.23`, a successful stubbed run still bumps it to `uv 0.99.0`, and `shellcheck` is clean.

</details>

### P3 2: `packages/README.md` hardcodes the uv version that will now change weekly (implementation verified)

`packages/README.md` says the pin lives in `.tool-versions` "(`uv 0.12.23`)". With this PR the weekly bot bumps that pin, so the README goes stale on the first run. Drop the parenthetical; the sentence already points readers at `.tool-versions`.

Fixed on the review branch in [`39fa0d409e3`](https://github.com/jmchilton/galaxy/commit/39fa0d409e3).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: the fix is a one-line README edit; `git grep 0.12.23` finds no other docs hardcoding the version.

</details>
