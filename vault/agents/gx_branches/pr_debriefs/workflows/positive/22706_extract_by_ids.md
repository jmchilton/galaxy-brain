# #22706: Enhance workflow extraction by IDs with deduplication and UI improvements (and #22675)

- https://github.com/galaxyproject/galaxy/pull/22706. Merged. +1515/-242 across 16 files.
- Predecessor https://github.com/galaxyproject/galaxy/pull/22675. Closed. +1023/-159.

## What happened

- **#22675 (2026-05-11):** opened with a one-line body (a link to issue #21722). The next morning (05-12) mvdbeek
  **approved** it with "Looks good, i'm sure this will work better than what we had.", but left three pointed inline
  comments:
  - "how come we don't need to include implicit_collection_jobs_ids ?"
  - "That doesn't seem ideal ? The comment attributing per-job hdas to filtered outputs also seems kind of
    speculative ?"
  - "Isn't that inconsistent ? wouldn't (id, key) be better ? This also seems to break for pairs".
- **John replied the same day with a "Stepping back: ICJ-centric extraction" comment.** It conceded "Your read is
  right. The current PR is a HID→ID translation that preserves the legacy path's 'guess from individual jobs' model."
  He also explained that his prompt had led the agent to mirror the legacy path too closely.
- **#22706 (2026-05-16):** a fresh PR that "Supersedes and replaces #22675". Its structured body:
  - **What:** the endpoint and the unit of selection (an ICJ, not a job).
  - **Why (response to #22675 review):** "@mvdbeek's review correctly flagged this as the wrong abstraction". It lists
    the deleted inference (dedup loop, representative SELECT, speculative output-drop branch and its comment).
  - **Code quality / abstraction reuse:** new model properties reused by the service and the extractor; a shared
    `_connect()` replacing byte-identical duplication; an unused payload field dropped.
  - **UI:** a before/after screenshot.
  - **Relationship to #22705:** a follow-up, explicitly not required.
  - **Out of scope / known limitations.**
- **2026-05-20:** mvdbeek posted a client-schema diff to fix. John then voiced doubt about landing this in 26.1, given
  a bigger tool-request rewrite in flight. mvdbeek: "We'll need to keep this code around for a long time I think
  (every old history will be missing tool requests), so this is totally fine." He approved with 🎉 and merged on
  05-21. Open to merge was about 5 days.

## Why it landed well

- **The review was treated as a design correction, not a list of nits.** The approval on #22675 was polite, but the
  inline comments said the abstraction was wrong. John read past the approval and restarted.
- **The description maps one-to-one onto the reviewer's objections**, then onto his standing preferences: reuse,
  deleted duplication, deleted speculative code, scoped follow-ups.
- **Deleting inference is persuasive.** "This PR makes that explicit and deletes the inference" answers "start simple"
  by removing guesswork instead of adding guards.
- **The visual and the scope fences** (out of scope, the separate #22705) kept the large diff from reading as scope
  creep.

## Reusable signal

- **This is the positive inverse of #23816.** There, the response defended the implementation. Here, the response
  conceded the abstraction, rewrote it, and wrote a "Why (response to review)" section. The result was an approval
  with 🎉 within days.
- **An approval with doubtful inline comments isn't a green light.** #22675 was "approved" and still the wrong PR.
- An explicit "Code quality / abstraction reuse" section is worth copying into workflow PR templates.
