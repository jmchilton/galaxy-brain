You'll be asked to open the latest repository record "in code" or "in Obsidian".

## Pick the record

Records live at `vault/repositories/<repo>/<kind>/<status>/<name>/` with an `index.md`; `<kind>` is `branches`, `reviews` or `issues`.

1. If this session has been working on a branch, review or issue, use its record.
2. Otherwise use the record with the most recently modified `.md` file:

   ```sh
   cd ~/projects/repositories/galaxy-brain/vault/repositories &&
   find . -mindepth 5 -type f -name '*.md' \
     \( -path './*/branches/*' -o -path './*/reviews/*' -o -path './*/issues/*' \) \
     -exec stat -f '%m %N' {} + | sort -rn | head -1 | cut -d' ' -f2 | cut -d/ -f2-5
   ```

## In code

Open the record's worktree:

```sh
code <worktree>
```

- Branches: the `Worktree:` line in `index.md`, usually `~/projects/worktrees/<repo>/branch/<name>`.
- Reviews: `~/projects/worktrees/<repo>/pr/<PR number>` (see `WORKTREES.md`).
- Issues usually have no worktree. Fall back to the newest branch or review record that has one, and say so.

Check the worktree exists first. If `code` isn't on the `PATH`, say so and stop.

## In Obsidian

```sh
open "obsidian://open?path=<URL-encoded absolute path to the record's index.md>"
```

This opens it in the running Obsidian session's vault.

## Report

Say which record you opened, why it was picked (this session, or newest modified), and the path.
