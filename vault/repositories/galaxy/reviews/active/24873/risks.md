Risks are minimal - this change only rewords an INFO log line and adds the validation reason to it; it doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- Log-scraping tooling keyed on the old `workflow tool request state: ... state=validation_failed` text breaks; statsd metrics are unchanged.
- The validation reason moves from DEBUG to INFO, so pydantic error text (which can echo user-supplied parameter values) now lands in default production logs.

</details>

<details><summary>Risk Review Advice</summary>

Confirm nobody (admins, dashboards) greps the old message format on 26.2 deployments, and that surfacing validation error text at INFO is acceptable for log volume and content on large servers.

</details>
