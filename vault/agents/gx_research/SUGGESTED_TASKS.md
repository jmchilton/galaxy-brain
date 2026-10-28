## Research Requests

when: whenever
what: review the requests in `vault/agents/gx_research/todo/`, for each of those recommend a task of the format

Prepare `short_name` (the file name without `.md`) and `description`, a one paragraph summary of the requested scope. `status` is `idea` when the request waits on something, such as a PR merging forward to `dev` (say so in `description`), otherwise `recommended`.

Suggest:

```
prompt: Work through research request ./todo/{short_name}.md per ./AGENTS.md
agent_dir: gx_research
profile: Opus (medium)
description: 🧠 {description}
status: {status}
```
