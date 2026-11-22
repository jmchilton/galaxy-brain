# P2 2 — tools-iuc scan for input links on outputs

Scan of tools-iuc `origin/main` at `484f147f4` (2026-11-20) for symlinks from an input (or `.fields.path`) onto a `from_work_dir` source or a named output. Static only; nothing run.

## Method

- Regex over each tool dir's XML: `ln -s<flags> <src with $ or /> <dst>`, where `dst` equals or glob-matches a `from_work_dir` value, is a directory above one, or is a named output. 45 hits in 21 dirs.
- Kept only hits where the link and the `from_work_dir` output are in the same tool, then read each command block.
- Separate grep for `ln -s … '$var'` onto Cheetah vars and for `os.symlink` in wrapper scripts.

## Real breaks (2)

| Tool | Trigger | What happens today | With #25005 |
| --- | --- | --- | --- |
| `trinotate/trinotate.xml` | `select_download=no` (user supplies sqlite) + `keep_sqlite=true` | `ln -s '$trinotate_sqlite_in' Trinotate.sqlite`, then `Trinotate Trinotate.sqlite init/LOAD_*` write through the link into the input dataset; output collects the mutated input | copy refused, job fails; input still mutated during the run |
| `crispr_studio/crispr_studio.xml` | rerun mode (`-r`) | `.final` linked to `prev_final`; upstream `reformatData()` reopens it with `'w'`, writing through the link into the input dataset. `.svg` link is `os.rename`d to `.bkup.svg` first, so that output is a fresh file and unaffected | `output_spacermatch_mcl_final` copy refused, job fails; input still mutated |

Neither path is in the tool tests (trinotate tests use the default `select_download=yes`; crispr_studio tests don't use `-r`), so tools-iuc CI won't notice.

Both are already buggy: they mutate a user's input dataset in place. The PR turns silent input corruption into a failed job, but the corruption still happens. No tools-iuc tool was found that links an input onto an output purely as a read-only pass-through, which is the case P2 2 worried about.

## False positives

- Link and output in mutually exclusive branches: `cnvkit/batch.xml` (`reference.cnn`), `stacks2/stacks_populations.xml` (`bsarchive`).
- Link removed and the file rewritten: `metasbt/index.xml` (`rm` then `mv` new tarball).
- Link and `from_work_dir` in different tools of the suite: rest of `cnvkit`, `gatk4`, `sourmash`, `diamond`, `samestr`, `mothur`, `enzywizard`.
- Literal dst matching an output name by coincidence: `bmtagger`, `das_tool`, `cami_amber`.
- `$var` dsts are `#set` local filenames, not outputs.
- Data managers linking into `${out_file.extra_files_path}`: extra-files collection, covered by 64360a61721's `safe_walk`, not this PR.

## Limits

Regex scan: links built in loops, in wrapper scripts writing to `$output`, or via dirs linked above an output could be missed. Only tools-iuc scanned, not other ToolShed owners.
