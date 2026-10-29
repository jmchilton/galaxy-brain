Run via gpt-6-sol at medium effort.

# citation_fetch_hardening_26.1 — Codex review (second pass, after re-scope)

Reviewed tip `c05b250203b` against `origin/release_26.1`. Nothing was changed. Of the three findings, two are bounds already documented on the branch and one was withheld. The first pass is in `earlier_drafts/1/codex_review.md`.

Not acted on:
- **The request deadline doesn't cap the last DOI lookup.** This is the documented bound: about 30s plus one fetch timeout. A lookup started before the deadline keeps its own timeout. Shrinking the timeout to fit the time left would mean plumbing the budget into the fetch timeout, for little gain.
- **The 32KB BibTeX cap excludes fetched DOI responses.** That's by design. The cap limits declared citation content, and fetched responses have their own 64KB `bounded_get` cap.
- Possible security issue, details withheld.

Coverage note from Codex: it reviewed the full diff and the surrounding fetch, parsing and validation paths. It found no duplicated logic or missing reusable abstraction.
