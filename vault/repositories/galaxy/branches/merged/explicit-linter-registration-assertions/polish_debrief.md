# Polish debrief — explicit-linter-registration-assertions

2026-10-03. Branch `3ab55df28dd` → `95b704f4448` (one commit on dev `6f4507e7982`).

## CI

Two fork reds on `3ab55df28dd`, both unrelated: `Integration (3.10, 1)` failed while setting up minikube/cri-dockerd (HTTP 500 on download, before any test ran), and `Test Galaxy release script` fails only on the fork. CI on `95b704f4448` was queued at handoff.

## Checklist

- First pass failed "what does the user see when it fails": one membership assert per name meant a new, unlisted linter passed silently and duplicates went unnoticed. John picked sorted equality.
- `sorted(...) == [...]` gave misleading pytest output (index diff, "Left contains one more item: 'XSD'"), so I switched to set equality plus a duplicate check. That names every added, removed or renamed linter.
- Second pass: the duplicate check printed only `158 == 157`. Switched to a `Counter` check, which prints `assert not ['CitationsFound']`.
- The stale "156" in the commit message was fixed by squashing to one commit.
- Also dropped the deprecated `list_listers` alias in favour of `list_linters()`.

## Strengthening round

- Fixed facts: #22061's count bump wasn't a one-line commit, and #12941 needed two. The `dev` half of the failure example didn't match its own scenario: a swap leaves 157 names, so `dev` passes. Reworked the example to show that `dev` misses a rename entirely.
- Added highlighted sentences on renames (planemo's `--skip` rejects unknown names, verified in `planemo/lint.py`).

## Left over

- Nothing enforces the sort order. Conflict avoidance relies on the comment. An enforced sorted tuple was suggested; skipped to keep the test simple.
- Planemo's `--skip` help example `'citations,xml_order'` uses module names, but validation accepts only linter class names plus four extras. Possible planemo issue. Out of scope, so it's a question for John.
