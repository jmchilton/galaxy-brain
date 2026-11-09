The only one-way door is small: `/api/configuration` gains a public key, `short_term_storage_effective_duration`, which is awkward to rename or remove once clients such as #24259 rely on it.

<details><summary>Risk Details</summary>

- New `/api/configuration` key, readable by all users including anonymous ones. It is additive, so existing clients are unaffected, and the value is a duration only.
- The key's name and meaning (seconds a new link lasts when no explicit duration is requested) become a contract. A caller that passes its own `duration` to `new_target` can diverge from it. The export paths in this PR's scope pass none, so the value is accurate today.
- `new_target` now gets its duration from the extracted `effective_storage_duration`. The logic looks equivalent, and a parametrized test compares it against real targets, so this path is cheap to revert.
- The dialog text changes only on servers with non-default settings, and falls back to "24 hours" when the key is missing, so it can be reverted freely.
- The history and invocation export wizards still say 24 hours, so wording can disagree across dialogs on non-default servers until the follow-up lands. The PR calls this out.

</details>

<details><summary>Risk Review Advice</summary>

Consider whether `short_term_storage_effective_duration` is the name and unit Galaxy wants to keep, since this is the part that outlives a revert. A separate key from `short_term_storage_default_duration` is an explicit choice in the PR description.

The client side, including `formatDurationSeconds`, is a two-way door and needs only a light check of the wording.

</details>
