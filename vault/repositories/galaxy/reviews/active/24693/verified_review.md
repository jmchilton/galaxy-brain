### P2 1: No test runs the verifier against a really failed collection (implementation verified)

Every new test uses a hand-written dict, so nothing shows that Galaxy returns a state that trips the new check when a job succeeds with a failed collection. The nested branch rests on a claim about the API's payload shape that was only read from source.

<details><summary>Evidence</summary>

A `list` output whose discovery pattern yields two identifiers reaches `CollectionBuilder.get_level`, which raises `AssertionError`. The generic `except Exception` in `output_collect.py` calls `handle_population_failed`, and the job still ends `ok`. Against a live server, the verifier reports `Problem building datasets for collection.` for a plain run and `list_output/sample1` for a mapped-over run, confirming the nested payload shape. All three new tests fail with this PR's verifier change reverted.

</details>

Add a small framework tool using that route, with an `expect_test_failure` tool test, and integration tests for the plain and mapped-over runs. They assert the job is `ok` and the exact error. The branch does this.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 2: Population-before-type-and-count ordering is untested, and the tests' type assertions are ignored (implementation verified)

The PR says population is checked before type, counts, or elements, but moving the call after those checks passes all tests. A failed collection would then report a misleading count or type error. The new tests also pass `collection_type` to `TestCollectionOutputDef.from_dict`, which reads the type from `attributes` and ignores that key, so those definitions assert no type at all.

Parametrize the rejection test with a matching type, a mismatched type and `element_count: 1`, and use `attributes` in the other new tests. The exact-message assertion then pins the order. The branch does this; 4 cases fail when the call is moved.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 1: `verify_population` closure can't be reused (implementation verified)

The check captures nothing from `verify_collection` but is defined inside it, so it can't be called by a sibling verifier such as `_verify_output_collection` in `lib/galaxy_test/selenium/framework.py`.

Move it to a module-level `verify_collection_population`, with no behavior change. The branch does this.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: `populated_state_message` is never asserted (implementation verified)

The PR names the population message as behavior and it is the actionable part of the error, but removing the line that appends it passes all tests.

Add a case with `populated_state_message` set that asserts the full string. The branch does this; the test fails with the append removed.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 3: Recursion is only tested one level deep (implementation verified)

Replacing the recursive call with a one-level child check passes all tests, though `list:list:list` is valid and the fix is described as recursive.

Add a three-level case with the `plots/outer/inner` path. The branch does this; the test fails under that one-level mutation.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>
