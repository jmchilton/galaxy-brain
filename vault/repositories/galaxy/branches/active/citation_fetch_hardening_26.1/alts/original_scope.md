# citation_fetch_hardening_26.1_alt_original_scope

[View on GitHub](https://github.com/jmchilton/galaxy/tree/citation_fetch_hardening_26.1_alt_original_scope) · tip `8fb806e8e37`

The branch as hardened before the first scope evaluation, with 15 commits:
- bounded DOI and bio.tools fetches
- citation resolution limits
- config options

It differs from the parent in that bio.tools lookups keep beaker's `get(key, createfunc)`. A failed lookup there is cached as `None` with no expiry, and the failure-cache policy lives only in `DoiCache.get_bibtex`. The parent shares one get-or-fetch policy between both lookups and fixes the Tool Shed `citation_cache_url` option.
