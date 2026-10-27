# pulsar#542 — Galaxy's Docker `trap _on_exit EXIT` replaces the job script's EXIT handler, so cvmfsexec `mountrepo` never unmounts for Docker jobs

[Issue](https://github.com/galaxyproject/pulsar/issues/542) · [issue draft](issue_draft.md)

Filed 2026-10-06 from `gx_issues/to_file/` (found while polishing `gx_branches` `it_container_epilog_docs`), posted without the polish round. Pulsar's cvmfsexec exit handlers (`e3a1b49`, #475) are unreleased, so fix before the next release: run `$command` in a subshell in `mountrepo` mode; Galaxy-side trap chaining is the general fix.
