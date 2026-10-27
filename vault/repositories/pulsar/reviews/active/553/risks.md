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
