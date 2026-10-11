# Review: jmchilton/planemo #9 → galaxyproject/planemo #1709

- Fix PR: https://github.com/jmchilton/planemo/pull/9
- Upstream PR: https://github.com/galaxyproject/planemo/pull/1709
- Reviewed head: `989f6042ae5fc06bb5fcf4062b3ec6d55293bd24`
- Reviewed base: `7ca73d0e8a12825f1d0f7db463f319c1a42cfefc`
- Recommendation: **APPROVE / merge into `python-gc-doc-example`**. No blocking issue found.

The example executes `python3`, so declaring the `python` package at version 3.12 is appropriate and teaches Galaxy dependency provisioning instead of assuming the host interpreter. The added RST sentence accurately explains the declaration. The literalinclude has no line selection or emphasis offsets to adjust.

## Validation

- XML parsed successfully; package requirement is exactly `type="package" version="3.12"` with value `python`; command still invokes `python3` and the local example script.
- Executed the actual script with `python3` against uppercase, lowercase, multiline, and final-record-without-newline FASTA inputs. Outputs were exactly `0.667\n0.667\n0.667\n0.000\n`.
- Ran actual CLI `PYTHONPATH=$PWD /Users/jxc755/projects/repositories/planemo/.venv/bin/planemo lint docs/writing/gc_content.xml`. Exit 1 reflects the pre-existing `ToolVersionMissing` error; remaining warnings are TestsMissing and CitationsMissing. No requirement-related findings.
- Ran the same actual lint on XML extracted from the base commit; identical error and warnings, confirming no lint regression.
- Sphinx documentation build was not run; the change adds a plain paragraph and an XML block already included without line filters.

## Follow-ups for John

**Low priority decision — empty FASTA records:** Marius noted that a header with no following sequence raises `ZeroDivisionError` in `gc_content.py`. Reproduced with `>empty\n`. This behavior predates the Python replacement (the Perl example has the same division behavior) and is not caused by this fix. Decide whether this deliberately small teaching example should reject empty records with a clearer message, skip them, or leave the inherited behavior. There is no universally correct GC fraction for a zero-length sequence, so changing this needs an explicit desired behavior rather than silently substituting zero. This is not a merge blocker for #9.

**Optional documentation cleanup:** The example lacks a tool version (confirmed by baseline lint), plus tests/citations. If making the example fully lint-clean is desired, handle that separately from this requirement fix; avoid presenting the current lint run as fully passing.

No original worktree edits, merges, or pushes performed.

## Coordinator outcome

Companion #9 merged into python-gc-doc-example. XML declaration and script smoke cases pass; lint findings match the pre-existing base findings.
