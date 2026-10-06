# foundry#564 — advance-galaxy-draft-step/repair-galaxy-draft-topology can produce step doc: text long enough to crash workflow import on live Galaxy instances; no lint/validate check catches it

[Issue](https://github.com/galaxyproject/foundry/issues/564) · [investigation](investigation.md)

Labels at seeding (2026-10-06): `needs-triage`.

Our investigation (2026-09-17) traced the import failure to Galaxy's full-text B-tree index on `WorkflowStepAnnotationAssociation.annotation`; galaxy#23579 (closed 2026-09-21) dropped those indexes and added a 64KB annotation limit. Foundry still has no lint/validate check on step `doc` length.
