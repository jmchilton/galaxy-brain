# galaxy#22999 — Feature request: Ephemeral workflow outputs

[Issue](https://github.com/galaxyproject/galaxy/issues/22999)

Flag workflow outputs as ephemeral so the metadata setter is skipped for pure glue-code steps, and to give a future "workflow compiler" the information it needs to fuse or stream steps; spans the workflow model, format2, and the scheduler, and pvanheus notes deferred datasets already skip metadata and may be the reusable mechanism.
