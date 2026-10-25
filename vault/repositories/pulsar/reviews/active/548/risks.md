Risks are low: this change adds configurable retries to the existing tus uploader and is straightforward to revert (a two-way door). It introduces no data migration or persistent format change.

<details><summary>Risk Review Advice</summary>

Confirm that interrupted uploads resume the existing tus session and that exhausted retries still reach Pulsar's action retry handler. The defaults add ten retries with a 30-second delay, so persistent upload failures will take longer to surface; operators can adjust these values through the new environment variables.

</details>
