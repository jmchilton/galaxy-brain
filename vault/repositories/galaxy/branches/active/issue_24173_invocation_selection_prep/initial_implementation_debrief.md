# Initial extraction debrief

Extraction is in progress from feature head `43167c36a4c`, with the same base `88127f42979`. The intended prep contains five atomic commits: invocation lookup by order_index plus regression; measured graph-centering readiness plus regression; real-router report baseline coverage; isolated metrics API test responses; and a state-driven wait before an existing job screenshot. Estimated scope is +158/-46 lines across 12 files. No new GenericItem API or selection context belongs here.

Each prep test must execute without the selection module present. After independent validation and review, the original feature will be rebased onto prep. Its final tree must be byte-for-byte equal to the old feature head; existing acceptance evidence then remains applicable. Fresh prep checks, scope review and screenshot evidence will be recorded before handoff. No PR will be opened.
