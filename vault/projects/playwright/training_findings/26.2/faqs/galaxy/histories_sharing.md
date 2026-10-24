# faqs/galaxy/histories_sharing.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `b6077811fd5`. Embedded by 11 tutorials (galaxy-intro-101, -short, -rdm, ...).

- `history-share-menu-label` (main): the History options item is **Share & Manage Access**; the page
  opens on its **Share or Publish** tab. "Copy this History" is **Copy History**; "Shared with me" is
  **Histories Shared with Me**.
- Toggles **Make History accessible** / publish, **Share History with Individual Users** and
  **Please specify user email** all match.

Coverage: test_history_sharing, test_histories_list::test_history_publish. Replay:
`histories_sharing.gxui.sh` (`history-share --publish`).
