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

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: with the fix the same stubbed failure leaves `.tool-versions` at `uv 0.12.23`, a successful stubbed run still bumps it to `uv 0.99.0`, and `shellcheck` is clean.

</details>

### P3 2: `packages/README.md` hardcodes the uv version that will now change weekly (implementation verified)

`packages/README.md` says the pin lives in `.tool-versions` "(`uv 0.12.23`)". With this PR the weekly bot bumps that pin, so the README goes stale on the first run. Drop the parenthetical; the sentence already points readers at `.tool-versions`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: the fix is a one-line README edit; `git grep 0.12.23` finds no other docs hardcoding the version.

</details>
