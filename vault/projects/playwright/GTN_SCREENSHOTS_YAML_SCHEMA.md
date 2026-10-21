# gtn_screenshots_26_2.yaml

Stale screenshots in GTN FAQs, one entry per image. The FAQ loop
([HARDEN_AGAINST_FAQ.md](HARDEN_AGAINST_FAQ.md)) adds entries; screenshot scripts come later. Stale
screenshots aren't GTN findings ([GTN_FINDINGS_YAML_SCHEMA.md](GTN_FINDINGS_YAML_SCHEMA.md)).

```yaml
- image: faqs/galaxy/images/login_register.png
  faqs: [faqs/galaxy/account_create.md]
  used_in: [topics/introduction/tutorials/galaxy-intro-peaks2genes/tutorial.md]
  target: main
  priority: high
  summary: Shows the old masthead's single "Login or Register" item.
  retake: Logged-out masthead with the separate Login and Register buttons.
  fixed_in: <gtn branch>
```

- `image` is the path from the GTN root. It is the key; one entry per image.
- `faqs` lists the FAQs that show it, as in `faqs_26_2.yaml`.
- `used_in` lists other GTN pages that show the image directly (`git grep` its file name). Optional.
- `target` is `main` or `version`, by the same rule as a finding's `target`. Replacements land on
  the same GTN branches as the findings ([ACT_ON_GTN_FINDINGS.md](ACT_ON_GTN_FINDINGS.md)).
- `priority`:
  - `high`: it shows UI that is gone or contradicts the steps, so a reader looks for the wrong
    thing. Raise it when tutorials use the image too.
  - `medium`: what it points at still matches, but the UI around it is clearly older.
  - `low`: cosmetic, for example browser chrome, another language or a dated theme.
- `summary` is one sentence describing what is stale.
- `retake` says what the new screenshot should show. Optional.
- `fixed_in` is set once a replacement lands on a GTN branch.

Only list images you looked at against 26.2. One that still matches gets no entry.
