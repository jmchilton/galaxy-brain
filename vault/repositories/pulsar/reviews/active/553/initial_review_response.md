

<details><summary>Automated Review Details</summary>

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via GPT-6 (Codex) at medium effort.
- Review profile [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) was run via GPT-6 (Codex) at medium effort.
- Review profile [generic_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_risk_assessment.md) was run via GPT-6 (Codex) at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via GPT-6 (Codex) at medium effort.

</details>

<details><summary>Risks</summary>

This is mostly a two-way door: the staging change can be reverted, but jobs already submitted with URL-only inputs depend on those URLs remaining usable until transfer completes.

<details><summary>Risk Details</summary>

- Signed URLs can expire while a job waits for staging or retries a transfer; these inputs have no local-file fallback.
- Extra files now depend on the supplied manifest being complete and accurate; omitted files are not discovered by walking the directory, and an empty manifest deliberately stages nothing.
- Deployments using path-based action rules must select a remote transfer for URL-only inputs. Local transfer and copy actions still require the original files to exist.
- The change extends the client input contract consumed by Galaxy; rollout should preserve the existing path-only behavior and account for older installed client libraries.

</details>

<details><summary>Risk Review Advice</summary>

Verify an end-to-end Galaxy submission with an uncached dataset and nested extra files, including queue delays or retries that approach URL expiry. Confirm the URL lifetime covers the actual staging schedule and that transfer failures are visible to operators.

Exercise both remote transfer variants and representative path-specific action rules. Check that the manifest producer supplies the complete extra files listing and that existing path-only jobs retain their staging and rewrite behavior.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/pulsar/tree/pr_553_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

The [`pr_553_review_0`](https://github.com/jmchilton/pulsar/tree/pr_553_review_0) branch starts from reviewed commit [`8594de636006348eb72dc597753791f3531a3835`](https://github.com/jmchilton/pulsar/commit/8594de636006348eb72dc597753791f3531a3835) and adds regression coverage for URL-backed input files and extra-files manifest members when path rewriting is enabled. It checks launched command lines and remotely staged config contents against Pulsar paths while preserving the exact fetch URLs, and retains the original rewrite-disabled cases. All four added or edited tests passed individually using `/private/tmp/pulsar-553-review-venv/bin/python`; `make lint VENV=/private/tmp/pulsar-553-review-venv` also passed with tox storage in `/private/tmp/pulsar-553-tox`. No production code changed. The branch is committed and pushed to [pr_553_review_0](https://github.com/jmchilton/pulsar/tree/pr_553_review_0).

- [`49872eb`](https://github.com/jmchilton/pulsar/commit/49872eb9071e6c706f73300528531926ba19c8d6) — Test URL-backed input path rewriting in commands and configs. Adds two rewrite-enabled regression tests and shared assertions for the existing success cases (49 added lines).

</details>

</details>

### P2 1: Cover URL-backed input path rewriting in commands and configs (implementation verified)

The new URL-input and extra-files-manifest success cases run with `rewrite_paths=False`, so they cannot detect a regression that stages the correct names and URLs but leaves command lines or config files pointing to missing Galaxy files. Add rewrite-enabled cases for the absent input file and nested manifest members, asserting the launched command, staged config contents, and exact source URLs. This is a regression coverage gap; verification did not reproduce an implementation failure. [Verification commit `49872eb`](https://github.com/jmchilton/pulsar/commit/49872eb9071e6c706f73300528531926ba19c8d6).

Addressed in `pr_553_review_0` by commit `49872eb`: two new rewrite-enabled cases reuse the existing success fixtures, while retaining both original cases with rewriting disabled. All four added or edited tests passed individually, and `make lint` passed. The change adds 49 lines in one test file; estimated effort was small (under one hour).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via GPT-6 (Codex) at medium effort. Verified via GPT-6 (Codex) at medium effort.

</details>
