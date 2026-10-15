# Initial validation — f42c9e5e545

Passed on 2026-10-14 in the repair worktree against base `8b729ff0050c32573ad0fa999e5e1b4d015dca8c` and pre-merge parent `ca54b0b3142d2671d273a12a455912bb1bcc1b95`.

- Parsed all 25 edited workflows with PyYAML BaseLoader (preserves the YAML `on` key).
- Compared every removed pre-merge `lib/...` event pattern against parsed repaired filters: all 59 restored (25 inclusion checks and 34 exclusion checks). Each used an actual tracked file whose scheduling decision differs between merged and repaired filters.
- The ephemeral matcher implements the literal, `*` and `**` glob syntax used by these lists, respecting ordered negative patterns. This is local filter validation, not an execution of GitHub's scheduling service.
- Confirmed all previous package patterns, non-path event configuration and all job bodies are unchanged. Confirmed explicit workflow-file triggers still match.
- Edited `packages/schema/src/galaxy/schema/history.py` temporarily; Git reported only `lib/galaxy/schema/history.py`. Restored original source bytes in a `finally` block.
- `git diff --check` passed. Git status contains only the 25 intended workflow edits.

The validation helper lives temporarily at `/tmp/gx23999-validate.py`, outside the project; no test code is added to the implementation branch. Initial selection of a Python dependency module for lint correctly revealed that `**.py` already triggers lint; the final audit selects a tracked requirements file with a changed filter decision instead. No implementation correction was needed.

No backend/client tests or screenshots: the change concerns workflow event selection, not Galaxy runtime behavior. GitHub CI on a future PR remains pending; changed workflow files themselves trigger runs but do not prove source-only scheduling, hence the separate path checks above.

Commit-time hooks passed: trailing whitespace, merge-conflict detection, destroyed-symlink detection, end-of-file normalization and Validate GitHub Workflows. Commit `f42c9e5e545` contains exactly the reviewed 59 additions; worktree is clean. Vault validation has zero errors (15 advisory warnings), and generated index/dashboard drift checks pass.

# Revised validation — b0a8d368d60

All 59 restored-pattern/event checks passed again (25 source inclusions, 34 exclusions) against the merged #23999 filters. All 25 workflows parsed; non-path event configuration, job bodies, real package patterns and workflow-file triggers were verified unchanged. Each of the 23 removed alias source filters was independently verified below a tracked symlink. A real temporary schema-alias edit again yielded only its lib Git diff path, then original bytes were restored. `git diff --check` and commit-time Validate GitHub Workflows passed. Worktree is clean and the branch is pushed. The ephemeral updated helper is `/tmp/gx23999-validate-revised.py`; no repository test code added.

Vault checks repeated for the revision: zero frontmatter errors (15 advisory warnings), generated index and dashboard up to date.
