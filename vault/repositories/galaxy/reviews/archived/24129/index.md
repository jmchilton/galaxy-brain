# PR #24129 — Derive OIDC username from email when IdP sends no username claim

- PR: https://github.com/galaxyproject/galaxy/pull/24129
- Latest review: 2026-10-14
- Reviewed commit: `df34e9b9dbe38dfa8d7a67144e48fb0729c189f8`
- Base: `release_26.0`
- Delivery: **UNPOSTED**; review and approval draft prepared locally. No GitHub mutation performed.
- Recommendation: **Approve**, with no new blocking findings.
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24129` (clean).
- Supporting material: [ordinary findings](#ordinary-findings), [validation](#validation), [review draft](#review-draft), [risk assessment](#risks).

## Scope and behavior

Read both changed files, the complete authentication pipeline, social-core username creation and protected-field behavior, Galaxy storage methods, deferred confirmation/creation, and the CILogon/generic OIDC backends. The added pipeline step derives a sanitized lowercase username only when no user and no provider username are available; social-core retains its truncation and collision handling. Empty sanitized names retain the existing random fallback for immediate creation. Custom pipelines remain an administrator responsibility because they replace the default pipeline.

## Ordinary findings

No new blocking findings on the reviewed release branch.

Existing review by dannon already approves this exact commit and covers two caveats. Do not duplicate these as new discoveries:

1. **Nonblocking edge case, reproduced:** with `require_create_confirmation`, a local part consisting of two hyphens (`--@example.org`) is sanitized to `-`, then sanitized again to empty by `_confirmation_identity`, causing `InvalidFlow`. Before the change, the confirmation path receives the original email and sanitizes once. `ready_name_for_url` removes only one trailing hyphen and is not idempotent. This is a narrow registration regression already explicitly accepted as nonblocking in discussion.
2. **Forward-merge caveat:** dev has additional profile synchronization behavior; the existing reviewer calls out its interaction with inferred usernames and automatic association. That behavior is absent from this release branch. Recheck the pipeline placement when forward-merging rather than treating the release approval as approval of dev behavior.

Tests added by the PR exercise the central fallback and preservation paths. The pipeline-order assertion is narrow; the existing deferred-creation integration-style unit tests give broader confidence. Collision and empty/missing-input behavior were also checked interactively against the real social-core implementation and Galaxy username cleaner.

## Validation

Python 3.13.12, existing Galaxy virtualenv; worktree source selected with `PYTHONPATH=lib`, bytecode and pytest cache writes disabled.

- `python -m pytest -p no:cacheprovider test/unit/authnz/test_psa_authnz.py -q`: **12 passed**.
- `python -m pytest -p no:cacheprovider test/unit/authnz/test_deferred_user_creation.py test/unit/authnz/test_oidc_backends.py -q`: **57 passed**.
- Additional direct calls confirmed normal email-derived names pass confirmation; username collisions receive the usual UUID suffix; absent email/details skip the step; an empty sanitized local part leaves the old random immediate-creation fallback; the previously reported hyphen edge reproduces.
- Both pytest processes exited 0. Existing dependency deprecations and an ignored `mirakuru` atexit process-enumeration `PermissionError` occur under the sandbox after test completion.
- GitHub head rechecked unchanged. Observed checks have no failures: two integration shards still in progress, CWL conformance skipped, all other reported checks successful. CI is therefore not yet fully complete.
- No code modified or committed.

## Review draft

Looks good for `release_26.0`. The fallback preserves provider usernames and existing accounts, and leaves collision handling with social-core. I ran the PSA auth tests plus the deferred-user-creation and OIDC backend tests: 69 passed.

The previously noted confirmation edge case and dev forward-merge caveat are already covered in the existing review; I have no additional blocking findings.

## Risks

New account usernames persist in the database and may become public URLs, so choosing an email-derived default creates a limited one-way compatibility decision even though the code is easy to revert.

<details><summary>Risk Details</summary>

- New users without a provider username receive a sanitized email local part instead of an opaque random value; rolling back does not rename accounts already created.
- Email local parts may be identifying information in public usernames, consistent with the previous custos policy and existing confirmation path.
- Existing users and provider-supplied usernames are preserved on this release branch.
- Confirmation mode has the rare hyphen-only local-part regression described above.
- The dev forward merge needs a separate check against its additional profile-sync pipeline.

</details>

<details><summary>Risk Review Advice</summary>

Confirm the operator-facing choice to retain the historical email-derived default, and review the two username-creation paths together. For dev, specifically reconsider the position of inference relative to association and profile synchronization. No schema migration or existing-account rename is introduced here.

</details>

## Tracking ended — 2026-10-15

GitHub confirms MERGED at `2026-10-15T15:11:35Z`, final PR head `fdcd8c359848648b8c2bc0cb7c6129f414d14202`. Archived after merge and removed from the queue. The clean worktree HEAD matched or was an ancestor of the final PR head and was removed with `ghwt rm galaxy 24129`. Cleanup did not re-review later commits or post the draft.
