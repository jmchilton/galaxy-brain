# ToolForm request-start synchronization repair — 005b9cb4658

Reviewed 2026-10-14. Independent read-only reviewer approved fixup a94ded142a556b03baa9cdd5ef00d66eb018cf61 against recorded baseline b1eb98fd50b5bcf237d3b3b432100d6d43257fb8 without findings. Original ToolForm commit 966bbeb89b30fe249166b097f632bb9d06ede561 was repaired via autosquash onto its literal parent bd04f01baca72cd0fc0a5c31dee982c4264175f7.

## Ownership and preserved assertions

Pending handler-start state and deferred response share one mount owner. The handler captures it before setting started and awaiting its response, so an already captured old request cannot mark a newer owner. Teardown resolves its own response and clears only a matching module pointer. Configuration may delay the decorator; afterEach lazily captures the owner once and keeps that identity. Existing five-second wait bounds failure.

All eight original unit cases and assertions survive; the test file is byte-identical to baseline. Existing visible-loading, loaded heading/version and Run-button assertions remain. The additional positive handler-start check prevents visible loading alone from ending the story before the API handler starts.

## Evidence and delivery

Play instrumentation naturally observed afterEach completing before the handler started. Focused unit 8/8 and Chromium 4/4 passed with the repair. Withholding started=true failed only LoadingBuild at the new guard in 5.28 seconds, and teardown released the held response. Mutation restored before review. Final type-check, formatting, lint and normal hooks passed; reviewer ran no extra gates or mutations.

Autosquash completed cleanly; rewritten tip 34faab01b327f8b98ead880f8ff9e6b8a44d986f has exactly the reviewed candidate tree. Readability merge-base remains 7f2db5e59415f07c09fec5be75ff4885fbad047e. Full unit gate passed 718 tests in all 91 selected files; browser passed 344 tests in 90 files. Rewritten branch pushed using the exact recorded remote lease. AwsEstimate draft was preserved in owned backups and excluded from repair gates. Historical log commit IDs remain the original delivery snapshots for other batches.
