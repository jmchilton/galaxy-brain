LGTM!

<details><summary>Automated Review Details</summary>

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md).

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- Turns on the RETURNING branch of DB-based job/invocation grabbing for deployments using `db-skip-locked` or `db-transaction-isolation` assignment; that code has been dormant, so any latent bug there surfaces now.
- Easily reverted; no API, schema, or artifact-format changes.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should glance at `grab_unhandled_items()` in `lib/galaxy/jobs/handler.py`, the code the fix re-enables, rather than the one-line probe itself. A deployment using DB-based handler assignment on postgres is the place to watch after release.

</details>
