Document how Galaxy administrators can customize OIDC authorization requests using existing configuration settings.

An administrator who wants an IdP to request MFA or re-authenticate after an hour needs to know which file to edit, how to name the provider's Setter properties, and how to check that they reached the IdP. The authentication guide now walks through those steps, with a parameter reference, provider-prefix exceptions, and a matching commented sample configuration.

***This is an administrator configuration guide for existing behavior; the PR adds no authentication features or runtime changes.***

***Requesting MFA with `acr_values` does not enforce it in Galaxy: the guide explains that MFA must also be required for Galaxy's client at the IdP.***

## Risks

Risks are minimal: these documentation and commented-example changes are easy to revise or revert (a two-way door). Review the provider prefixes and the distinction between requesting an authentication level and enforcing it.

## Context

Contributes to the OIDC documentation refresh discussed in #23253 and follows the PKCE section from #23836. Covers `acr_values`, `login_hint`, `max_age`, `ui_locales`, and `display`; identifies the unsupported `azure` and `tapis` backends and keeps `prompt` with its existing provider configuration.

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? The guide explains how to inspect the IdP redirect for missing parameters and check the provider prefix.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? N/A — documentation only.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc. — what purpose do they serve? N/A.

## How to test the changes?

- [x] Instructions for manual testing are as follows:

<details><summary>Build the guide and verify the configuration examples.</summary>

Build the documentation with `make docs`, then read the authentication guide's “Authorization request parameters” section. On an OIDC-configured Galaxy instance, add a Setter for a supported provider, start a login, and inspect the redirect query string for the configured value. The `OIDC_MAX_AGE` example applies to the generic `oidc` provider; use your provider's prefix for another backend.

Local validation passed a targeted Sphinx/MyST HTML build with warnings treated as errors, parsed the sample and example XML, and checked the rendered heading anchors and reference tables. The full fork documentation build is pending.

</details>
