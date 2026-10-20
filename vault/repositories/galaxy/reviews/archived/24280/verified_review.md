### P3 1: Narrow the new helper's signature (implementation verified)

`_validated_stored_preferred_object_store_id` leaves `user` untyped and types `owner_type` as `str`, though it only ever gets `"history"` or `"user"`. The PR already tightens `User.preferred_object_store_id` to `Mapped[Optional[str]]` in the same spirit.

Type them as `user: Optional[User]` and `owner_type: Literal["history", "user"]`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>
