
@MODIFYING_GTN_CONTENT.md

Fix the open findings in `./gtn_findings_26_2.yaml` ([GTN_FINDINGS_YAML_SCHEMA.md](GTN_FINDINGS_YAML_SCHEMA.md))
on two GTN branches:

- `faq_fixes_26_2`: `target: main` findings, off `origin/main`.
- `update_for_galaxy_26_2`: `target: version` findings, stacked on `faq_fixes_26_2` so edits to the
  same FAQ don't conflict. Rebase it whenever `faq_fixes_26_2` moves.

A finding is open until it has `fixed_in` or `skip`.

## Setup

- The GTN clone is `~/projects/repositories/training-material`. The FAQ loop reads it, so don't
  switch branches there. Work in a worktree per branch under
  `~/projects/worktrees/training-material/branch/<branch>`.
- Push to the user's fork (`gh api user -q .login`), added as a remote of that name if missing.
- Fetch `origin` first; findings were made at the entry's `gtn_commit`, and main moves.

## Each finding

1. Read the finding, the FAQ at the branch tip, and its findings file under `training_findings/26.2/`.
2. Check it still applies. If main already fixed it, set `skip: fixed upstream at <sha>`. If it
   looks wrong, set `skip: disputed: <why>` rather than guessing.
3. Fix it in every FAQ in `faqs`, plus anything `fix` names (tutorials embedding the FAQ). Keep the
   edit minimal and follow [MODIFYING_GTN_CONTENT.md](MODIFYING_GTN_CONTENT.md).
   Leave screenshots alone; stale ones are tracked in `gtn_screenshots_26_2.yaml`.
4. Commit once per finding: `<label>: <short description>`.
5. Set `fixed_in: <branch>` with the Edit tool, not by re-dumping the YAML; the FAQ loop may be
   appending to the file at the same time.

## Finish

- Push both branches. Don't open PRs unless asked.
- Run `uv run check_gtn_findings.py`, then commit `gtn_findings_26_2.yaml` with an explicit path.
