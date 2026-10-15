# Initial implementation debrief

Initial backend and client phases implemented; normal phase reviews complete. Final validation and required handoff reviews are in progress.

Uses a nullable indexed self foreign key with ON DELETE SET NULL and a reversible migration. Invoke requests accept an encoded source invocation ID and validate access before constructing run configs; every batch invocation receives the source. Collection responses add an inexpensive is_rerun marker. Element responses expose access-filtered source and latest accessible direct successor links. Reusable request exports and model-store imports omit lineage.

Both simple and expanded forms submit their immediate rerun source. Invocation pages link to source/latest accessible rerun, and both invocation lists mark reruns. Browser regression follows I → J → K using both forms, checks reload persistence and navigation, and captures screenshots.

Validation so far: two focused API tests pass, covering batch expansion, source validation, request replay, access changes, and successor fallback. Migration/model-store tests pass, including SQLite FK enforcement/deletion/downgrade and deliberately ignored imported local IDs. Thirteen focused client tests pass. Browser execution pending after restarting isolated servers under coordinator ownership. PostgreSQL execution has not been available locally (client tools present, server binary absent).

Backend normal review findings on consistent element serialization and tool-test decorators were fixed. Client normal review found no correctness findings. Required test challenges, E2E polish, strict code quality review, scope evaluation, screenshot inspection and final handoff remain.

Accepted scope: direct lineage links and markers; no transitive grouping, edited-step marker, or lineage preservation across import.
