### P3 1: Test doesn't pin the other input side effects of skipping (implementation verified)

`set_skipped` also sets `blurb = "skipped"`, `state = ok` and `visible = False`, but the new test only checks the input HDAs' extension and content. A partial regression that keeps the input's dataset but still clobbers its metadata would pass.

Capture the input HDAs before invoking, then also assert each input keeps `state == "ok"`, `misc_blurb != "skipped"` and its original `visible`. Compare visibility to the pre-invocation value: the fetched `list:paired` elements are hidden from the start, so `assert input_hda["visible"]` would fail.

<details><summary>Details</summary>

Commit `d1138c95d8e` on `pr_24286_review_0` (+13/-1, test only). It also waits on the fetch job (`wait_for_fetched_collection`) before reading the collection, since `wait_for_history` alone can return before the collection elements exist.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort: the strengthened test passes with the fix; with the fix reverted and the existing `file_ext` assertion temporarily removed, it fails on `misc_blurb` (the input's blurb was `skipped`).

</details>
