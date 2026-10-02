# #21907: Converge framework workflow test syntax toward Planemo syntax

https://github.com/galaxyproject/galaxy/pull/21907. Merged. +415/-64 across 20 files, 1 commit.

## What happened

- **2026-02-23 21:23:** opened as a draft. The description opens with a self-critique: "I took some shortcuts when
  implementing this and the slightly more concise syntax of these tests is not worth having a separate syntax from
  Planemo and having no control over the actual elements being created."
- It then gives a bullet list of mechanics: route through `galactic_job_json()`, which Planemo shares; detect `class:`
  syntax and keep backward compatibility; convert about 20 fixture files. It ends with a link to a background gist.
- **2026-02-24 09:40:** mvdbeek approved while it was still a draft, with **"Looks great to me, failing tests
  unrelated"** and a ❤️ on the PR.
- **14:32:** John marked it ready and merged it himself. Open to merge was about 17 hours.

## Why it landed well

- **It removes a parallel abstraction.** Galaxy's framework test syntax had drifted from Planemo's. This PR routes
  both through the shared `galactic_job_json()`. It is "reuse existing machinery" done as a refactor.
- **The author owned the shortcut.** Leading with "I took some shortcuts" removed any debate over whether the old
  syntax was worth keeping.
- Backward compatibility was kept (old syntax still detected), so nothing broke for other test authors.

## Reusable signal

- **Convergence PRs (two syntaxes become one, routed through shared code) are the ones mvdbeek is happiest to see.**
  See also #22566.
- A short "why the old way was a mistake" lead plus a mechanical change list is enough when the change is
  consolidation.
- Drafts don't slow him down. He approved this one before it was marked ready.
