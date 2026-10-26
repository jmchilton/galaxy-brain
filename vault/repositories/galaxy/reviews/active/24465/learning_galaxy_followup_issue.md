# Learning Galaxy follow-up for #24465

Profile: `learning_galaxy` · Model: GPT-6 · Effort: medium · Commit: `d7dfb46505d72d1a4d4891e2977781d721d1cd5a`

No point-by-point corrections to existing research are needed: the collection-model, collection-execution, and post-job-action notes inspected do not state a contradictory completion transaction contract.

After merge, document the completion lifecycle in the requested `Component - Job Completion Lifecycle` research note. Cover ordinary and extended-metadata paths, importer transaction ownership, metrics/state visibility, disk-accounting contention, delayed hash dispatch, and separate collection/invocation timestamp updates. Distinguish finish from other callers retaining `Job.set_final_state()` semantics, and best-effort task dispatch from durable delivery.

Cross-link the lifecycle note from `Component - Collection Models` and `Component - Post Job Actions` where they discuss job dependencies and completion hooks. Their existing component descriptions do not need correction solely because lifecycle documentation was missing.

Queued request: `vault/agents/gx_research/todo/job_completion_lifecycle.md`.
