# faqs/galaxy/tools_favorite.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `3121f76bffb`, `faq_server.sh main`. Replay: `tools_favorite.gxui.sh` (passes fresh).

- FAQ correct: star on the form ("Add to Favorites"), star above the search ("Show favorite tools" → `#favorites`), panel views menu has Full Tool Panel / EDAM Operations / EDAM Topics (plus a new My Tools view).
- Coverage: none for starring from the form. Added `test_favorite_tool_from_tool_form` (`00e0b665ce1`); red without the click (the favorites view also lists recent tools, so it checks the panel's favorite marker). gxui: `tool-favorite [--show]`.
