# faqs_26_2.yaml

A checklist of every GTN FAQ, for walking through them during release 26.2 QA. The process is in
[HARDEN_AGAINST_FAQ.md](HARDEN_AGAINST_FAQ.md).

```yaml
- faq: faqs/galaxy/datasets_upload.md
  status: ui_verified
  mode: ui
  gtn_commit: 45d4932d33
  galaxy_commit: 6c1b6093964
  faq_findings: Step 2 names a button that 26.2 renamed.
  gx_findings: Added upload_choose_local to navigation.yml.
  note: <optional; why the FAQ is blocked or skipped>
```

- The top level is a list, with one entry per FAQ.
- `faq` is the path from the root of `galaxyproject/training-material`. It is the key. Findings
  files mirror it (see the process doc).
- `status`:
  - `pending` means not looked at yet.
  - `reviewed` means the source was read with no UI run.
  - `ui_verified` means it was driven against Galaxy.
  - `blocked` means it couldn't be finished, for example because of missing tools or a Galaxy bug.
    Say why in `note`.
  - `skipped` means it is out of scope, for example a GTN-site-only FAQ. Say why in `note`.
- `mode` is set when the FAQ is first looked at. Use `text` (review the source only), `ui`,
  `translation` or `external` (it leaves Galaxy).
- `gtn_commit` and `galaxy_commit` are the revisions reviewed against: GTN, and
  `galaxy_ui_driver` for `ui` runs.
- `faq_findings` and `gx_findings` hold one-line summaries. Leave a field out when it has no
  findings.

Built from GTN `origin/main` at `45d4932d33` (2026-10-20). The list includes every `*.md` under any
`faqs/` directory: `faqs/<area>/`, `topics/<topic>/faqs/` and
`topics/<topic>/tutorials/<tutorial>/faqs/`. Every file on the list has `layout: faq`. Three kinds
of file are left out:

- `index.md` and `README.md`, which are listing pages.
- Symlinks. 50 of them re-export a FAQ that is already on the list.

There are 497 entries in all: 176 in `faqs/galaxy`, 47 in `faqs/gtn`, 60 translated (es/de/it/fr),
91 at topic level and 123 at tutorial level. Every translation in `faqs/galaxy-<lang>/` except one
French FAQ has a same-named base in `faqs/galaxy/`.
