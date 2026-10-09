**Title:** Proposal: maintain a Pulsar release branch per Galaxy release

---

Pulsar has shipped only one minor series since April 2023. Every Galaxy release has pinned whatever `0.15.N` was newest when it branched:

| Galaxy | `pulsar-galaxy-lib` pin |
|---|---|
| 24.0, 24.1 | 0.15.6 |
| 24.2 | 0.15.7 |
| 25.0 | 0.15.9 |
| 25.1, 26.0 | 0.15.14 |
| 26.1 | 0.15.15 |

Without release branches, a Galaxy release can only get a Pulsar bug fix by taking everything else on master too. master is currently 151 commits past 0.15.15 and includes deliberate behavior changes: the Mesos executor and the `__PULSAR_JOBS_DIRECTORY__` token were removed, and `path_types: "*any*"` now matches container paths. None of that belongs in a 0.15.x point release for 26.1. In practice, fixes either don't reach older Galaxy releases or arrive bundled with unrelated changes.

We didn't have the capacity to maintain release branches before. Now we do.

## Proposal

- **One minor series per Galaxy release.** Bump Pulsar's minor version at least once per Galaxy release:
  - `0.15.x` covers Galaxy 26.1 and earlier.
  - `0.16.x` will be for the upcoming 26.2.
  - Master then moves to `0.17.0.dev0`.
- **Release branches named like Galaxy's.**
  - Cut `release_0.15` from the `0.15.15` tag now.
  - Cut `release_0.16` from master around the time Galaxy branches `release_26.2`.
- **Merge forward, as Galaxy does.**
  - Open a bug fix against the oldest supported release branch it applies to.
  - After it merges, merge that branch up through the newer release branches and into master.
  - Features and behavior changes go to master only.
- **Point releases from release branches.** Tag `0.15.16`, `0.16.1`, ... from the matching branch. The Galaxy release branch then bumps its pin in `pinned-requirements.txt`.
- **Support window follows Galaxy's.** A Pulsar release branch gets backports as long as any Galaxy release mapped to it still receives fixes. Once none do, it is retired.
- **Published mapping.** Keep a Galaxy ↔ Pulsar table in the docs, next to the Galaxy configuration docs, and update it whenever a minor is cut or a Galaxy release goes end of life.

## Compatibility

The mapping records which `pulsar-galaxy-lib` series each Galaxy release ships and tests against. It is not a compatibility guarantee:
- We'll make a best effort to keep a Pulsar server and Galaxy client from neighboring series working together, and to call out known breaks in `HISTORY.rst`.
- We won't promise any cross-version support matrix.

## Open questions

- Should Galaxy release branches pin with `~=0.15.15` (compatible release), so deployers pick up point releases without a Galaxy-side bump? Or keep `==` and bump per point release?
- Who is responsible for merging forward and tagging point releases? Should any of it be automated?
- Should master's `HISTORY.rst` keep a section for each point release, or should each release branch keep its own section that gets merged up?
