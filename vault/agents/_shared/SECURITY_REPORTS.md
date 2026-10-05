# Private security reports

Write suspected security findings and sensitive evidence directly to a unique
`/Users/jxc755/security-<project>-<task>-<date>.md` report with owner-only permissions
(`0600`). Tell John privately where it was saved.

- Never record sensitive findings or private report paths in repositories
  (including ignored files), commit messages, or public outputs.
- Keep ordinary review findings in normal notes. This overrides repository output
  instructions. Give subagents this policy before starting; their returned
  summaries must be non-sensitive.
- Request approval if home-directory writing requires it. Never fall back to the
  repo if blocked.
- If sensitive material is already in the repo, stop syncing it and notify John.
  Deleting a file doesn't erase Git history; don't rewrite history on your own.
