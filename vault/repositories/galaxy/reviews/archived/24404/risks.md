Risks are minimal - this change only weakens a row lock from `FOR UPDATE` to `FOR NO KEY UPDATE` on a column (`update_time`) that isn't a key, adds a Postgres-only integration test, and doesn't lock Galaxy into hard-to-change choices (a two-way door).

<details><summary>Risk Review Advice</summary>

Reviewers should check that nothing relied on the stronger lock to stop concurrent deletes of HDCA rows or changes to their keys while `update_time` is touched. `FOR NO KEY UPDATE` still conflicts with `DELETE` and with key updates, so this looks safe. The plain `UPDATE` that follows takes the same lock mode in Postgres anyway, so the old `FOR UPDATE` was stricter than what the write itself needs. Non-Postgres backends ignore `key_share` or never reach this path. Reverting is a one-line change.

</details>
