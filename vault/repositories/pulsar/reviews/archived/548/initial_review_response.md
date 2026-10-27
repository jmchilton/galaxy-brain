LGTM! -John

<details><summary>Automated Review Details</summary>

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via GPT-6.1 Sol at medium effort.
- Review profile [generic_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_risk_assessment.md) was run via GPT-6.1 Sol at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via GPT-6.1 Sol at medium effort.

</details>

<details><summary>Risks</summary>

Risks are low: this change adds configurable retries to the existing tus uploader and is straightforward to revert (a two-way door). It introduces no data migration or persistent format change.

<details><summary>Risk Review Advice</summary>

Confirm that interrupted uploads resume the existing tus session and that exhausted retries still reach Pulsar's action retry handler. The defaults add ten retries with a 30-second delay, so persistent upload failures will take longer to surface; operators can adjust these values through the new environment variables.

</details>

</details>

Heroic effort 🦸 - none of the agents found issues.
