# issue_20900_invocation_validation

Status: `branches_implemented_needs_ci`. Base: `dev`.

Validates workflow invocation requests before creating histories or other side effects (#20900).

[Implementation](implementation_debrief.md) · [Tracking history](tracking_history.md)

## TICK — 2026-10-11

Current-SHA fork workflow framework reports many request-500 failures, and both browser engines reject the nested-collection extraction request (400, list:paired supplied to list). Integration rejects dataset supplied to collection input. These exercise the changed validation; do not label them unrelated or promote.
