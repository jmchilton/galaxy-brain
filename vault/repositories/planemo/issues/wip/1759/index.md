# #1759 — expression.json collection element assertions

Issue: https://github.com/galaxyproject/planemo/issues/1759

Claimed 2026-10-26. Implemented on [collection-expression-assertions](../../../branches/active/collection-expression-assertions/index.md); reviewed, hardened, polished and pushed; awaiting John’s final review.

This belongs in Planemo. Galaxy's output_to_cwl_json deliberately parses expression.json values for CWL. Planemo loses their downloaded file properties before calling a file verifier. The fix retains those paths for Galaxy collection assertions and leaves CWL conversion intact. No upstream issue is needed.

Searched open Planemo PRs for #1759 and expression.json; no matching existing work. Checked local matching branch names before creating this branch.
