For #773. Merging this into `fix/723-authoring-gate` keeps the authoring gate and takes #678 out of it. That half is #778.

**Commits on top of your branch**

1. **Merge `main`.** Your branch was on `618853f0`, and casts need regenerating against current `main`.
2. **Revert `043f6d73`.** `discover-shed-tool` keeps `hit`, `weak` and `miss`.
3. **Gate authoring on a miss.**
   - §1 is one rule: author only on `miss`, or on a `weak` candidate the caller's confirmation rejected. Otherwise stop, emit no UDT and return the candidate.
   - The discovery result is now a declared `galaxy-tool-pin` input, since §1 reads it.
   - The summary, intro and `eval.md` property no longer allow authoring on weak evidence.
4. **Concrete scenarios.** Each case names a process in the pinned nf-core/rnaseq 3.24.0:
   - `FASTP` hits `iuc/fastp/fastp`, so the Mold must not author.
   - `FQ_LINT` (BioContainers image) and `RIBODETECTOR` (Wave image) have no Tool Shed wrapper, checked with `gxwf tool-search` on 2026-11-10. Their expectations pin the container, packages and command.
5. **Regenerate** `casts/`, `Dashboard.md` and `Index.md`.

**Testing:** `make check` passes locally, with 496 tests, except two checks. `validate-roadmap` also fails on `main` (#768 isn't in the roadmap yet). `check-vendored` fails only on the machine that ran it.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
