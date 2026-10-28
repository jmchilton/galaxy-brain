Profile: gx_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: ad4429e1

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It adds an internal, not-yet-called `ObjectStore.get_data_head` method; no API, tool, or workflow behavior changes.

<details><summary>Risk Details</summary>

- `get_data_head` is a new abstract method on `ObjectStore`; out-of-tree subclasses of `ObjectStore` (not `BaseObjectStore`) would fail to instantiate. In-tree stores all inherit `BaseObjectStore`.
- `PulsarObjectStore` (via `BaseObjectStore._invoke`) gets no `_get_data_head`, so a future caller hitting it would raise `AttributeError` rather than a clear "unsupported" error.
- Semantics now promised by the docstring (read from backend, bypass possibly stale cache, fall back to cache for non-streaming backends) will be relied on by future callers; changing them later means auditing those callers.
- Non-S3 caching backends without a range read stream from the start and stop early; cost depends on each backend's `_stream_remote` actually aborting the transfer on close.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should confirm the stale-cache rationale matches the intended caller (likely datatype sniffing/peek after remote jobs) and that the fallback path's "refresh only when empty" behavior is acceptable for non-empty stale cached copies. Also consider whether adding to the abstract interface vs. a `BaseObjectStore` default is the right shape for out-of-tree stores and Pulsar.

</details>
