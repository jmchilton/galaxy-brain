# pulsar#542 — Galaxy's Docker `trap _on_exit EXIT` replaces the job script's EXIT handler, so cvmfsexec `mountrepo` never unmounts for Docker jobs

[Issue](https://github.com/galaxyproject/pulsar/issues/542) · [issue draft](issue_draft.md)

Filed 2026-10-06 from `gx_issues/to_file/` (found while polishing `gx_branches` `it_container_epilog_docs`), posted without the polish round. Pulsar's cvmfsexec exit handlers (`e3a1b49`, #475) have since shipped in 0.15.16 and 0.16.0; Galaxy-side trap chaining is the general fix.

2026-10-27: root cause confirmed on `release_0.15`; branch [`job-script-exit-trap-542`](../../../branches/active/job-script-exit-trap-542/index.md) runs the job command in a subshell whenever exit handlers are set.
