
From mattpocock:

> Describe whether  it's a one-way or two-way door. You can walk back through two-way doors, but not one-way doors. A PR that is cheap to roll back is lower risk. Changes that involve destructive actions or hard-to-reverse decisions are one-way doors.

Common two way doors are:
- Test-only changes.
- Refactor-only changes.
- Subtle changes to the UI or UI changes that are obvious.

A risk section or document when requested should be of the form:

```
(one sentence summarizing the one-way risks as clearly as possible)

<details><summary>Risk Details</summary>

(a flat list of plainly stated, clear risks)

</details>

<details><summary>Risk Review Advice</summary>

(one or two small paragraphs describing what parts of the change should be specifically considered by humans responsible for making it)

</details>

```

or something similar for two-way changes

```
Risks are minimal - this change doesn't lock the project into particular difficult to change choices (a two-way door).

```

When writing `risks.md`, use no heading. When writing a section of another document (e.g. a PR description), lead with `## Risks`.
