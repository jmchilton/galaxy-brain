# galaxy#24309 — A custom build made from a history FASTA isn't listed until its jobs finish and the page is reloaded

[Issue](https://github.com/galaxyproject/galaxy/issues/24309) · [proposal](proposal.md) · [debrief](debrief.md) · [source draft](issue_draft.md)

Filed 2026-10-20, assigned to jmchilton. Found by the 26.2 FAQ loop (`faqs/galaxy/analysis_add_custom_build`, embedded in `ecology/ref-based-rad-seq`).

GET custom_builds drops builds whose `linecount` HDA isn't `ok`; the page never polls. Double Save hits the duplicate-key error; failed builds are undeletable.

Next: red API test (PUT FASTA build, GET at once, expect pending state) — needs the fasta→len→linecount converters in test datatypes (on `galaxy_ui_driver`).
