# #20880: Validate sample sheet column definitions in workflow definitions on backend

https://github.com/galaxyproject/galaxy/pull/20880. Merged. +72/-2 across 4 files, 1 commit.

## What happened

- **2025-09-09:** opened as a draft. The body is just "xref #20831", John's sample-sheet follow-up tracking issue.
- **2025-09-10:** marked ready.
- **2025-09-11:** mvdbeek approved with **"Awesome, thank you!"** and merged within a minute. Open to merge was about
  2 days; ready to merge was about 1 day.
- The diff is a gxformat2 pin bump (0.20.0 → 0.21.0), 4 lines in `workflow/modules.py`, and 66 lines of API tests
  that assert 200 for valid definitions and 400 for invalid ones.

## Why it landed well

- It is backend validation of user-supplied workflow definitions, so bad input now fails at import with a 400 instead
  of later. That matches mvdbeek's known concern about readable errors from bad uploads, which he raised on #23409.
- It is one concern and one commit, linked to an existing tracking issue. There was nothing to debate.
- Same shape as #22179: the schema logic lives in gxformat2, and Galaxy wires it in and tests it at the API.

## Reusable signal

- "Reject bad workflow input at the API, with a test for each rejection" is a reliably welcome shape.
- The tracking-issue link served as the whole motivation. That works when the issue is already agreed backlog.
