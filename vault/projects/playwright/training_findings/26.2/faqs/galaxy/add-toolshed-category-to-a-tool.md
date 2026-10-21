# faqs/galaxy/add-toolshed-category-to-a-tool.md — 26.2, text review

GTN `45d4932d33`, checked against `galaxy_ui_driver` `e64d932e12e` client source
(`client/src/components/Tool/Buttons/ToolOptionsButton.vue`).

- **Step 1 note "(A) search for the tool, then (B) select the drop-down menu See tool in toolshed".**
  In 26.2 the item is **See in Tool Shed**, and it lives in the open tool form's options menu (the
  caret next to the star, top right of the form), not in the search results. Suggest: "search for
  the tool and open it, then pick **See in Tool Shed** from the caret menu at the top of the form".
  It only appears for tools installed from a Tool Shed (`sharableUrl`).
- Typos: "respository"; step 4 is missing its closing ")".

Steps 2-4 are Tool Shed / GitHub, outside Galaxy 26.2; not checked.
