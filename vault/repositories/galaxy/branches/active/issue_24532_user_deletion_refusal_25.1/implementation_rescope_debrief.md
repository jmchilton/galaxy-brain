# Re-scope debrief: issue_24532_user_deletion_refusal_25.1

**Trigger:** the first [scope evaluation](earlier_drafts/1/scope_evaluation.md) recommended a modest expansion. Codex had found that BModal closed the modal on OK, and the fix (`4ddba1316d4`) keeps it open with `preventDefault()`. With the modal staying open, **Delete Account Permanently** stays enabled while the DELETE is outstanding, so a double click sends two requests. 25.1 had no in-flight state, because the modal used to close straight away.

**Original scope:** kept as `issue_24532_user_deletion_refusal_25.1_alt_original_scope` at `4ddba1316d4` ([alts/original_scope.md](alts/original_scope.md)).

**Expansion:** `a1bc7532e16` adds a `deleting` ref, as `release_26.1`'s GModal version has. It is set when the request starts and cleared when deletion fails. It disables the OK button through `:ok-disabled="!nameState || deleting"`. I tried an extra `!deleting` guard in `handleSubmit`, then dropped it: the disabled button already covers it, and 26.1 has no such guard either, so leaving it out keeps merge-forward simpler. 26.1's LoadingSpan/info alert was not ported; it's UI polish beyond the double-submit gap.

**Test:** "disables the delete button while the deletion request is pending" holds the mocked DELETE open on a promise. It checks that the button is disabled while the request is outstanding, that a second click sends nothing, and that the button is enabled again after a 403 failure. It fails against `4ddba1316d4`'s component and passes on the expanded branch. 8/8 jest tests pass and vue-tsc is clean.

**Review:** [subagents/normal_review_2.md](subagents/normal_review_2.md).

**Not expanded (per the scope evaluation):**
- A shared error-code module: tried, then reverted because it conflicts on 26.2/dev.
- Showing the server's `err_msg`: it's worded for admins.
- Hiding the card when `allow_user_deletion` is false: that needs config exposure, which is a separate decision for dev.

**Review follow-up:** `e6590e91c9b` clears `deleting` in `resetModal`, as 26.1 does, and replaces the pending test's no-op click/request counter with an assertion on the failure message.

```
created .../differential-review/snapshots/20261101T150337Z-implementation-e6590e91c9bb.json
  implementation @ e6590e91c9bb vs origin/release_25.1 (merge-base 32317280ecb5)
  since 20261101T143013Z-implementation-f2f80d3736d5:
    commits: 3 same, 0 rebased, 0 changed, 3 new, 0 dropped
    hunks:   1 carried, 2 changed, 5 new, 0 dropped
```

Then re-hardened: the first round's hardening debriefs are in `earlier_drafts/1/`.
