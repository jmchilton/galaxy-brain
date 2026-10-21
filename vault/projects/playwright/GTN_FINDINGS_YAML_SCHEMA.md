# gtn_findings_26_2.yaml

A work queue of fixes to GTN FAQs, one entry per problem. The FAQ loop
([HARDEN_AGAINST_FAQ.md](HARDEN_AGAINST_FAQ.md)) adds entries; [ACT_ON_GTN_FINDINGS.md](ACT_ON_GTN_FINDINGS.md)
fixes them.

```yaml
- label: masthead-user-menu
  faqs:
    - faqs/galaxy/account_multiple.md
    - faqs/galaxy/analysis_add_custom_build.md
  target: main
  summary: There is no "User" masthead item; the menu is labelled with the username.
  fix: Say "click your username in the masthead, then **Preferences**".
  fixed_in: faq_fixes_26_2
```

- `label` is a short kebab-case name, unique in the file. Start it with the FAQ's topic
  (`custom-build-reload`) or, for a problem shared by several FAQs, with the problem
  (`masthead-user-menu`).
- `faqs` lists the FAQ paths, as in `faqs_26_2.yaml`. Reuse a finding when the same problem turns up
  in another FAQ; add the path rather than a second entry. Only reuse an open finding: once it has
  `fixed_in` or `skip`, add a new one (`masthead-user-menu-2`) and name the old label in `fix`.
  Details live in each FAQ's findings file
  under `training_findings/26.2/`.
- `target`:
  - `main` when the FAQ is wrong on servers today: typos, unclear or obsolete steps, and UI changes
    that 26.1 already shipped.
  - `version` when only 26.2 makes it wrong, for example a label renamed in `release_26.2`. Check
    the label in `origin/release_26.1`'s client source before choosing.
- `summary` is one sentence describing the problem.
- `fix` is optional. Leave it out when the summary makes the fix obvious: fix the typo, drop the
  obsolete step, use the new label. Say there when the fix reaches beyond the FAQ, such as a
  tutorial that embeds it.
- Set by ACT_ON:
  - `fixed_in`: the GTN branch with the fix.
  - `skip`: why it won't be fixed, for example `fixed upstream at <sha>` or `disputed: <why>`.
    Not used together with `fixed_in`.

Every label must appear in `faq_findings` on each of its FAQs in `faqs_26_2.yaml`, and the other
way round. `uv run check_gtn_findings.py` checks that, unique labels and the fields.

Stale screenshots go in `gtn_screenshots_26_2.yaml` ([GTN_SCREENSHOTS_YAML_SCHEMA.md](GTN_SCREENSHOTS_YAML_SCHEMA.md)),
not here. Observations that aren't problems ("no breakage", "tool not on stock servers") aren't findings;
they belong in the findings file or the FAQ entry's `note`.
