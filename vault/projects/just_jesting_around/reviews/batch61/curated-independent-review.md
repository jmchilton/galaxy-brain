# CuratedWorkflowList — independent review, batch 61

Reviewed final worker `64c2cdab21c94f330ecc972321c91cc14b526cfa` against `9b952a0b874de984c631e217445e3298042500eb`, source request-generation/pagination/filter logic, and client testing guidance. Approve; no blocking findings.

All 23 cases and 79 original assertions remain, with matcher arguments and scenario order preserved. Required controls/text/components use get/getComponent; presence/absence checks retain find/exists. The deferred stale-response case still resolves the newer response first and the older response afterward, then checks the newer card survives. Pagination still observes offsets 0, 48, 24 when the catalog shrinks. Filtering, invalid-filter request suppression, Recommended sort omission/restoration, collection replacement/clearing, preservation of other filters/free text, alias handling, badge filtering, and local/IWC distinctions retain their original transitions and exact query checks.

Each mount owns a real test Pinia and memory router through withPlugins; user setup targets that Pinia and disposal follows wrapper cleanup. Auto-unmount runs before mock restoration. The partial configuration response is explicitly untyped HTTP fixture data rather than an any cast, while catalog payloads remain typed. Scope is unchanged and no production logic is mocked away.

Independent shuffled seed 610201 passes all 23 cases (`/private/tmp/readability61-curated-independent.log`). Author coverage retains every original covered location, adding only DelayedInput cleanup; separate actual shared UI coverage matches exactly. Existing local helpers and canonical lifecycle facilities suffice; no shared harness or product change requested.
