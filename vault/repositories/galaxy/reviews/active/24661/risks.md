Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- Swaps BootstrapVue `BPagination` for the galaxy-ui `GPagination` wrapper on the tool success page; pure client UI, no API or artifact changes.
- `JobHeader.vue` flex-wrap change also affects other `JobHeader` consumers (e.g. `JobDetails.vue`); header actions may now wrap below the title at narrow widths.
- Selenium/Playwright selectors relying on `.page-item .page-link` on this page would break; unit test selectors were updated accordingly.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should glance at the job details page and tool success page at narrow widths to confirm the new wrapping layout is acceptable, and check no E2E tests target the old Bootstrap pagination markup here.

</details>
