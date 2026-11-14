If you're not the agent running from the vault/agents/gx_issues directory - user probably does not want you to create galaxyproject/galaxy issues directly (this process only applies for galaxyproject/galaxy).

Create a short_name describing the bug or feature request - and write up a lot of context. This is agent-to-agent - so some human nicities can be skipped and things can be pretty rough. Write the description you've come up with for the issue to vault/repositories/galaxy/issues_incubator/incubating/<short_name>/raw.md, next to an `index.md` with a `# ` title and one line describing the issue.

Then start its preparation if John has that turned on. Skip this if the record already has a `proposal.md`. Run `"$(git rev-parse --show-toplevel)/vault/agents/_shared/scripts/auto_action.sh" prepare_to_file <record dir>`, with the record's absolute path; the `prepare_to_file` entry in [`DISPATCH_CONFIG.yml`](DISPATCH_CONFIG.yml) says whether, where and with which profile.

- `prepare_to_file is off`: you're done; the record waits for John.
- `commit and push <record> first`: the preparation runs on another machine, which pulls before it starts. Commit the record's files and push per [`VAULT_SYNC.md`](VAULT_SYNC.md), then run it again.
- It launched: mention the agent it started.
- Any other failure: leave the record queued and tell the user what the script said.
