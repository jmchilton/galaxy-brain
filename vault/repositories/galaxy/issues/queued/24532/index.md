# #24532 Refused account self-deletion shows a generic error

https://github.com/galaxyproject/galaxy/issues/24532 — filed 2026-10-28 from incubator record, assigned jmchilton.

`UserDeletion.vue` checks `err_code === 403`; server sends `403004`. Fix: compare to named `CONFIG_DOES_NOT_ALLOW` constant + red-first vitest in `UserDeletion.test.ts`.

- [proposal.md](proposal.md) — issue body as posted
- [debrief.md](debrief.md) — research + review round
