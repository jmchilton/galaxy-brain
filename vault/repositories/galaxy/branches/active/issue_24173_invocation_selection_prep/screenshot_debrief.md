Screenshots successfully obtained.

Followed `GX_PROCESS_SCREENSHOTS.md` and the E2E writing guidance. Ran the relevant existing invocation job-details browser test independently from the preparation worktree at commit `60dc8ddf5987fdceb5a9de8f13af17579072ec58`. Playwright used the preparation branch's Vite server at `http://127.0.0.1:5174/`, proxying the unchanged Galaxy backend on port 8080.

| Screenshot | Evidence |
| --- | --- |
| [Invocation step jobs](screenshots/invocation_step_jobs.png) | The Steps tab shows the expanded successful `split_up` step and legible `collection_creates_pair` job information. |

The PNG was individually opened and inspected. The screenshot is useful and shows the expected established invocation view after the preparation changes. The test also verifies workflow scheduling, input details, step titles, job tool ID, and output collection expansion. Result: **1 passed in 71.85s**; log `/tmp/issue24173-prep-baseline-e2e.log`.

The screenshot wait uses job-information visibility instead of a fixed sleep. No source edits, environment restart, or retry were needed in this preparation validation. No screenshot blocker remains. The PNG is stored in this branch's ignored `screenshots/` directory.
