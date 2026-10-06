# galaxy#18351 — Workflow report editor doesn't take into account map over status

[Issue](https://github.com/galaxyproject/galaxy/issues/18351)

The workflow report editor ignores map-over, so embedding a mapped-over output as a dataset breaks report rendering with a `ResponseValidationError` (mvdbeek, Sentry); next: red test for a mapped-over output embed.
