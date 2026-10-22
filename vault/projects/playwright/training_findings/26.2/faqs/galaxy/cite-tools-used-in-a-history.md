# faqs/galaxy/cite-tools-used-in-a-history.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `57b4747a752` (`faq_server.sh main`). History with a
**MAF to BED** run (it cites Blankenberg 2011). Used by introduction/galaxy-cite.

## GTN

- **Step 2: "Export Tool Citations" is now "Export Tool References".** galaxy-intro-rdm already
  uses the new label in its steps (its hands-on title still says "Export Tool Citations").
- Step 3: the page has two tabs, **References (APA)** and **BibTeX**, with copy buttons and a
  `.bib` download. It lists references, not tools: a tool with no `<citations>` (stock Sort, for
  one) doesn't appear.
- Step 4: Galaxy's own paper is already first in the list (`citation_bibtex`), as galaxy-cite's
  comment says. The step could say that rather than send users to the citing page.

## Galaxy

- No E2E opened a history's references (`test_tool_form.py` only covers the tool form's). Added
  `test_export_tool_references` to `test_history_options.py` (`e9593d8912d`): runs the `bibtex`
  test tool, checks the APA and BibTeX tabs show its and Galaxy's references.
  `data-description`s on the menu item and both tabs, a `citations` component and
  `click_history_option_tool_references`. Green under Playwright.
- gxui (tip): `history-references [--bibtex]` prints one line per reference.
