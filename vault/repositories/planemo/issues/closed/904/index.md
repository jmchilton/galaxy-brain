# planemo#904 — Reserved input names

[Issue](https://github.com/galaxyproject/planemo/issues/904) · [review](review.md) · [PR description](pr_description.md)

[Galaxy PR 23831](https://github.com/galaxyproject/galaxy/pull/23831) merged; Galaxy-side linter warns on top-level Cheetah reserved names, including argument-derived parameter names and input groups; nested fields remain allowed. No Planemo code change needed; consumers receive the check through an updated galaxy-tool-util package.

Closed 2026-10-01.
