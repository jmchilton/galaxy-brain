# Review branch `pr_24280_review_0`

Based on reviewed commit `ff83754163b`. It narrows the type hints on the new stored-preference validation helper in the job wrapper so the signature documents its contract. Behavior is unchanged.

- `f2412c63e04` Narrow stored preference helper typing — types `user` as `Optional[User]` and `owner_type` as `Literal["history", "user"]` on `_validated_stored_preferred_object_store_id`.
