
From mattpocock:

> Describe whether  it's a one-way or two-way door. You can walk back through two-way doors, but not one-way doors. A PR that is cheap to roll back is lower risk. Changes that involve destructive actions or hard-to-reverse decisions are one-way doors.

For Galaxy - common one-way doors are:
- API Changes
- Things that establish behaviors for developer artifacts such as workflows or tools.
- Substantial UI changes that require users to learn new or non-obvious things.

Common two way doors are:
- Test-only changes.
- Refactor-only changes.
- Subtle changes to the UI or UI changes that are obvious.

A risk section when requested should be of the form:

```
## Risks

(one sentence summarizing the one-way risks as clearly as possible)

<details><summary>Risk Details</summary>

(a flat list of plainly stated, clear risks)

</details>

<details><summary>Risk Review Advice</summary>

(one of two small paragraphs describing what parts of the change should be specifically considered by humans responsible for making it)

</details>

```

or something similar for two-way changes

```
## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

```

